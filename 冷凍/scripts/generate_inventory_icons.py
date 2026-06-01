from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE = "generated-inventory-icons"

INK = "#3b2118"
INK_SOFT = "#5b3522"


def color(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.strip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def canvas() -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def px(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, c: str, a: int = 255) -> None:
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color(c, a))


def box(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str, outline: str = INK) -> None:
    px(d, x, y, w, h, outline)
    px(d, x + 1, y + 1, w - 2, h - 2, fill)


def poly(d: ImageDraw.ImageDraw, pts: list[tuple[int, int]], fill: str, outline: str = INK) -> None:
    d.polygon(pts, fill=color(outline))
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    inner = [(round(cx + (x - cx) * 0.86), round(cy + (y - cy) * 0.86)) for x, y in pts]
    d.polygon(inner, fill=color(fill))


def shadow(d: ImageDraw.ImageDraw) -> None:
    d.ellipse([5, 25, 27, 30], fill=color("#2a2219", 60))


def draw_plastic() -> Image.Image:
    img, d = canvas()
    shadow(d)
    box(d, 12, 4, 8, 5, "#5ba9b9", INK_SOFT)
    box(d, 10, 8, 12, 19, "#9fd1d8")
    px(d, 12, 10, 8, 5, "#d2f4ec")
    px(d, 12, 17, 8, 5, "#5ba9b9")
    px(d, 15, 6, 4, 2, "#d2f4ec", 160)
    px(d, 13, 23, 6, 2, "#315e68", 170)
    return img


def draw_paper() -> Image.Image:
    img, d = canvas()
    shadow(d)
    poly(d, [(7, 8), (23, 5), (27, 23), (10, 27)], "#d8bd78", INK_SOFT)
    px(d, 11, 11, 10, 2, "#fff0bf", 180)
    px(d, 12, 16, 11, 2, "#b9915a", 150)
    px(d, 13, 21, 7, 2, "#fff0bf", 160)
    px(d, 22, 7, 3, 8, "#efe5bd", 120)
    return img


def draw_metal() -> Image.Image:
    img, d = canvas()
    shadow(d)
    box(d, 10, 7, 13, 19, "#b7b6a6")
    px(d, 12, 5, 9, 3, INK_SOFT)
    px(d, 12, 6, 9, 1, "#e2e0cd")
    px(d, 12, 10, 9, 3, "#f4eed8", 160)
    px(d, 12, 17, 9, 3, "#85877b", 150)
    px(d, 14, 23, 5, 2, "#5b5a4d")
    px(d, 18, 8, 2, 15, "#ffffff", 80)
    return img


def draw_glass() -> Image.Image:
    img, d = canvas()
    shadow(d)
    box(d, 13, 3, 7, 7, "#7fbf9f", INK_SOFT)
    box(d, 10, 9, 13, 18, "#7fbf9f")
    px(d, 12, 11, 9, 12, "#b8ecf0", 140)
    px(d, 14, 5, 4, 3, "#d9fff5", 160)
    px(d, 14, 15, 3, 8, "#ffffff", 105)
    px(d, 17, 24, 4, 2, "#376b5b", 170)
    return img


def draw_general() -> Image.Image:
    img, d = canvas()
    shadow(d)
    poly(d, [(7, 12), (15, 6), (25, 12), (23, 27), (9, 27)], "#c44f45", "#6d372f")
    px(d, 11, 14, 9, 3, "#e98572", 145)
    px(d, 18, 9, 4, 4, "#efe5bd", 130)
    px(d, 9, 22, 12, 3, "#7e3f36", 135)
    px(d, 20, 20, 8, 3, INK_SOFT)
    px(d, 22, 19, 6, 2, "#f4eed8")
    px(d, 27, 19, 2, 2, "#d98258")
    return img


ICONS = {
    "itemPlastic": draw_plastic,
    "itemPaper": draw_paper,
    "itemMetal": draw_metal,
    "itemGlass": draw_glass,
    "itemGeneral": draw_general,
}


def update_manifest(entries: list[dict[str, object]]) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = []
    by_name = {item.get("name"): item for item in manifest}
    for entry in entries:
        by_name[entry["name"]] = entry
    existing_names = [item.get("name") for item in manifest if item.get("name") not in ICONS]
    ordered = [by_name[name] for name in existing_names if name in by_name]
    ordered.extend(entries)
    MANIFEST.write_text(json.dumps(ordered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    entries = []
    for name, draw in ICONS.items():
        img = draw()
        img.save(OUT / f"{name}.png")
        entries.append({"name": name, "file": f"{name}.png", "size": [32, 32], "source": SOURCE})
    update_manifest(entries)
    print(f"generated {len(entries)} inventory icons in {OUT}")


if __name__ == "__main__":
    main()
