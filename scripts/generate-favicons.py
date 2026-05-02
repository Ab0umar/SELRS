#!/usr/bin/env python3
"""Regenerate favicon.ico + PWA PNGs in client/public (eye mark, no text). Requires: pip install pillow"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

BLUE = "#003D82"
ORANGE = "#FF9500"


def eye_mark_rgba(side: int) -> Image.Image:
    im = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)
    rr = round(side * (7 / 32))
    draw.rounded_rectangle((0, 0, side - 1, side - 1), radius=max(2, rr), fill=BLUE)

    mx, my = side / 2, side / 2
    rw, rh = side * (9 / 32), side * (6 / 32)
    outline = max(1, round(side / 22))
    draw.arc(
        (mx - rw, my - rh, mx + rw, my + rh),
        start=200,
        end=340,
        fill=ORANGE,
        width=outline,
    )
    draw.arc(
        (mx - rw, my - rh, mx + rw, my + rh),
        start=20,
        end=160,
        fill=ORANGE,
        width=outline,
    )

    pupil_r = round(side * (4.75 / 32))
    draw.ellipse((mx - pupil_r, my - pupil_r, mx + pupil_r, my + pupil_r), fill=ORANGE)

    gl_r = round(side * (1.35 / 32))
    gx = mx - round(side * (1.75 / 32))
    gy = my - round(side * (1.25 / 32))
    draw.ellipse((gx - gl_r, gy - gl_r, gx + gl_r, gy + gl_r), fill=(255, 255, 255, 235))

    return im


def save_square(path: Path, side: int, maskable: bool = False) -> None:
    if not maskable:
        im = eye_mark_rgba(side).convert("RGB")
        im.save(path, format="PNG", optimize=True)
        return
    pad = side // 7
    canvas = Image.new("RGB", (side, side), BLUE)
    inner = side - 2 * pad
    mark = eye_mark_rgba(inner).convert("RGBA")
    tmp = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    tmp.paste(mark, (pad, pad), mark)
    canvas.paste(tmp, (0, 0), tmp)
    canvas.save(path, format="PNG", optimize=True)


def main() -> None:
    root = Path(__file__).resolve().parent.parent / "client" / "public"
    root.mkdir(parents=True, exist_ok=True)
    save_square(root / "icon-512.png", 512, maskable=False)
    save_square(root / "icon-192.png", 192, maskable=False)
    save_square(root / "icon-512-maskable.png", 512, maskable=True)
    save_square(root / "icon-192-maskable.png", 192, maskable=True)
    save_square(root / "apple-touch-icon.png", 180, maskable=False)

    fav32 = eye_mark_rgba(32).convert("RGBA")
    fav16 = fav32.resize((16, 16), Image.Resampling.LANCZOS)
    fav32.save(root / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)], append_images=[fav16])
    print("Wrote favicon assets to", root)


if __name__ == "__main__":
    main()
