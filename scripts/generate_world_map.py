from __future__ import annotations

import json
import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE = "generated-world-map"

TILE = 32
MAP_W = 84
MAP_H = 56
WORLD_W = MAP_W * TILE
WORLD_H = MAP_H * TILE
MAP_SCALE = 2
MAP_IMG_W = MAP_W * MAP_SCALE
MAP_IMG_H = MAP_H * MAP_SCALE


def color(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.strip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def px(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, c: str, a: int = 255) -> None:
    d.rectangle([x, y, x + w - 1, y + h - 1], fill=color(c, a))


def noise(x: int, y: int, seed: int = 0) -> float:
    value = math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123
    return value - math.floor(value)


def river_center_x(tile_y: int) -> float:
    return 57 + math.sin(tile_y * 0.32) * 3.4 + math.sin(tile_y * 0.09) * 1.2


def is_bridge_tile(tx: int, ty: int) -> bool:
    return 33 <= ty <= 35 and abs(tx - river_center_x(ty)) <= 4.8


def is_wetland_pool(tx: int, ty: int) -> bool:
    dx = (tx - 48.5) / 5.6
    dy = (ty - 37.5) / 3.8
    small_dx = (tx - 53) / 2.4
    small_dy = (ty - 41.5) / 2.2
    return dx * dx + dy * dy < 1 or small_dx * small_dx + small_dy * small_dy < 1


def is_path_tile(tx: int, ty: int) -> bool:
    east_west = 33 <= ty <= 35 and 5 <= tx <= 75
    hub_vertical = 11 <= tx <= 13 and 12 <= ty <= 43
    meadow_loop = 15 <= ty <= 17 and 11 <= tx <= 47
    forest_fork = 35 <= tx <= 37 and 10 <= ty <= 31
    coast_spine = 70 <= tx <= 72 and 29 <= ty <= 49
    coast_shore = 43 <= ty <= 45 and 66 <= tx <= 80
    return east_west or hub_vertical or meadow_loop or forest_fork or coast_spine or coast_shore or is_bridge_tile(tx, ty)


def terrain_at(tx: int, ty: int) -> str:
    if tx < 0 or ty < 0 or tx >= MAP_W or ty >= MAP_H:
        return "void"
    cx = river_center_x(ty)
    in_river = 3 <= ty <= 53 and abs(tx - cx) <= 2.35
    in_shore_water = tx >= 79 and ty >= 39 + math.sin(ty * 0.65) * 2
    if is_path_tile(tx, ty) and (not in_river or is_bridge_tile(tx, ty)):
        return "path"
    if (in_river and not is_bridge_tile(tx, ty)) or is_wetland_pool(tx, ty) or in_shore_water:
        return "water"
    if tx >= 66 and ty >= 27:
        return "coast"
    if 41 <= tx <= 55 and 31 <= ty <= 44:
        return "wetland"
    if 24 <= tx <= 53 and 4 <= ty <= 34:
        return "forest"
    if 6 <= tx <= 26 and 8 <= ty <= 24:
        return "meadow"
    if 2 <= tx <= 26 and 27 <= ty <= 45:
        return "hub"
    return "grass"


def world_to_map(x: float, y: float) -> tuple[int, int]:
    return round((x / WORLD_W) * MAP_IMG_W), round((y / WORLD_H) * MAP_IMG_H)


def rect_world_to_map(x: float, y: float, w: float, h: float) -> tuple[int, int, int, int]:
    mx, my = world_to_map(x, y)
    mw = max(1, round((w / WORLD_W) * MAP_IMG_W))
    mh = max(1, round((h / WORLD_H) * MAP_IMG_H))
    return mx, my, mw, mh


def draw_tile_detail(d: ImageDraw.ImageDraw, tx: int, ty: int, terrain: str) -> None:
    x = tx * MAP_SCALE
    y = ty * MAP_SCALE
    n = noise(tx, ty)
    n2 = noise(tx, ty, 18)
    palette = {
        "grass": ("#78aa67", "#86b875"),
        "hub": ("#82ad68", "#91bb73"),
        "path": ("#b58f59", "#c19b61"),
        "forest": ("#456d3b", "#527f49"),
        "meadow": ("#8cbd62", "#9acb70"),
        "wetland": ("#638d62", "#76a36c"),
        "coast": ("#c6ad72", "#d1bd80"),
        "water": ("#4795a6", "#54a9b8"),
        "void": ("#0d1511", "#0d1511"),
    }
    base, hi = palette.get(terrain, palette["void"])
    px(d, x, y, MAP_SCALE, MAP_SCALE, hi if n > 0.56 else base)

    if terrain == "water":
        if n > 0.58:
            px(d, x, y, 2, 1, "#a5dbe1", 160)
    elif terrain == "path":
        if n2 > 0.62:
            px(d, x + 1, y + 1, 1, 1, "#8c6a3e", 150)
    elif terrain == "forest":
        if n > 0.72:
            px(d, x, y, 1, 1, "#2f5c31")
            px(d, x + 1, y + 1, 1, 1, "#5f8f4f")
    elif terrain == "meadow":
        if n > 0.82:
            px(d, x + 1, y, 1, 1, "#e6c95b")
    elif terrain == "wetland":
        if n > 0.58:
            px(d, x, y + 1, 1, 1, "#2f6a55")
    elif terrain == "coast":
        if n > 0.78:
            px(d, x + 1, y + 1, 1, 1, "#f1dfaa")


def draw_building(d: ImageDraw.ImageDraw, x: float, y: float, w: float, h: float, roof: str, body: str, door: str = "#355444") -> None:
    mx, my, mw, mh = rect_world_to_map(x, y, w, h)
    px(d, mx + 1, my + mh - 1, mw, 2, "#28362c", 120)
    px(d, mx, my + max(2, mh // 3), mw, max(3, mh - mh // 3), "#3b2118")
    px(d, mx + 1, my + max(2, mh // 3) + 1, max(1, mw - 2), max(2, mh - mh // 3 - 2), body)
    px(d, mx - 1, my, mw + 2, max(3, mh // 3), "#3b2118")
    px(d, mx, my + 1, mw, max(1, mh // 3 - 1), roof)
    if mw >= 7 and mh >= 7:
        px(d, mx + mw // 2 - 1, my + mh - 5, 3, 5, door)
        px(d, mx + 3, my + mh // 2, 3, 2, "#ffe9af")
        px(d, mx + mw - 6, my + mh // 2, 3, 2, "#d9fff5")


def draw_landmarks(d: ImageDraw.ImageDraw) -> None:
    buildings = [
        (2.6 * TILE, 24.6 * TILE, 8.2 * TILE, 6.15 * TILE, "#3f8a70", "#d7bc75"),
        (14.2 * TILE, 24.5 * TILE, 8.82 * TILE, 6.2 * TILE, "#8c5a88", "#e2d39b"),
        (3.65 * TILE, 36.1 * TILE, 6.25 * TILE, 5.25 * TILE, "#c5684b", "#e0c88d"),
        (16 * TILE, 35.8 * TILE, 12 * TILE, 5.5 * TILE, "#5f8f4f", "#caa66d"),
    ]
    for building in buildings:
        draw_building(d, *building)

    bridge_x, bridge_y, bridge_w, bridge_h = rect_world_to_map((river_center_x(34) - 4.7) * TILE, 32.6 * TILE, 9.4 * TILE, 3.2 * TILE)
    px(d, bridge_x, bridge_y, bridge_w, bridge_h, "#3b2118")
    px(d, bridge_x + 1, bridge_y + 1, bridge_w - 2, bridge_h - 2, "#8b6f3f")
    for offset in range(2, max(2, bridge_w - 2), 4):
        px(d, bridge_x + offset, bridge_y + 1, 1, bridge_h - 2, "#d7bc75", 180)

    # A few larger tree clusters and wetland reeds keep the map recognizable at 2px-per-tile scale.
    for tx, ty in [(30, 9), (41, 11), (47, 23), (28, 28), (51, 30)]:
        mx, my = tx * MAP_SCALE, ty * MAP_SCALE
        px(d, mx, my, 3, 3, "#2f5c31")
        px(d, mx + 1, my, 2, 2, "#5f8f4f")
    for tx, ty in [(46, 35), (50, 39), (53, 42)]:
        mx, my = tx * MAP_SCALE, ty * MAP_SCALE
        px(d, mx, my, 1, 5, "#2f6a55")
        px(d, mx + 2, my + 1, 1, 4, "#9dc47c")


def make_world_map() -> Image.Image:
    img = Image.new("RGBA", (MAP_IMG_W, MAP_IMG_H), color("#0d1511"))
    d = ImageDraw.Draw(img)
    for ty in range(MAP_H):
        for tx in range(MAP_W):
            draw_tile_detail(d, tx, ty, terrain_at(tx, ty))

    draw_landmarks(d)

    # Pixel vignette and subtle contour lines make the miniature read as a map, not a flat screenshot.
    px(d, 0, 0, MAP_IMG_W, 1, "#f6edbd", 150)
    px(d, 0, MAP_IMG_H - 1, MAP_IMG_W, 1, "#1d2a21", 120)
    px(d, 0, 0, 1, MAP_IMG_H, "#f6edbd", 120)
    px(d, MAP_IMG_W - 1, 0, 1, MAP_IMG_H, "#1d2a21", 120)
    return img


def update_manifest(entry: dict[str, object]) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = []

    filtered = [item for item in manifest if item.get("name") != entry["name"]]
    filtered.append(entry)
    MANIFEST.write_text(json.dumps(filtered, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img = make_world_map()
    img.save(OUT / "worldMap.png")
    update_manifest({"name": "worldMap", "file": "worldMap.png", "size": [MAP_IMG_W, MAP_IMG_H], "source": SOURCE})
    print(f"generated worldMap.png ({MAP_IMG_W}x{MAP_IMG_H}) in {OUT}")


if __name__ == "__main__":
    main()
