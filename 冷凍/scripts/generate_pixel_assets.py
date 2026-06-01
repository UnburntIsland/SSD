from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"

INK = "#3b2118"
INK_SOFT = "#5b3522"
SHADOW = "#2d2018"
CREAM = "#eadca6"


def color(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.strip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def canvas(w: int, h: int) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)


def px(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, c: str, a: int = 255) -> None:
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color(c, a))


def box(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str, outline: str = INK) -> None:
    px(d, x, y, w, h, outline)
    px(d, x + 1, y + 1, w - 2, h - 2, fill)


def ellipse(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str, outline: str = INK) -> None:
    d.ellipse([x, y, x + w - 1, y + h - 1], fill=color(outline))
    d.ellipse([x + 1, y + 1, x + w - 2, y + h - 2], fill=color(fill))


def poly(d: ImageDraw.ImageDraw, pts: list[tuple[int, int]], fill: str, outline: str = INK) -> None:
    d.polygon(pts, fill=color(outline))
    if len(pts) >= 3:
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        inner = []
        for x, y in pts:
            inner.append((round(cx + (x - cx) * 0.9), round(cy + (y - cy) * 0.9)))
        d.polygon(inner, fill=color(fill))


def line(d: ImageDraw.ImageDraw, pts: list[tuple[int, int]], c: str = INK, w: int = 1) -> None:
    d.line(pts, fill=color(c), width=w)


def save(name: str, img: Image.Image) -> dict[str, object]:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f"{name}.png"
    img.save(path)
    return {"name": name, "file": f"{name}.png", "size": list(img.size)}


