from __future__ import annotations

import io

import pytest
from PIL import Image

from app.services.logo_image import LogoError, prepare_logo


def _png(size, color=(255, 255, 255, 255), box=None, fill=(200, 30, 30, 255), mode="RGBA", fmt="PNG"):
    img = Image.new("RGBA", size, color)
    if box:
        img.paste(Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), fill), box[:2])
    if mode == "RGB":
        img = img.convert("RGB")
    out = io.BytesIO()
    img.save(out, format=fmt)
    return out.getvalue()


def _open(data):
    return Image.open(io.BytesIO(data))


def test_trims_margins_and_outputs_png():
    out = prepare_logo(_png((1000, 800), box=(400, 300, 600, 400), mode="RGB", fmt="JPEG"))
    img = _open(out)
    assert img.format == "PNG"
    assert img.width < 300 and img.height < 160  # se quitó el margen blanco
    assert img.width / img.height == pytest.approx(2, rel=0.35)


def test_transparent_margin_is_trimmed_and_kept_transparent():
    out = prepare_logo(_png((800, 800), color=(0, 0, 0, 0), box=(100, 300, 700, 500)))
    img = _open(out)
    assert img.mode == "RGBA" and img.getpixel((0, 0))[3] == 0
    assert img.width > img.height


def test_big_logo_is_reduced_to_box_never_enlarged():
    out = prepare_logo(_png((3000, 1000), color=(255, 255, 255, 0), box=(100, 100, 2900, 900)))
    assert max(_open(out).size) <= 600
    small = _open(prepare_logo(_png((200, 200), color=(255, 255, 255, 0), box=(20, 20, 180, 180))))
    assert small.width <= 200


@pytest.mark.parametrize("data,code", [
    (_png((90, 400), box=(0, 0, 90, 400)), "logo_too_small"),
    (_png((2000, 200), box=(0, 0, 2000, 200)), "logo_bad_ratio"),
    (_png((200, 800), box=(0, 0, 200, 800)), "logo_bad_ratio"),
    (_png((400, 400)), "logo_blank"),
    (b"not an image at all", "logo_unreadable"),
])
def test_rejections(data, code):
    with pytest.raises(LogoError) as e:
        prepare_logo(data)
    assert e.value.code == code
