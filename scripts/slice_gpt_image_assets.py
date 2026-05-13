from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "gpt-image-2"
OUT = ROOT / "assets" / "pixel"


SHEETS = [
    {
        "file": "animals-sheet.png",
        "cols": 4,
        "rows": 2,
        "names": [
            "muntjac",
            "pangolin",
            "redstart",
            "streamfish",
            "firefly",
            "magpie",
            "landcrab",
            "butterfly",
        ],
    },
    {
        "file": "people-events-sheet.png",
        "cols": 4,
        "rows": 3,
        "names": [
            "player",
            "npcTeacher",
            "npcRanger",
            "npcResearcher",
            "npcKid",
            "trash",
            "drain",
            "sprout",
            "lamp",
            "sample",
            "cone",
            "signboard",
        ],
    },
    {
        "file": "world-tiles-sheet.png",
        "cols": 4,
        "rows": 3,
        "names": [
            "tree",
            "treeTall",
            "buildingEcoStation",
            "buildingDataLab",
            "buildingWorkshop",
            "bridge",
            "tileGrass",
            "tileForest",
            "tileMeadow",
            "tileWetland",
            "tileCoast",
            "tileWater",
        ],
    },
]


TARGETS = {
    "player": (64, 88),
    "npcTeacher": (64, 88),
    "npcRanger": (64, 88),
    "npcResearcher": (64, 88),
    "npcKid": (64, 88),
    "muntjac": (128, 96),
    "pangolin": (132, 80),
    "redstart": (96, 76),
    "streamfish": (124, 60),
    "firefly": (88, 88),
    "magpie": (132, 84),
    "landcrab": (112, 86),
    "butterfly": (96, 86),
    "trash": (82, 78),
    "drain": (96, 76),
    "sprout": (80, 88),
    "lamp": (78, 118),
    "sample": (74, 104),
    "cone": (78, 104),
    "signboard": (112, 96),
    "tree": (128, 152),
    "treeTall": (120, 172),
    "buildingEcoStation": (256, 192),
    "buildingDataLab": (276, 194),
    "buildingWorkshop": (236, 178),
    "bridge": (286, 96),
    "tileGrass": (32, 32),
    "tileHub": (32, 32),
    "tilePath": (32, 32),
    "tileForest": (32, 32),
    "tileMeadow": (32, 32),
    "tileWetland": (32, 32),
    "tileCoast": (32, 32),
    "tileWater": (32, 32),
}

SINGLE_COMPONENT_NAMES = {
    "redstart",
    "treeTall",
    "bridge",
    "buildingEcoStation",
    "buildingDataLab",
    "buildingWorkshop",
}


def color(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.strip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4)) + (alpha,)


def cell_crop(sheet: Image.Image, cols: int, rows: int, index: int) -> Image.Image:
    col = index % cols
    row = index // cols
    w, h = sheet.size
    left = round(col * w / cols)
    top = round(row * h / rows)
    right = round((col + 1) * w / cols)
    bottom = round((row + 1) * h / rows)
    pad_x = round((right - left) * 0.035)
    pad_y = round((bottom - top) * 0.035)
    return sheet.crop((left + pad_x, top + pad_y, right - pad_x, bottom - pad_y)).convert("RGBA")