def add_drop_shadow(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    d.ellipse([x, y, x + w, y + h], fill=color("#2a2219", 70))


def make_actor(name: str, shirt: str, pants: str, hair: str, skin: str, accessory: str | None = None) -> dict[str, object]:
    img, d = canvas(40, 56)
    add_drop_shadow(d, 5, 49, 31, 6)
    # legs and shoes
    box(d, 11, 38, 7, 12, pants)
    box(d, 23, 38, 7, 12, pants)
    px(d, 10, 50, 10, 3, "#241812")
    px(d, 22, 50, 10, 3, "#241812")
    px(d, 12, 39, 5, 2, "#ffffff", 38)
    px(d, 24, 39, 5, 2, "#ffffff", 30)
    # torso, collar, sleeves
    box(d, 8, 24, 24, 17, shirt)
    px(d, 10, 25, 20, 3, "#ffffff", 36)
    px(d, 18, 25, 5, 5, "#f4eed8", 120)
    box(d, 4, 26, 6, 15, skin)
    box(d, 30, 26, 6, 15, skin)
    px(d, 4, 37, 5, 4, "#d5966b")
    px(d, 31, 37, 5, 4, "#d5966b")
    # neck and face
    px(d, 17, 20, 7, 5, skin)
    box(d, 11, 10, 18, 13, skin)
    px(d, 9, 15, 3, 5, skin)
    px(d, 29, 15, 3, 5, skin)
    px(d, 15, 16, 2, 2, "#1d1712")
    px(d, 24, 16, 2, 2, "#1d1712")
    px(d, 20, 18, 2, 2, "#c77f5b")
    px(d, 18, 21, 6, 1, "#8d5138")
    # hair volume
    px(d, 10, 8, 20, 4, INK)
    px(d, 12, 5, 16, 6, hair)
    px(d, 9, 11, 4, 8, hair)
    px(d, 27, 11, 4, 7, hair)
    px(d, 15, 6, 10, 2, "#ffffff", 34)
    if accessory == "hat":
        px(d, 7, 7, 26, 4, INK)
        px(d, 11, 2, 18, 7, "#d5b46f")
        px(d, 13, 3, 14, 3, "#f1d88f")
        px(d, 11, 8, 18, 2, "#9b7538")
    if accessory == "vest":
        px(d, 9, 24, 6, 17, "#253a28")
        px(d, 25, 24, 6, 17, "#253a28")
        px(d, 18, 27, 4, 11, "#dbd0a0")
        px(d, 27, 28, 3, 2, "#d8a941")
    if accessory == "tablet":
        box(d, 28, 27, 9, 13, "#f0dfb0")
        px(d, 30, 29, 5, 8, "#8bc7c9")
        px(d, 31, 30, 3, 2, "#d2f4ec")
    if accessory == "satchel":
        box(d, 4, 35, 9, 8, "#9d6a34")
        px(d, 6, 36, 5, 2, "#d5a35f")
        line(d, [(11, 25), (29, 42)], "#6e4027", 2)
    return save(name, img)


def make_player() -> dict[str, object]:
    return make_actor("player", "#2f8060", "#263c58", "#7b4c2b", "#f0bf8a", "tablet")


def make_animals() -> list[dict[str, object]]:
    assets: list[dict[str, object]] = []

    img, d = canvas(58, 42)
    add_drop_shadow(d, 6, 35, 44, 6)
    ellipse(d, 10, 17, 32, 14, "#a9663a")
    ellipse(d, 36, 12, 16, 13, "#b87542")
    poly(d, [(39, 12), (36, 5), (43, 9)], "#bf8552", INK_SOFT)
    poly(d, [(48, 12), (50, 5), (53, 13)], "#bf8552", INK_SOFT)
    px(d, 51, 18, 4, 2, "#2a1711")
    px(d, 46, 16, 2, 2, "#111111")
    px(d, 39, 22, 10, 3, "#ead09b", 160)
    px(d, 6, 20, 8, 4, "#7b3e23")
    px(d, 15, 29, 4, 9, "#5a331f")
    px(d, 19, 37, 5, 2, "#241812")
    px(d, 34, 29, 4, 9, "#5a331f")
    px(d, 38, 37, 5, 2, "#241812")
    px(d, 20, 18, 13, 3, "#d4a06d", 150)
    line(d, [(43, 10), (42, 4), (39, 2)], "#4f2d1d", 1)
    line(d, [(47, 10), (49, 4), (52, 2)], "#4f2d1d", 1)
    assets.append(save("muntjac", img))

    img, d = canvas(60, 36)
    add_drop_shadow(d, 7, 30, 43, 5)
    poly(d, [(4, 24), (16, 19), (22, 22), (11, 29)], "#5f4b3b", "#49382b")
    ellipse(d, 15, 13, 33, 14, "#786251")
    ellipse(d, 43, 11, 12, 9, "#8c735c")
    px(d, 53, 15, 4, 2, "#4a392c")
    px(d, 51, 14, 1, 1, "#111111")
    for y in (11, 15, 19):
        offset = 0 if y == 15 else 3
        for x in range(18 + offset, 45, 6):
            poly(d, [(x, y), (x + 7, y + 2), (x + 3, y + 6)], "#6d5a48", "#4a392c")
    px(d, 22, 26, 3, 6, "#4f3e31")
    px(d, 37, 25, 3, 6, "#4f3e31")
    px(d, 17, 12, 7, 2, "#9a866d", 125)
    assets.append(save("pangolin", img))

    img, d = canvas(44, 34)
    add_drop_shadow(d, 6, 28, 30, 4)
    poly(d, [(9, 18), (0, 12), (3, 25)], "#b14f3f")
    ellipse(d, 10, 15, 20, 11, "#415b68")
    ellipse(d, 27, 10, 10, 10, "#506d7a")
    poly(d, [(36, 15), (43, 12), (37, 17)], "#d6a545", "#5b3522")
    px(d, 33, 13, 2, 2, "#111111")
    px(d, 15, 17, 11, 2, "#a6bbc1")
    px(d, 17, 25, 2, 6, "#2b3338")
    px(d, 23, 25, 2, 6, "#2b3338")
    px(d, 16, 31, 5, 1, "#2b3338")
    px(d, 23, 31, 5, 1, "#2b3338")
    assets.append(save("redstart", img))

    img, d = canvas(54, 26)
    add_drop_shadow(d, 7, 21, 38, 4)
    ellipse(d, 12, 8, 26, 10, "#5aa6b2")
    poly(d, [(11, 13), (0, 6), (1, 21)], "#4f8e9a")
    poly(d, [(37, 6), (52, 13), (37, 20)], "#76c6cc")
    poly(d, [(25, 17), (30, 24), (20, 21)], "#438f9f")
    px(d, 42, 10, 2, 2, "#10272b")
    px(d, 16, 12, 15, 2, "#d2f4ec", 185)
    line(d, [(17, 9), (33, 17)], "#2f7480")
    assets.append(save("streamfish", img))

    img, d = canvas(42, 42)
    d.ellipse([2, 2, 39, 39], fill=color("#e7dc64", 62))
    d.ellipse([8, 10, 33, 34], fill=color("#f2e975", 42))
    ellipse(d, 17, 16, 9, 8, "#514b25")
    poly(d, [(16, 17), (5, 11), (8, 23)], "#ced8d7", "#8ea0a2")
    poly(d, [(26, 17), (37, 11), (34, 23)], "#ced8d7", "#8ea0a2")
    px(d, 18, 24, 8, 7, "#f2e975")
    px(d, 20, 27, 4, 2, "#fff7a0")
    line(d, [(19, 15), (16, 10)], "#3b2118")
    line(d, [(24, 15), (27, 10)], "#3b2118")
    assets.append(save("firefly", img))

    img, d = canvas(68, 42)
    add_drop_shadow(d, 8, 35, 48, 5)
    poly(d, [(19, 21), (0, 12), (8, 29)], "#1f4e93")
    poly(d, [(14, 24), (2, 26), (0, 33), (19, 29)], "#2d6fb8")
    ellipse(d, 20, 16, 25, 12, "#2d6fb8")
    ellipse(d, 42, 11, 12, 12, "#1d2d42")
    poly(d, [(53, 17), (66, 14), (55, 21)], "#d6a545", "#5b3522")
    px(d, 48, 14, 2, 2, "#ffffff")
    px(d, 27, 18, 13, 5, "#ffffff")
    px(d, 24, 21, 16, 3, "#93c8ec")
    px(d, 27, 28, 3, 7, "#1e2a40")
    px(d, 35, 28, 3, 7, "#1e2a40")
    px(d, 22, 35, 8, 1, "#1e2a40")
    px(d, 34, 35, 8, 1, "#1e2a40")
    assets.append(save("magpie", img))

    img, d = canvas(52, 36)
    add_drop_shadow(d, 7, 29, 36, 5)
    ellipse(d, 17, 13, 20, 12, "#b65f4c")
    ellipse(d, 8, 9, 10, 8, "#d17858")
    ellipse(d, 36, 9, 10, 8, "#d17858")
    poly(d, [(7, 9), (0, 4), (4, 15)], "#d17858", "#8e3d35")
    poly(d, [(45, 9), (51, 4), (48, 15)], "#d17858", "#8e3d35")
    for x0, side in [(14, -1), (19, -1), (33, 1), (38, 1)]:
        line(d, [(x0, 23), (x0 + side * 9, 30)], "#8e3d35", 2)
    px(d, 22, 12, 2, 2, "#101010")
    px(d, 31, 12, 2, 2, "#101010")
    px(d, 20, 24, 15, 2, "#e4a06e", 150)
    assets.append(save("landcrab", img))

    img, d = canvas(46, 38)
    add_drop_shadow(d, 9, 31, 28, 4)
    px(d, 21, 11, 4, 18, "#35251d")
    ellipse(d, 4, 4, 17, 13, "#d88b3d")
    ellipse(d, 25, 4, 17, 13, "#d88b3d")
    ellipse(d, 7, 18, 15, 11, "#f0bd61")
    ellipse(d, 24, 18, 15, 11, "#f0bd61")
    px(d, 9, 8, 5, 3, "#fff0a8")
    px(d, 32, 8, 5, 3, "#fff0a8")
    px(d, 12, 22, 4, 2, "#8d5138")
    px(d, 30, 22, 4, 2, "#8d5138")
    line(d, [(22, 10), (18, 4)], "#35251d")
    line(d, [(25, 10), (29, 4)], "#35251d")
    assets.append(save("butterfly", img))
    return assets


def make_events() -> list[dict[str, object]]:
    assets: list[dict[str, object]] = []

    img, d = canvas(30, 28)
    add_drop_shadow(d, 6, 23, 18, 4)
    box(d, 8, 8, 9, 13, "#d8e2e1")
    px(d, 11, 5, 5, 4, "#5aa6b2")
    box(d, 17, 15, 8, 5, "#d88b3d")
    px(d, 6, 20, 17, 3, "#7f8f8d")
    assets.append(save("trash", img))

    img, d = canvas(34, 28)
    add_drop_shadow(d, 5, 23, 24, 4)
    box(d, 4, 10, 24, 10, "#5c6e73")
    for x in range(7, 27, 5):
        px(d, x, 12, 2, 6, "#1d3135")
    px(d, 6, 7, 18, 4, "#83a8a7")
    px(d, 23, 17, 6, 2, "#4f9fb0")
    assets.append(save("drain", img))

    img, d = canvas(30, 32)
    add_drop_shadow(d, 8, 27, 15, 3)
    px(d, 14, 13, 3, 16, "#557f36")
    ellipse(d, 5, 8, 12, 8, "#79a946")
    ellipse(d, 15, 6, 12, 9, "#90bd56")
    px(d, 8, 27, 15, 3, "#5a3a22")
    px(d, 15, 10, 3, 4, "#d6e49a")
    assets.append(save("sprout", img))

    img, d = canvas(28, 40)
    add_drop_shadow(d, 6, 35, 17, 4)
    px(d, 13, 12, 3, 24, "#564f44")
    box(d, 6, 5, 16, 9, "#efd86d")
    px(d, 8, 7, 12, 4, "#fff3a0")
    px(d, 8, 36, 14, 3, "#564f44")
    d.polygon([(6, 14), (22, 14), (28, 28), (0, 28)], fill=color("#efd86d", 50))
    assets.append(save("lamp", img))

    img, d = canvas(28, 34)
    add_drop_shadow(d, 7, 29, 14, 4)
    box(d, 11, 3, 6, 4, "#f4eed8")
    box(d, 9, 7, 10, 19, "#63b5c7")
    px(d, 11, 9, 6, 13, "#b8ecf0")
    px(d, 8, 26, 12, 3, "#315e68")
    assets.append(save("sample", img))

    img, d = canvas(30, 32)
    add_drop_shadow(d, 5, 27, 20, 4)
    poly(d, [(14, 4), (20, 25), (8, 25)], "#e98536")
    px(d, 10, 15, 9, 2, "#fff2bf")
    px(d, 7, 25, 18, 4, "#6b4a35")
    assets.append(save("cone", img))
    return assets


def roof_texture(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, base: str, hi: str, low: str) -> None:
    px(d, x, y, w, h, INK)
    px(d, x + 2, y + 2, w - 4, h - 4, base)
    for i in range(6, w - 8, 14):
        line(d, [(x + i, y + 4), (x + i - 8, y + h - 5)], low)
    for i in range(10, w - 4, 22):
        px(d, x + i, y + 8 + (i % 3), 7, 2, hi, 140)
        px(d, x + i + 2, y + h - 12, 5, 2, low, 130)


def make_world_objects() -> list[dict[str, object]]:
    assets: list[dict[str, object]] = []

    img, d = canvas(64, 76)
    add_drop_shadow(d, 9, 66, 45, 7)
    box(d, 25, 36, 12, 31, "#6f4728")
    px(d, 27, 38, 4, 26, "#9a6b3b", 120)
    ellipse(d, 3, 29, 29, 22, "#385f2f")
    ellipse(d, 26, 28, 31, 23, "#446f36")
    ellipse(d, 11, 14, 34, 26, "#4f7d3b")
    ellipse(d, 31, 7, 24, 22, "#5b8a42")
    ellipse(d, 4, 42, 22, 18, "#315a2e")
    px(d, 25, 62, 12, 5, "#8a6a38")
    px(d, 14, 23, 11, 3, "#6e9a4b", 150)
    px(d, 37, 16, 9, 2, "#7fb05a", 120)
    assets.append(save("tree", img))

    img, d = canvas(72, 98)
    add_drop_shadow(d, 10, 88, 50, 8)
    box(d, 31, 43, 13, 45, "#6f4728")
    px(d, 34, 46, 4, 38, "#9a6b3b", 120)
    ellipse(d, 3, 36, 34, 27, "#315a2e")
    ellipse(d, 31, 34, 33, 27, "#3d6b34")
    ellipse(d, 12, 18, 39, 31, "#4c7e3d")
    ellipse(d, 34, 6, 30, 29, "#5b8a42")
    ellipse(d, 0, 55, 27, 23, "#3b6b31")
    ellipse(d, 41, 51, 27, 24, "#446f36")
    px(d, 31, 82, 13, 6, "#8a6a38")
    px(d, 17, 29, 12, 3, "#6e9a4b", 130)
    px(d, 45, 19, 9, 2, "#7fb05a", 125)
    assets.append(save("treeTall", img))

    img, d = canvas(240, 174)
    add_drop_shadow(d, 18, 152, 200, 12)
    box(d, 25, 68, 190, 78, "#d7bc75")
    roof_texture(d, 10, 42, 220, 36, "#3f8a70", "#76b999", "#265847")
    px(d, 31, 62, 178, 8, "#8a6a38")
    box(d, 89, 105, 32, 41, "#365143")
    px(d, 93, 111, 11, 31, "#254034")
    px(d, 106, 111, 11, 31, "#4c7564")
    box(d, 42, 84, 36, 24, "#f4e2aa")
    box(d, 157, 84, 36, 24, "#f4e2aa")
    px(d, 46, 88, 28, 16, "#ffe9af")
    px(d, 161, 88, 28, 16, "#ffe9af")
    px(d, 58, 84, 2, 24, "#8a6a38")
    px(d, 174, 84, 2, 24, "#8a6a38")
    box(d, 124, 83, 22, 16, "#bfe7de")
    px(d, 127, 86, 16, 10, "#d9fff5")
    px(d, 42, 140, 148, 5, "#8a6a38")
    for x in range(31, 211, 20):
        px(d, x, 69, 4, 76, "#8b5a32")
    box(d, 151, 120, 32, 16, "#5f8f4f")
    px(d, 154, 123, 26, 8, "#81b45e")
    box(d, 53, 119, 24, 17, "#9d6a34")
    px(d, 57, 122, 16, 5, "#f1d88f")
    assets.append(save("buildingEcoStation", img))

    img, d = canvas(260, 174)
    add_drop_shadow(d, 18, 152, 220, 12)
    box(d, 25, 70, 210, 76, "#e2d39b")
    roof_texture(d, 10, 42, 240, 37, "#8c5a88", "#b986b2", "#603c5f")
    px(d, 32, 64, 196, 8, "#9b7040")
    box(d, 103, 105, 34, 41, "#3a4a3f")
    px(d, 108, 111, 10, 31, "#28372f")
    px(d, 120, 111, 12, 31, "#60766a")
    for x in (43, 88, 164, 207):
        box(d, x, 86, 34, 23, "#bfe7de")
        px(d, x + 4, 90, 26, 15, "#d9fff5")
        px(d, x + 16, 87, 2, 21, "#7ca7a2")
    box(d, 145, 119, 42, 17, "#5f6f86")
    px(d, 150, 122, 32, 4, "#9fd1d8")
    for x in range(32, 229, 24):
        px(d, x, 71, 4, 74, "#9b7040")
    box(d, 41, 121, 27, 17, "#9d6a34")
    px(d, 45, 124, 19, 4, "#f1d88f")
    assets.append(save("buildingDataLab", img))

    img, d = canvas(210, 142)
    add_drop_shadow(d, 16, 123, 170, 10)
    box(d, 21, 54, 165, 64, "#e0c88d")
    roof_texture(d, 8, 31, 194, 32, "#c5684b", "#db8a68", "#8a3f31")
    px(d, 29, 51, 150, 6, "#866234")
    box(d, 82, 84, 32, 34, "#365143")
    px(d, 86, 90, 10, 24, "#254034")
    px(d, 99, 90, 10, 24, "#4c7564")
    box(d, 139, 72, 31, 22, "#f4e2aa")
    px(d, 143, 76, 23, 14, "#ffe9af")
    px(d, 32, 112, 133, 5, "#866234")
    box(d, 37, 79, 31, 22, "#a98a54")
    px(d, 41, 83, 23, 4, "#d7bc75")
    px(d, 41, 91, 23, 3, "#6d5530")
    for x in range(29, 181, 22):
        px(d, x, 55, 4, 63, "#8b5a32")
    assets.append(save("buildingWorkshop", img))

    img, d = canvas(280, 54)
    add_drop_shadow(d, 9, 39, 258, 6)
    px(d, 0, 16, 280, 23, INK)
    px(d, 4, 19, 272, 17, "#8b6f3f")
    for x in range(10, 265, 36):
        box(d, x, 8, 14, 34, "#9d6a34")
    for x in range(16, 266, 28):
        px(d, x, 22, 22, 5, "#d7bc75")
        px(d, x + 2, 31, 18, 3, "#6d5530")
    px(d, 0, 18, 280, 3, "#d5a35f", 120)
    assets.append(save("bridge", img))
    return assets


def make_tiles() -> list[dict[str, object]]:
    palette = {
        "tileGrass": ("#74a763", "#86b973", "#5b7f43", "#91bf72"),
        "tileHub": ("#82ad68", "#93bf75", "#63824b", "#9ec87e"),
        "tilePath": ("#b9915a", "#caa66d", "#8c6a3e", "#d6b37a"),
        "tileForest": ("#496f3d", "#5b8c4a", "#365f33", "#6a9a55"),
        "tileMeadow": ("#86b95f", "#95c86b", "#e6c95b", "#a7cf73"),
        "tileWetland": ("#638d54", "#7aa868", "#2f6a55", "#9dc47c"),
        "tileCoast": ("#c1a96a", "#d2bc80", "#8f784e", "#dfc98b"),
        "tileWater": ("#3f93a4", "#60b4bd", "#d2f4ec", "#2f7480"),
    }
    assets: list[dict[str, object]] = []
    for name, (base, hi, deco, soft) in palette.items():
        img, d = canvas(32, 32)
        px(d, 0, 0, 32, 32, base)
        if name == "tileWater":
            px(d, 0, 0, 32, 32, base)
            px(d, 0, 0, 32, 8, "#4aa0af")
            px(d, 4, 9, 11, 2, "#b8ecf0")
            px(d, 17, 18, 10, 2, "#83ccd1")
            px(d, 2, 26, 7, 1, "#d2f4ec")
            px(d, 25, 5, 5, 1, "#2f7480")
        elif name == "tilePath":
            px(d, 4, 5, 10, 3, hi, 35)
            px(d, 20, 23, 6, 3, soft, 32)
            for x, y, w in [(5, 9, 4), (20, 14, 5), (10, 24, 4)]:
                px(d, x, y, w, 2, deco, 48)
            px(d, 14, 18, 2, 2, soft, 58)
        elif name == "tileMeadow":
            px(d, 6, 6, 8, 3, hi, 28)
            for x, y in [(8, 10), (24, 20)]:
                px(d, x, y, 2, 3, deco)
                px(d, x + 2, y + 1, 1, 2, "#fff0a8")
            px(d, 5, 23, 3, 2, "#557f36", 85)
        elif name == "tileForest":
            px(d, 6, 22, 10, 3, deco, 52)
            px(d, 21, 9, 5, 2, "#6fa35b", 44)
            px(d, 8, 8, 6, 6, "#365f33", 58)
            px(d, 19, 20, 8, 5, "#315a2e", 50)
        elif name == "tileWetland":
            px(d, 0, 21, 32, 7, "#4f8e72", 70)
            px(d, 3, 23, 10, 2, "#b8ecf0", 88)
            px(d, 19, 25, 8, 2, "#b8ecf0", 78)
            for x in (6, 13, 24):
                px(d, x, 10, 2, 14, deco)
                px(d, x - 2, 12, 2, 6, "#8fbf65")
                px(d, x + 2, 13, 2, 5, "#8fbf65")
        elif name == "tileCoast":
            px(d, 3, 7, 6, 3, hi, 28)
            px(d, 8, 18, 3, 2, deco, 58)
            px(d, 23, 10, 5, 2, "#e2ca8f", 74)
            px(d, 14, 24, 6, 2, "#ad925b", 36)
        else:
            px(d, 7, 8, 7, 3, hi, 14)
            px(d, 21, 20, 4, 2, soft, 12)
        opaque = Image.new("RGBA", img.size, color(base))
        opaque.alpha_composite(img)
        img = opaque
        assets.append(save(name, img))
    return assets


def make_preview(manifest: list[dict[str, object]]) -> None:
    thumbs = []
    for item in manifest:
        img = Image.open(OUT / item["file"]).convert("RGBA")
        tile = Image.new("RGBA", (80, 74), color("#eadca6", 255))
        scale = max(1, min(4, 64 // max(img.width, img.height)))
        resized = img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)
        tile.alpha_composite(resized, ((80 - resized.width) // 2, (58 - resized.height) // 2))
        thumbs.append((item["name"], tile))
    cols = 6
    rows = math.ceil(len(thumbs) / cols)
    preview = Image.new("RGBA", (cols * 110, rows * 96), color("#203529", 255))
    d = ImageDraw.Draw(preview)
    for i, (name, thumb) in enumerate(thumbs):
        x = (i % cols) * 110
        y = (i // cols) * 96
        preview.alpha_composite(thumb, (x + 15, y + 6))
        d.text((x + 55, y + 83), name[:15], fill=color("#fff7d7"), anchor="mm")
    preview.save(OUT / "preview_sheet.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []
    manifest.append(make_player())
    manifest.extend(
        [
            make_actor("npcTeacher", "#d8a941", "#42535a", "#4d2d23", "#e6b57e", "hat"),
            make_actor("npcRanger", "#3b6a38", "#2d3c2b", "#3a2b1d", "#c99162", "vest"),
            make_actor("npcResearcher", "#7e527b", "#303654", "#2f2b36", "#d8a476", "tablet"),
            make_actor("npcKid", "#5d7fd1", "#31405f", "#3b2618", "#e0a374", "satchel"),
        ]
    )
    manifest.extend(make_animals())
    manifest.extend(make_events())
    manifest.extend(make_world_objects())
    manifest.extend(make_tiles())
    make_preview(manifest)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"generated {len(manifest)} assets in {OUT}")


if __name__ == "__main__":
    main()
