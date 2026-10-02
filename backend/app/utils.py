from __future__ import annotations

import ipaddress as _ip

from fastapi import HTTPException, UploadFile, status

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_PREFIXES = ("image/",)
ALLOWED_CONTENT_TYPES = ("application/pdf",)


async def validate_upload_file(file: UploadFile) -> bytes:
    """Validate content type and size of an uploaded file. Returns file contents."""
    if not file.content_type or not (
        file.content_type.startswith(ALLOWED_CONTENT_PREFIXES)
        or file.content_type in ALLOWED_CONTENT_TYPES
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files and PDFs are allowed",
        )

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 10MB)",
        )
    return contents


# Direcciones que NUNCA son un visitante real: detrás del proxy de Railway las lecturas llegan desde su red
# interna (100.64.0.0/10, CGNAT), no desde la IP del visitante. Contarlas como "conexiones distintas" haría
# parecer sospechoso a cualquier llavero con unas pocas lecturas.

_NON_VISITOR_NETS = [_ip.ip_network(n) for n in (
    "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
    "::1/128", "fc00::/7", "fe80::/10",
)]


def is_visitor_ip(value: str | None) -> bool:
    """True si `value` es una IP que puede ser de un visitante real (no vacía, válida y fuera de las redes internas)."""
    try:
        addr = _ip.ip_address((value or "").strip())
    except ValueError:
        return False
    return not any(addr in net for net in _NON_VISITOR_NETS)


def client_ip(request) -> str:
    """IP del visitante detrás del proxy: la última entrada de X-Forwarded-For (la agrega el proxy de
    confianza; las anteriores las puede escribir el cliente), luego X-Real-Ip, y si no hay proxy la del socket.
    Solo se toman valores que sean una IP válida."""
    xff = request.headers.get("x-forwarded-for", "")
    for candidate in (xff.split(",")[-1].strip() if xff else "", request.headers.get("x-real-ip", "").strip()):
        try:
            if candidate:
                return str(_ip.ip_address(candidate))
        except ValueError:
            continue
    return request.client.host if request.client else "unknown"
