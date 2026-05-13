from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE = "generated-extra-animals"
RIGHT_FACING_ANIMALS = {"leopardCat", "otter", "greenTurtle", "blackKite"}

INK = "#3b2118"
INK_SOFT = "#5b3522"


def color(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.strip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def canvas(w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def px(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, c: str, a: int = 255) -> None:
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color(c, a))


def ellipse(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str, outline: str = INK) -> None:
    d.ellipse([x, y, x + w - 1, y + h - 1], fill=color(outline))
    d.ellipse([x + 1, y + 1, x + w - 2, y + h - 2], fill=color(fill))


def poly(d: ImageDraw.ImageDraw, pts: list[tuple[int, int]], fill: str, outline: str = INK) -> None:
    d.polygon(pts, fill=color(outline))
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    inner = [(round(cx + (x - cx) * 0.9), round(cy + (y - cy) * 0.9)) for x, y in pts]
    d.polygon(inner, fill=color(fill))


def line(d: ImageDraw.ImageDraw, pts: list[tuple[int, int]], c: str = INK, w: int = 1) -> None:
    d.line(pts, fill=color(c), width=w)


def shadow(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    d.ellipse([x, y, x + w, y + h], fill=color("#2a2219", 58))


def save(name: str, img: Image.Image) -> dict[str, object]:
    OUT.mkdir(parents=True, exist_ok=True)
    if name in RIGHT_FACING_ANIMALS:
        img = ImageOps.mirror(img)
    img.save(OUT / f"{name}.png")
    return {"name": name, "file": f"{name}.png", "size": list(img.size), "source": SOURCE}


def make_leopard_cat() -> dict[str, object]:
    img, d = canvas(64, 42)
    shadow(d, 8, 35, 42, 5)
    ellipse(d, 12, 17, 32, 13, "#b77946", INK_SOFT)
    ellipse(d, 40, 12, 14, 12, "#c4864f", INK_SOFT)
    poly(d, [(41, 12), (39, 5), (46, 9)], "#c4864f", INK_SOFT)
    poly(d, [(50, 12), (52, 5), (55, 13)], "#c4864f", INK_SOFT)
    px(d, 52, 18, 4, 2, "#23150e")
    px(d, 48, 15, 2, 2, "#111111")
    for x in (18, 25, 32, 43):
        px(d, x, 19, 3, 2, "#3a2115")
    px(d, 16, 26, 4, 8, "#7a4b32")
    px(d, 34, 26, 4, 8, "#7a4b32")
    px(d, 15, 34, 6, 2, "#241812")
    px(d, 33, 34, 6, 2, "#241812")
    line(d, [(12, 20), (2, 12), (0, 7)], "#7a4b32", 3)
    px(d, 5, 13, 3, 2, "#3a2115")
    return save("leopardCat", img)


def make_macaque() -> dict[str, object]:
    img, d = canvas(64, 58)
    shadow(d, 9, 51, 42, 5)
    line(d, [(42, 31), (54, 26), (59, 31)], "#6a5544", 3)
    ellipse(d, 21, 24, 26, 20, "#746250", INK_SOFT)
    ellipse(d, 26, 18, 18, 22, "#6a5544", INK_SOFT)
    ellipse(d, 8, 13, 24, 20, "#776354", INK_SOFT)
    ellipse(d, 5, 19, 13, 10, "#e0ad84", INK_SOFT)
    ellipse(d, 22, 14, 8, 8, "#8a7361", INK_SOFT)
    px(d, 12, 19, 3, 3, "#111111")
    px(d, 13, 20, 1, 1, "#fff7d7")
    px(d, 5, 24, 4, 2, "#6b3d2c")
    px(d, 13, 28, 9, 2, "#8d5138")
    px(d, 17, 14, 8, 3, "#4d3b31")
    px(d, 29, 25, 8, 2, "#9a866d", 120)
    line(d, [(25, 35), (14, 42), (11, 52)], "#5f4d3f", 4)
    line(d, [(39, 35), (51, 42), (47, 52)], "#5f4d3f", 4)
    line(d, [(28, 41), (22, 52)], "#554438", 4)
    line(d, [(40, 40), (38, 52)], "#554438", 4)
    px(d, 8, 52, 9, 3, "#2a1711")
    px(d, 20, 53, 9, 3, "#2a1711")
    px(d, 36, 53, 9, 3, "#2a1711")
    px(d, 45, 52, 8, 3, "#2a1711")
    px(d, 30, 21, 7, 2, "#9c8a73", 120)
    px(d, 26, 30, 4, 2, "#d7bc75", 90)
    return save("macaque", img)


def make_otter() -> dict[str, object]:
    img, d = canvas(70, 34)
    shadow(d, 8, 28, 50, 4)
    ellipse(d, 14, 13, 34, 12, "#6b4c35", INK_SOFT)
    ellipse(d, 46, 10, 14, 11, "#7b5b42", INK_SOFT)
    px(d, 58, 15, 5, 2, "#2a1711")
    px(d, 53, 13, 2, 2, "#111111")
    px(d, 48, 18, 8, 3, "#d6b081", 150)
    poly(d, [(13, 18), (1, 13), (3, 25)], "#5c3d2b", INK_SOFT)
    px(d, 21, 24, 5, 5, "#493525")
    px(d, 37, 23, 5, 5, "#493525")
    px(d, 20, 15, 13, 2, "#9a7650", 130)
    line(d, [(57, 17), (66, 14)], "#eadca6")
    return save("otter", img)


def make_streamfish() -> dict[str, object]:
    img, d = canvas(62, 30)
    shadow(d, 9, 25, 43, 4)
    ellipse(d, 8, 7, 38, 17, "#8f9870", INK_SOFT)
    ellipse(d, 5, 9, 17, 13, "#d6d0a5", INK_SOFT)
    poly(d, [(44, 15), (58, 7), (55, 15), (58, 23)], "#6f5e4b", INK_SOFT)
    poly(d, [(24, 8), (32, 2), (37, 8)], "#766b54", INK_SOFT)
    poly(d, [(27, 21), (35, 27), (24, 24)], "#6f8a70", INK_SOFT)
    px(d, 11, 13, 4, 4, "#111111")
    px(d, 12, 14, 1, 1, "#fff7d7")
    px(d, 2, 15, 5, 2, "#3b2118")
    line(d, [(19, 10), (17, 22)], "#5c523f", 1)
    px(d, 23, 11, 4, 2, "#6e7b60")
    px(d, 31, 12, 4, 2, "#6e7b60")
    px(d, 39, 13, 3, 2, "#6e7b60")
    px(d, 22, 17, 4, 2, "#627255")
    px(d, 30, 18, 4, 2, "#627255")
    px(d, 38, 18, 3, 2, "#627255")
    px(d, 9, 18, 9, 2, "#f4eed8", 150)
    px(d, 25, 9, 10, 2, "#c7bd82", 130)
    img = img.resize((124, 60), Image.Resampling.NEAREST)
    return save("streamfish", img)


def make_treefrog() -> dict[str, object]:
    img, d = canvas(56, 44)
    shadow(d, 7, 36, 40, 5)
    ellipse(d, 13, 16, 30, 17, "#62aa5f", INK_SOFT)
    ellipse(d, 12, 9, 14, 13, "#82c66a", INK_SOFT)
    ellipse(d, 33, 9, 14, 13, "#82c66a", INK_SOFT)
    ellipse(d, 17, 19, 22, 12, "#78bd63", INK_SOFT)
    px(d, 17, 13, 4, 4, "#111111")
    px(d, 38, 13, 4, 4, "#111111")
    px(d, 18, 14, 1, 1, "#fff7d7")
    px(d, 39, 14, 1, 1, "#fff7d7")
    px(d, 22, 24, 14, 3, "#d6e49a", 150)
    px(d, 26, 28, 6, 1, "#467f45")
    px(d, 15, 20, 5, 2, "#b7dc78", 110)
    px(d, 36, 20, 5, 2, "#b7dc78", 110)
    line(d, [(17, 28), (7, 36)], "#467f45", 3)
    line(d, [(39, 28), (50, 36)], "#467f45", 3)
    line(d, [(22, 30), (16, 40)], "#467f45", 3)
    line(d, [(34, 30), (39, 40)], "#467f45", 3)
    for x, y in [(4, 35), (49, 35), (13, 39), (38, 39)]:
        ellipse(d, x, y, 6, 4, "#f4d86c", INK_SOFT)
    px(d, 27, 15, 3, 2, "#4c8f4a", 120)
    px(d, 30, 15, 3, 2, "#4c8f4a", 120)
    return save("treefrog", img)


def make_green_turtle() -> dict[str, object]:
    img, d = canvas(64, 42)
    shadow(d, 8, 35, 44, 5)
    ellipse(d, 15, 12, 30, 20, "#4f8e72", INK_SOFT)
    ellipse(d, 44, 17, 11, 9, "#78a36e", INK_SOFT)
    px(d, 51, 20, 2, 2, "#111111")
    poly(d, [(16, 19), (4, 13), (8, 25)], "#5fa083", INK_SOFT)
    poly(d, [(24, 30), (14, 38), (31, 34)], "#5fa083", INK_SOFT)
    poly(d, [(38, 30), (50, 37), (43, 27)], "#5fa083", INK_SOFT)
    poly(d, [(15, 29), (6, 34), (12, 25)], "#5fa083", INK_SOFT)
    line(d, [(24, 14), (21, 29)], "#2f6a55")
    line(d, [(34, 13), (37, 29)], "#2f6a55")
    line(d, [(17, 21), (43, 21)], "#2f6a55")
    px(d, 25, 17, 5, 3, "#9dc47c", 120)
    return save("greenTurtle", img)


def make_black_kite() -> dict[str, object]:
    img, d = canvas(72, 42)
    shadow(d, 16, 35, 38, 4)
    poly(d, [(32, 18), (4, 8), (20, 25)], "#3b2d24", "#241812")
    poly(d, [(39, 18), (68, 9), (53, 25)], "#3b2d24", "#241812")
    ellipse(d, 28, 15, 16, 11, "#4c392b", "#241812")
    ellipse(d, 42, 13, 10, 9, "#5b4433", "#241812")
    poly(d, [(51, 18), (62, 15), (53, 22)], "#d6a545", INK_SOFT)
    px(d, 46, 15, 2, 2, "#ffffff")
    poly(d, [(26, 23), (35, 34), (44, 23)], "#7a4a36", "#4f2d1d")
    px(d, 22, 12, 8, 2, "#6b5545", 130)
    px(d, 46, 13, 8, 2, "#6b5545", 130)
    return save("blackKite", img)


GENERATORS = [
    make_streamfish,
    make_leopard_cat,
    make_macaque,
    make_otter,
    make_treefrog,
    make_green_turtle,
    make_black_kite,
]


def update_manifest(entries: list[dict[str, object]]) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = []
    names = {entry["name"] for entry in entries}
    manifest = [item for item in manifest if item.get("name") not in names]
    manifest.extend(entries)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    entries = [generator() for generator in GENERATORS]
    update_manifest(entries)
    print(f"generated {len(entries)} extra animal assets in {OUT}")


if __name__ == "__main__":
    main()
