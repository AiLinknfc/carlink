"""Revisa y normaliza el logo que sube un negocio al postularse, para que se vea bien en la franja "Marcas y aliados que
confían en CarLink" (una placa clara de ~120x30 px en la landing) sin que alguien tenga que retocarlo a mano.

Condiciones (cualquier otra cosa se rechaza con un código que el formulario traduce a un mensaje claro):
- se debe poder leer como imagen y no estar en blanco;
- lado menor de al menos `MIN_SIDE` px (si no, se ve pixelado) y lado mayor de hasta `MAX_SIDE` px;
- proporción ancho/alto entre `MIN_RATIO` y `MAX_RATIO` (ni una tira ni una torre: no cabe en la placa).

Normalización: se recortan los márgenes vacíos (transparentes o de color liso igual al de la esquina), se reduce a un
máximo de `OUT_W` x `OUT_H` conservando proporción (nunca se agranda) y se guarda como PNG, con transparencia si la tenía.
"""
from __future__ import annotations

import io

from PIL import Image, ImageChops, ImageOps, UnidentifiedImageError

MIN_SIDE = 120
MAX_SIDE = 6000
MIN_RATIO = 0.4   # ancho / alto: logos casi cuadrados altos como mucho
MAX_RATIO = 5.0   # ... y apaisados como mucho
OUT_W, OUT_H = 600, 300


class LogoError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _trim(img: Image.Image) -> Image.Image:
    """Recorta los márgenes vacíos; si todo es del mismo color/transparente devuelve la imagen tal cual."""
    if img.mode == "RGBA" and img.getchannel("A").getextrema()[0] < 250:
        box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    else:
        rgb = img.convert("RGB")
        bg = Image.new("RGB", rgb.size, rgb.getpixel((0, 0)))
        diff = ImageChops.difference(rgb, bg).convert("L").point(lambda v: 255 if v > 24 else 0)
        box = diff.getbbox()
    if box is None:
        raise LogoError("logo_blank")
    # Un respiro pequeño para que el logo no quede pegado al borde de la placa.
    pad = max(2, round(max(box[2] - box[0], box[3] - box[1]) * 0.03))
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(img.width, box[2] + pad), min(img.height, box[3] + pad))
    return img.crop(box)


def prepare_logo(data: bytes) -> bytes:
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise LogoError("logo_unreadable")
    img = ImageOps.exif_transpose(img)
    if min(img.size) < MIN_SIDE:
        raise LogoError("logo_too_small")
    if max(img.size) > MAX_SIDE:
        raise LogoError("logo_too_large_dimensions")
    ratio = img.width / img.height
    if not (MIN_RATIO <= ratio <= MAX_RATIO):
        raise LogoError("logo_bad_ratio")
    img = img.convert("RGBA")
    img = _trim(img)
    img.thumbnail((OUT_W, OUT_H), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()
