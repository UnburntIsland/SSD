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
    img, d = canvas(96, 52)
    shadow(d, 10, 45, 70, 5)

    line(d, [(25, 29), (13, 29), (5, 34), (2, 40)], "#2a1711", 8)
    line(d, [(25, 29), (13, 29), (5, 34), (2, 40)], "#8a7155", 5)
    for x, y, w, h in [(4, 36, 5, 3), (10, 31, 5, 3), (17, 28, 5, 3)]:
        px(d, x, y, w, h, "#241812")

    poly(d, [(21, 28), (29, 20), (48, 16), (66, 17), (76, 23), (74, 32), (65, 38), (34, 38), (22, 34)], "#b88a61", INK_SOFT)
    ellipse(d, 25, 21, 47, 17, "#bc8d62", INK_SOFT)
    for x, y, w in [(34, 18, 9), (46, 17, 8), (58, 18, 7), (66, 20, 5)]:
        px(d, x, y, w, 2, "#6e5039")
    px(d, 31, 32, 33, 4, "#ead8b5")
    px(d, 44, 34, 24, 2, "#f5e8c8")

    ellipse(d, 69, 17, 19, 16, "#b9855b", INK_SOFT)
    poly(d, [(71, 18), (73, 10), (78, 16)], "#b9855b", INK_SOFT)
    poly(d, [(83, 18), (87, 11), (89, 18)], "#b9855b", INK_SOFT)
    px(d, 74, 14, 2, 3, "#d6a077")
    px(d, 85, 14, 2, 3, "#d6a077")
    ellipse(d, 80, 23, 12, 8, "#f1dfbd", INK_SOFT)
    px(d, 91, 25, 4, 2, "#21130e")
    px(d, 81, 20, 3, 3, "#111111")
    px(d, 82, 20, 1, 1, "#fff7d7")
    line(d, [(75, 16), (78, 24)], "#2f1b12", 1)
    line(d, [(80, 15), (80, 23)], "#2f1b12", 1)
    line(d, [(85, 17), (84, 24)], "#2f1b12", 1)
    line(d, [(86, 26), (94, 24)], "#f4eed8", 1)
    line(d, [(86, 28), (94, 30)], "#f4eed8", 1)
    px(d, 73, 27, 3, 2, "#2f1b12")

    for x, y, w, h in [
        (29, 23, 3, 2), (36, 21, 4, 2), (45, 21, 3, 2), (53, 21, 4, 2), (62, 22, 3, 2),
        (32, 27, 2, 2), (39, 26, 3, 2), (48, 27, 3, 2), (56, 26, 3, 2), (64, 28, 2, 2),
        (35, 32, 3, 2), (44, 33, 2, 2), (53, 32, 3, 2), (62, 31, 2, 2), (70, 24, 2, 2),
    ]:
        px(d, x, y, w, h, "#2e1a12")
    for x, y in [(27, 24), (43, 22), (53, 29), (70, 19)]:
        px(d, x, y, 2, 1, "#ead0a6")

    line(d, [(31, 34), (27, 45)], "#6f5138", 5)
    line(d, [(31, 34), (27, 45)], "#a97d55", 3)
    line(d, [(46, 35), (43, 45)], "#6f5138", 5)
    line(d, [(46, 35), (43, 45)], "#a97d55", 3)
    line(d, [(63, 33), (65, 45)], "#6f5138", 5)
    line(d, [(63, 33), (65, 45)], "#a97d55", 3)
    line(d, [(72, 31), (75, 44)], "#6f5138", 5)
    line(d, [(72, 31), (75, 44)], "#a97d55", 3)
    for x, y in [(22, 45), (39, 45), (61, 45), (72, 44)]:
        px(d, x, y, 10, 3, "#241812")
    for x, y in [(29, 38), (43, 39), (64, 37), (73, 36)]:
        px(d, x, y, 3, 2, "#2e1a12")
    return save("leopardCat", img)


