"""Limpieza de archivos huérfanos en Cloudflare R2.

Una clave `<uuid-de-usuario>/<archivo>` (las que crea routers/upload.py) es
huérfana si su texto no aparece en NINGUNA columna de texto/jsonb/array de
public.* — así que un archivo de una verificación "pendiente de aprobación"
(vehicles.verification_doc_url, profiles.verification_doc_url, etc.) o de
cualquier columna futura cuenta como "en uso" y nunca se borra.

Salvaguardas:
  - Rutas que no tienen forma `<uuid>/<archivo>` (guides/, applications/, ...)
    jamás se tocan.
  - Edad mínima: nada más nuevo que `min_age_days` (subida aún sin guardar).
    Para archivos de usuarios que SÍ existen y no están referenciados se exige
    `existing_min_age_days` (más conservador, borradores).
  - Tope `max_delete`: si hay más candidatos que el tope, no borra NADA y
    reporta (un bug que "vacíe" las referencias no puede arrasar el bucket).
  - Aborta sin borrar si la base devuelve cero usuarios o cero referencias.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import text
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.database import engine
from app.services.storage import get_r2_client

logger = logging.getLogger("carlink.r2_cleanup")

KEY_RE = re.compile(
    r"^(?P<uid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[^/]+$"
)


@dataclass
class CleanupReport:
    total_objects: int = 0
    in_use: int = 0
    foreign_paths: int = 0
    too_recent: int = 0
    candidates: list[dict] = field(default_factory=list)
    deleted: int = 0
    aborted: str = ""

    @property
    def candidate_mb(self) -> float:
        return sum(o["Size"] for o in self.candidates) / 1e6


async def _referenced_text_and_users() -> tuple[str, set[str]]:
    async with engine.connect() as conn:
        await conn.execute(text("SET TRANSACTION READ ONLY"))
        cols = (await conn.execute(text(
            "select table_name, column_name from information_schema.columns "
            "where table_schema='public' and data_type in ('text','character varying','jsonb','ARRAY')"
        ))).all()
        parts: list[str] = []
        for t, c in cols:
            rows = await conn.execute(text(f'select "{c}"::text from "{t}" where "{c}" is not null'))
            parts.extend(r[0] for r in rows)
        users = {str(r[0]) for r in (await conn.execute(text("select id from auth.users"))).all()}
    return "\n".join(parts), users


def _list_objects(bucket: str) -> list[dict]:
    s3 = get_r2_client()
    return [o for p in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket) for o in p.get("Contents", [])]


async def run_cleanup(
    *,
    apply: bool,
    include_existing_users: bool = False,
    min_age_days: int = 7,
    existing_min_age_days: int = 30,
    max_delete: int = 100,
) -> CleanupReport:
    settings = get_settings()
    bucket = settings.r2_bucket_name
    report = CleanupReport()

    refs, users = await _referenced_text_and_users()
    if not users or not refs:
        report.aborted = "la base devolvió cero usuarios o cero referencias; no se borra nada"
        return report
    objs = await run_in_threadpool(_list_objects, bucket)
    report.total_objects = len(objs)

    now = datetime.now(timezone.utc)
    for o in objs:
        m = KEY_RE.match(o["Key"])
        if not m:
            report.foreign_paths += 1
            continue
        if o["Key"] in refs:
            report.in_use += 1
            continue
        owner_exists = m.group("uid") in users
        if owner_exists and not include_existing_users:
            continue
        age_limit = existing_min_age_days if owner_exists else min_age_days
        if o["LastModified"] > now - timedelta(days=age_limit):
            report.too_recent += 1
            continue
        o["_owner_exists"] = owner_exists
        report.candidates.append(o)

    if apply and report.candidates:
        if len(report.candidates) > max_delete:
            report.aborted = (
                f"{len(report.candidates)} candidatos superan el tope de {max_delete}; "
                "no se borró nada (revisar a mano con el script en modo dry-run)"
            )
            return report
        s3 = get_r2_client()
        for o in report.candidates:
            await run_in_threadpool(s3.delete_object, Bucket=bucket, Key=o["Key"])
            report.deleted += 1
    return report


async def _cli() -> int:
    """`python -m app.services.r2_cleanup [--apply] [--include-existing-users] ...`
    — lo que corre el Cron de Railway (la imagen solo incluye app/, no scripts/)."""
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="borrar de verdad (por defecto solo lista)")
    ap.add_argument("--include-existing-users", action="store_true")
    ap.add_argument("--min-age-days", type=int, default=7)
    ap.add_argument("--existing-min-age-days", type=int, default=30)
    ap.add_argument("--max-delete", type=int, default=100)
    a = ap.parse_args()
    r = await run_cleanup(
        apply=a.apply, include_existing_users=a.include_existing_users, min_age_days=a.min_age_days,
        existing_min_age_days=a.existing_min_age_days, max_delete=a.max_delete,
    )
    print(f"{r.total_objects} objetos | en uso: {r.in_use} | rutas ajenas: {r.foreign_paths} | muy recientes: {r.too_recent}")
    for o in sorted(r.candidates, key=lambda x: x["Key"]):
        print(f"  {'BORRADO' if a.apply and not r.aborted else 'borraria'}  {o['Key']}  {o['Size'] / 1e3:.0f} KB  "
              f"({'usuario existe' if o['_owner_exists'] else 'usuario inexistente'})")
    print(f"Candidatos: {len(r.candidates)} ({r.candidate_mb:.2f} MB) | borrados: {r.deleted}")
    if r.aborted:
        print("ABORTADO:", r.aborted)
        return 1
    if not a.apply:
        print("DRY RUN: no se borro nada. Agrega --apply para borrar.")
    return 0


if __name__ == "__main__":
    import asyncio
    import sys

    sys.exit(asyncio.run(_cli()))
