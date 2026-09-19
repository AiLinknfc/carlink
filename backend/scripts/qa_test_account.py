"""Cuenta de pruebas para QA manual (docs/PRUEBAS_FUNCIONALES.md).

Crea/resetea/borra una cuenta persona desechable para correr el checklist de
pruebas funcionales sin tocar cuentas reales. Nunca escribe la contraseña a
ningún archivo — solo la imprime en la terminal al crear la cuenta (política
de no hardcodear secretos, docs/SECURITY.md).

Uso (desde backend/, con el venv activo):
    python scripts/qa_test_account.py create
    python scripts/qa_test_account.py reset [--email pruebas.features@carlink.internal]
    python scripts/qa_test_account.py delete [--email pruebas.features@carlink.internal]

`reset` deja la cuenta intacta pero sin datos: borra su(s) vehículo(s) (en
cascada se van llaveros/documentos/mantenimiento), libera el código de
activación de prueba (TEST-002 por default, ver --tag) de vuelta a
'available', y limpia WhatsApp/nombre — para volver a correr el wizard desde
cero. `delete` borra la cuenta entera (usar solo si de verdad no hace falta
más, no para "reiniciar" — para eso es `reset`).
"""
from __future__ import annotations

import argparse
import asyncio
import os
import secrets
import string
import sys

import asyncpg
import httpx
from dotenv import load_dotenv

load_dotenv()

DEFAULT_EMAIL = "pruebas.features@carlink.internal"
DEFAULT_TAG_UID = "TEST-002"


def _dsn() -> str:
    return os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")


def _gen_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "Cl-" + "".join(secrets.choice(alphabet) for _ in range(14))


async def create(email: str) -> None:
    url = os.environ["SUPABASE_URL"].rstrip("/")
    service_key = os.environ["SUPABASE_SERVICE_KEY"]
    password = _gen_password()

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{url}/auth/v1/admin/users",
            headers={"apikey": service_key, "Authorization": f"Bearer {service_key}", "Content-Type": "application/json"},
            json={
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": "Cuenta de pruebas"},
            },
            timeout=20,
        )
    if resp.status_code >= 300:
        print(f"Error creando la cuenta: {resp.status_code} {resp.text}", file=sys.stderr)
        sys.exit(1)

    print("Cuenta de pruebas creada.")
    print(f"  Email:      {email}")
    print(f"  Password:   {password}")
    print("  (la contraseña no se guarda en ningún archivo — copiala ahora si la necesitás)")


async def _get_user_id(conn: asyncpg.Connection, email: str) -> str | None:
    row = await conn.fetchrow("SELECT id FROM profiles WHERE email=$1", email)
    return str(row["id"]) if row else None


async def reset(email: str, tag_uid: str) -> None:
    conn = await asyncpg.connect(_dsn())
    try:
        uid = await _get_user_id(conn, email)
        if not uid:
            print(f"No existe ninguna cuenta con email {email} — nada que resetear.", file=sys.stderr)
            sys.exit(1)

        async with conn.transaction():
            r1 = await conn.execute("DELETE FROM vehicles WHERE owner_id=$1", uid)
            r2 = await conn.execute(
                """UPDATE nfc_token_whitelist
                   SET status='available', claimed_by=NULL, claimed_vehicle_id=NULL, claimed_at=NULL
                   WHERE tag_uid=$1""",
                tag_uid,
            )
            r3 = await conn.execute(
                "UPDATE profiles SET whatsapp_enabled=false, whatsapp_number='', full_name='Cuenta de pruebas' WHERE id=$1",
                uid,
            )

        print(f"Cuenta {email} reseteada.")
        print(f"  vehiculos borrados: {r1}")
        print(f"  whitelist {tag_uid}: {r2}")
        print(f"  perfil (whatsapp/nombre): {r3}")
        print("  Recordá: abrí una ventana de incognito (o borrá localStorage carlink_onboarding_*)")
        print("  para que el wizard arranque de cero — ese estado vive en el navegador, no acá.")
    finally:
        await conn.close()


async def delete(email: str) -> None:
    conn = await asyncpg.connect(_dsn())
    try:
        result = await conn.execute("DELETE FROM auth.users WHERE email=$1", email)
        print(f"Cuenta {email} eliminada: {result}")
    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="action", required=True)

    p_create = sub.add_parser("create", help="Crea una cuenta de pruebas nueva")
    p_create.add_argument("--email", default=DEFAULT_EMAIL)

    p_reset = sub.add_parser("reset", help="Resetea los datos de una cuenta existente, sin borrarla")
    p_reset.add_argument("--email", default=DEFAULT_EMAIL)
    p_reset.add_argument("--tag", default=DEFAULT_TAG_UID, help="tag_uid del llavero de prueba a liberar")

    p_delete = sub.add_parser("delete", help="Borra la cuenta por completo (no es 'reset')")
    p_delete.add_argument("--email", default=DEFAULT_EMAIL)

    args = parser.parse_args()
    if args.action == "create":
        asyncio.run(create(args.email))
    elif args.action == "reset":
        asyncio.run(reset(args.email, args.tag))
    elif args.action == "delete":
        asyncio.run(delete(args.email))


if __name__ == "__main__":
    main()