def remove_connected_background(img: Image.Image, tolerance: int = 72) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    pix = img.load()
    seeds = []
    step = max(1, min(w, h) // 20)
    for x in range(0, w, step):
        seeds.append(pix[x, 0][:3])
        seeds.append(pix[x, h - 1][:3])
    for y in range(0, h, step):
        seeds.append(pix[0, y][:3])
        seeds.append(pix[w - 1, y][:3])

    def bg_like(rgb: tuple[int, int, int]) -> bool:
        r, g, b = rgb
        lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
        if lum < 128:
            return False
        best = min((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2 for sr, sg, sb in seeds)
        return best <= tolerance * tolerance

    q: deque[tuple[int, int]] = deque()
    visited = bytearray(w * h)

    def push(x: int, y: int) -> None:
        i = y * w + x
        if visited[i]:
            return
        if not bg_like(pix[x, y][:3]):
            return
        visited[i] = 1
        q.append((x, y))

    for x in range(w):
        push(x, 0)
        push(x, h - 1)
    for y in range(h):
        push(0, y)
        push(w - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    src = img.load()
    dst = out.load()
    for y in range(h):
        for x in range(w):
            if visited[y * w + x]:
                continue
            r, g, b, a = src[x, y]
            dst[x, y] = (r, g, b, a)
    return out


def trim_alpha(img: Image.Image, padding: int = 10) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(img.width, right + padding)
    bottom = min(img.height, bottom + padding)
    return img.crop((left, top, right, bottom))


def keep_largest_alpha_component(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    w, h = img.size
    alpha = img.getchannel("A")
    data = alpha.load()
    visited = bytearray(w * h)
    components: list[list[tuple[int, int]]] = []
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if visited[idx] or data[x, y] <= 8:
                continue
            visited[idx] = 1
            q: deque[tuple[int, int]] = deque([(x, y)])
            points: list[tuple[int, int]] = []
            while q:
                px, py = q.popleft()
                points.append((px, py))
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and data[nx, ny] > 8:
                            visited[nidx] = 1
                            q.append((nx, ny))
            components.append(points)
    if not components:
        return img
    largest = max(components, key=len)
    mask = Image.new("L", img.size, 0)
    mp = mask.load()
    for x, y in largest:
        mp[x, y] = data[x, y]
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(img)
    out.putalpha(mask)
    return out


def fit_to_target(img: Image.Image, target: tuple[int, int], fill: tuple[int, int, int, int] | None = None) -> Image.Image:
    target_w, target_h = target
    canvas = Image.new("RGBA", target, fill or (0, 0, 0, 0))
    scale = min(target_w / img.width, target_h / img.height)
    new_w = max(1, round(img.width * scale))
    new_h = max(1, round(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (target_w - new_w) // 2
    y = target_h - new_h
    canvas.alpha_composite(resized, (x, y))
    return canvas


def save_asset(name: str, img: Image.Image, manifest: list[dict[str, object]]) -> None:
    target = TARGETS[name]
    fill = color("#79aa62") if name == "tileHub" else None
    fitted = fit_to_target(img, target, fill)
    out_path = OUT / f"{name}.png"
    fitted.save(out_path)
    manifest.append({"name": name, "file": out_path.name, "size": list(fitted.size), "source": "gpt-image-2"})


def make_preview(manifest: list[dict[str, object]]) -> None:
    thumbs = []
    for item in manifest:
        img = Image.open(OUT / item["file"]).convert("RGBA")
        tile = Image.new("RGBA", (92, 82), color("#eadca6"))
        scale = min(1.0, 70 / max(img.width, img.height))
        resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.Resampling.LANCZOS)
        tile.alpha_composite(resized, ((92 - resized.width) // 2, (62 - resized.height) // 2))
        thumbs.append((item["name"], tile))

    cols = 6
    rows = (len(thumbs) + cols - 1) // cols
    preview = Image.new("RGBA", (cols * 122, rows * 104), color("#203529"))
    d = ImageDraw.Draw(preview)
    for i, (name, thumb) in enumerate(thumbs):
        x = (i % cols) * 122
        y = (i // cols) * 104
        preview.alpha_composite(thumb, (x + 15, y + 7))
        d.text((x + 61, y + 92), name[:16], fill=color("#fff7d7"), anchor="mm")
    preview.save(OUT / "preview_sheet.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest: list[dict[str, object]] = []

    extracted: dict[str, Image.Image] = {}
    for spec in SHEETS:
        sheet = Image.open(SOURCE / spec["file"]).convert("RGBA")
        for i, name in enumerate(spec["names"]):
            crop = cell_crop(sheet, spec["cols"], spec["rows"], i)
            cut = remove_connected_background(crop)
            if name in SINGLE_COMPONENT_NAMES:
                cut = keep_largest_alpha_component(cut)
            cut = trim_alpha(cut, padding=12)
            extracted[name] = cut

    # The world tile sheet keeps these two buildings on a strict grid, which
    # clips their left/right edges. Use the dedicated sheet for complete sprites.
    building_sheet = Image.open(SOURCE / "buildings-bridge-sheet.png").convert("RGBA")
    for i, name in enumerate(["buildingEcoStation", "buildingDataLab"]):
        crop = cell_crop(building_sheet, 2, 2, i)
        cut = remove_connected_background(crop)
        cut = keep_largest_alpha_component(cut)
        extracted[name] = trim_alpha(cut, padding=12)

    for name in [
        "player",
        "npcTeacher",
        "npcRanger",
        "npcResearcher",
        "npcKid",
        "muntjac",
        "pangolin",
        "redstart",
        "streamfish",
        "firefly",
        "magpie",
        "landcrab",
        "butterfly",
        "trash",
        "drain",
        "sprout",
        "lamp",
        "sample",
        "cone",
        "tree",
        "treeTall",
        "buildingEcoStation",
        "buildingDataLab",
        "buildingWorkshop",
        "bridge",
        "tileGrass",
        "tileForest",
        "tileMeadow",
        "tileWetland",
        "tileCoast",
        "tileWater",
    ]:
        save_asset(name, extracted[name], manifest)

    # These two terrain assets are derived from generated GPT tiles, not drawn.
    save_asset("tileHub", extracted["tileGrass"], manifest)
    save_asset("tilePath", extracted["tileCoast"], manifest)

    make_preview(manifest)
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"sliced {len(manifest)} GPT-generated assets into {OUT}")


if __name__ == "__main__":
    main()