def make_macaque() -> dict[str, object]:
    img, d = canvas(68, 60)
    shadow(d, 8, 53, 46, 5)
    line(d, [(42, 35), (53, 39), (61, 49), (66, 52)], "#3f352e", 5)
    line(d, [(42, 35), (53, 39), (61, 49), (66, 52)], "#8d8170", 3)
    ellipse(d, 22, 20, 32, 27, "#8f887d", INK_SOFT)
    ellipse(d, 33, 31, 20, 20, "#777066", INK_SOFT)
    ellipse(d, 15, 14, 18, 26, "#a29b8f", INK_SOFT)
    ellipse(d, 7, 12, 26, 22, "#9b9488", INK_SOFT)
    ellipse(d, 3, 17, 9, 10, "#83796e", INK_SOFT)
    ellipse(d, 22, 12, 8, 9, "#83796e", INK_SOFT)
    ellipse(d, 8, 18, 17, 13, "#d8a28e", INK_SOFT)
    ellipse(d, 10, 22, 13, 9, "#e3b19b", INK_SOFT)
    px(d, 12, 20, 3, 3, "#111111")
    px(d, 13, 21, 1, 1, "#fff7d7")
    px(d, 20, 20, 3, 3, "#111111")
    px(d, 21, 21, 1, 1, "#fff7d7")
    px(d, 8, 25, 4, 2, "#5a352c")
    px(d, 14, 29, 8, 2, "#8d5138")
    px(d, 12, 12, 11, 3, "#d8d0c1", 120)
    px(d, 24, 23, 7, 3, "#d8d0c1", 120)
    px(d, 30, 21, 12, 3, "#bdb5a6", 110)
    px(d, 28, 30, 9, 2, "#6b6259", 130)
    line(d, [(25, 36), (18, 45), (14, 54)], "#6f675e", 5)
    line(d, [(41, 36), (50, 43), (47, 54)], "#6f675e", 5)
    line(d, [(31, 43), (24, 54)], "#5f5850", 5)
    line(d, [(44, 43), (40, 54)], "#5f5850", 5)
    px(d, 11, 54, 10, 3, "#2a1711")
    px(d, 22, 55, 10, 3, "#2a1711")
    px(d, 38, 55, 10, 3, "#2a1711")
    px(d, 45, 54, 9, 3, "#2a1711")
    for x, y in [(25, 18), (32, 22), (38, 26), (24, 27), (45, 33)]:
        px(d, x, y, 3, 2, "#c8c0b2", 95)
    for x, y in [(29, 37), (36, 39), (43, 42)]:
        px(d, x, y, 3, 2, "#5f5850", 90)
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
    img, d = canvas(78, 50)
    shadow(d, 8, 43, 58, 5)
    ellipse(d, 49, 23, 18, 14, "#6ec75a", INK_SOFT)
    line(d, [(59, 34), (68, 42), (74, 43)], "#5aaa4b", 4)
    line(d, [(46, 32), (38, 43), (31, 44)], "#5aaa4b", 4)
    for x, y in [(70, 40), (73, 42), (33, 42), (28, 43)]:
        ellipse(d, x, y, 5, 3, "#f2a646", INK_SOFT)

    ellipse(d, 20, 16, 42, 20, "#64ba4e", INK_SOFT)
    ellipse(d, 7, 13, 29, 21, "#77c95a", INK_SOFT)
    poly(d, [(8, 22), (2, 24), (8, 28)], "#72c45a", INK_SOFT)
    ellipse(d, 15, 9, 13, 13, "#76c85a", INK_SOFT)
    ellipse(d, 17, 11, 10, 10, "#d99a2f", INK_SOFT)
    ellipse(d, 19, 13, 6, 6, "#111111", "#111111")
    px(d, 20, 13, 2, 2, "#fff7d7")
    ellipse(d, 28, 12, 7, 7, "#78c95b", INK_SOFT)

    px(d, 22, 17, 22, 2, "#a7df67", 125)
    px(d, 42, 18, 12, 2, "#92d85f", 110)
    px(d, 11, 29, 44, 3, "#edf0c8", 175)
    px(d, 18, 32, 28, 3, "#e6e9c1", 145)
    line(d, [(10, 28), (30, 30), (57, 28)], "#3f743e", 1)
    px(d, 4, 25, 5, 2, "#3b2118")

    line(d, [(24, 30), (17, 40), (8, 42)], "#55a349", 4)
    line(d, [(32, 30), (28, 40), (22, 44)], "#5ab04e", 3)
    for x, y in [(5, 40), (10, 41), (21, 42), (25, 43)]:
        ellipse(d, x, y, 5, 3, "#f3b24a", INK_SOFT)

    for x, y, w, h in [
        (33, 21, 2, 1), (43, 22, 2, 1), (53, 24, 2, 1),
        (16, 24, 2, 1), (39, 28, 2, 1), (51, 31, 2, 1),
    ]:
        px(d, x, y, w, h, "#2f6534", 130)
    for x, y in [(25, 19), (47, 20), (57, 27), (18, 16)]:
        px(d, x, y, 2, 1, "#d4f18d", 130)
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
    raise SystemExit(
        "Deprecated: animal sprites now come from ChatGPT Images sheets. "
        "Run scripts/slice_chatgpt_animal_assets.py instead."
    )


if __name__ == "__main__":
    main()
