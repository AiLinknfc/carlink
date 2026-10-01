"""Limpieza de archivos huérfanos en Cloudflare R2.

Uso (desde backend/, con el .venv):
    python scripts/cleanup_r2_orphans.py                 # dry run: solo lista, no borra
    python scripts/cleanup_r2_orphans.py --apply         # borra los huérfanos de usuarios inexistentes
    python scripts/cleanup_r2_orphans.py --include-existing-users          # además lista los
                                                          # no referenciados de usuarios que SÍ existen
    python scripts/cleanup_r2_orphans.py --apply --include-existing-users  # y también los borra

Qué considera huérfano (y por qué es seguro):
  - Solo toca claves con forma `<uuid-de-usuario>/<archivo>` (las que crea
    routers/upload.py). Cualquier otra ruta (`guides/`, `applications/`, lo
    que se agregue después) se ignora: nunca se borra.
  - Una clave está "en uso" si su texto aparece en CUALQUIER columna de
    texto/jsonb/array de las tablas public.* (no solo en las columnas que hoy
    guardan URLs), así que una columna nueva no deja huérfano un archivo vivo.
  - Por defecto solo borra archivos de usuarios que ya no existen en
    auth.users. Los no referenciados de usuarios existentes requieren
    --include-existing-users (pueden ser subidas a medias o borradores).
  - Ningún archivo más nuevo que --min-age-days (7 por defecto) se toca, para
    no borrar una subida que todavía no se guardó en su registro.
  - Si la lectura de la base falla, aborta: nunca borra con una vista parcial.
"""
from __future__ import annotations

import argparse
import asyncio
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import asyncpg
import boto3
from botocore.config import Config
from dotenv import dotenv_values

KEY_RE = re.compile(
    r"^(?P<uid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[^/]+$"
)


async def _referenced_text(conn: asyncpg.Connection) -> str:
    cols = await conn.fetch(
        "select table_name, column_name from information_schema.columns "
        "where table_schema='public' and data_type in ('text','character varying','jsonb','ARRAY')"
    )
    parts: list[str] = []
    async with conn.transaction(readonly=True):
        for c in cols:
            t, col = c["table_name"], c["column_name"]
            rows = await conn.fetch(f'select "{col}"::text v from "{t}" where "{col}" is not null')
            parts.extend(r["v"] for r in rows)
    return "\n".join(parts)


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="borrar de verdad (por defecto solo lista)")
    ap.add_argument("--include-existing-users", action="store_true")
    ap.add_argument("--min-age-days", type=int, default=7)
    args = ap.parse_args()

    env = dotenv_values(Path(__file__).resolve().parent.parent / ".env")
    conn = await asyncpg.connect(
        env["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://"),
        statement_cache_size=0,
    )
    s3 = boto3.client(
        "s3",
        endpoint_url=env["R2_ENDPOINT"],
        aws_access_key_id=env["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=env["R2_SECRET_ACCESS_KEY"],
        config=Config(signature_version="s3v4", region_name="auto"),
    )
    bucket = env.get("R2_BUCKET_NAME") or "carlink-images"

    refs = await _referenced_text(conn)
    users = {str(r["id"]) for r in await conn.fetch("select id from auth.users")}
    objs = [o for p in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket) for o in p.get("Contents", [])]
    cutoff = datetime.now(timezone.utc) - timedelta(days=args.min_age_days)

    to_delete: list[dict] = []
    skipped_other = skipped_young = in_use = 0
    for o in objs:
        m = KEY_RE.match(o["Key"])
        if not m:
            skipped_other += 1
            continue
        if o["Key"] in refs:
            in_use += 1
            continue
        if o["LastModified"] > cutoff:
            skipped_young += 1
            continue
        owner_exists = m.group("uid") in users
        if owner_exists and not args.include_existing_users:
            continue
        o["_owner_exists"] = owner_exists
        to_delete.append(o)

    total = sum(o["Size"] for o in to_delete)
    print(f"Bucket {bucket}: {len(objs)} objetos | en uso: {in_use} | rutas ajenas (intactas): {skipped_other} "
          f"| muy recientes (intactos): {skipped_young}")
    for o in sorted(to_delete, key=lambda x: x["Key"]):
        tag = "usuario existe" if o["_owner_exists"] else "usuario inexistente"
        print(f"  {'BORRA' if args.apply else 'borraría'}  {o['Key']}  {o['Size'] / 1e3:.0f} KB  ({tag})")
    print(f"Total: {len(to_delete)} archivos, {total / 1e6:.2f} MB")

    if args.apply:
        for o in to_delete:
            s3.delete_object(Bucket=bucket, Key=o["Key"])
        print("APLICADO")
    else:
        print("DRY RUN: no se borró nada. Agregá --apply para borrar.")
    await conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
