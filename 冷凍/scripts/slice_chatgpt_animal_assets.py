from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "source" / "gpt-image-2"
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE_TAG = "gpt-image-2"

STATIC_SHEET = SOURCE / "animals-all-chatgpt-image-2.png"
WALK_SHEET = SOURCE / "animals-walk-all-chatgpt-image-2.png"

ANIMALS = [
    "muntjac",
    "pangolin",
    "blackBear",
    "redstart",
    "streamfish",
    "firefly",
    "magpie",
    "landcrab",
    "butterfly",
    "leopardCat",
    "macaque",
    "otter",
    "treefrog",
    "greenTurtle",
    "blackKite",
]

TARGETS = {
    "muntjac": (128, 96),
    "pangolin": (132, 80),
    "blackBear": (128, 128),
    "redstart": (96, 76),
    "streamfish": (124, 60),
    "firefly": (88, 88),
    "magpie": (132, 84),
    "landcrab": (112, 86),
    "butterfly": (96, 86),
    "leopardCat": (96, 52),
    "macaque": (68, 60),
    "otter": (70, 34),
    "treefrog": (78, 50),
    "greenTurtle": (64, 42),
    "blackKite": (72, 42),
}


def cell_crop(sheet: Image.Image, cols: int, rows: int, index: int, pad_ratio: float = 0.025) -> Image.Image:
    col = index % cols
    row = index // cols
    cell_w = sheet.width / cols
    cell_h = sheet.height / rows
    left = round(col * cell_w)
    top = round(row * cell_h)
    right = round((col + 1) * cell_w)
    bottom = round((row + 1) * cell_h)
    pad_x = round((right - left) * pad_ratio)
    pad_y = round((bottom - top) * pad_ratio)
    return sheet.crop((left + pad_x, top + pad_y, right - pad_x, bottom - pad_y)).convert("RGBA")


def is_magenta_fringe(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 78 and b > 78 and g < 92 and abs(r - b) < 92


def is_purple_spill(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 44 and b > 44 and g < 72 and abs(r - b) < 96


def remove_connected_chroma(img: Image.Image, key: tuple[int, int, int] = (255, 0, 255), tolerance: int = 115) -> Image.Image:
    img = img.convert("RGBA")
    width, height = img.size
    src = img.load()
    visited = bytearray(width * height)
    q: deque[tuple[int, int]] = deque()
    tolerance_sq = tolerance * tolerance

    def key_like(x: int, y: int) -> bool:
        r, g, b, a = src[x, y]
        if a == 0:
            return True
        kr, kg, kb = key
        return (r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2 <= tolerance_sq

    def push(x: int, y: int) -> None:
        idx = y * width + x
        if visited[idx] or not key_like(x, y):
            return
        visited[idx] = 1
        q.append((x, y))

    for x in range(width):
        push(x, 0)
        push(x, height - 1)
    for y in range(height):
        push(0, y)
        push(width - 1, y)

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                push(nx, ny)

    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    dst = out.load()
    for y in range(height):
        for x in range(width):
            r, g, b, a = src[x, y]
            if visited[y * width + x] or is_magenta_fringe((r, g, b)):
                continue
            if is_purple_spill((r, g, b)):
                if a < 96:
                    continue
                shade = max(18, min(72, round((r + b) * 0.22 + g * 0.18)))
                dst[x, y] = (shade, max(12, round(shade * 0.72)), max(10, round(shade * 0.55)), a)
                continue
            dst[x, y] = (r, g, b, a)
    return out


def trim_alpha(img: Image.Image, padding: int = 10) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    left, top, right, bottom = bbox
    return img.crop((
        max(0, left - padding),
        max(0, top - padding),
        min(img.width, right + padding),
        min(img.height, bottom + padding),
    ))


def keep_largest_alpha_component(img: Image.Image) -> Image.Image:
    img = img.convert("RGBA")
    width, height = img.size
    alpha = img.getchannel("A")
    data = alpha.load()
    visited = bytearray(width * height)
    components: list[list[tuple[int, int]]] = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if visited[idx] or data[x, y] <= 8:
                continue
            visited[idx] = 1
            points: list[tuple[int, int]] = []
            q: deque[tuple[int, int]] = deque([(x, y)])
            while q:
                px, py = q.popleft()
                points.append((px, py))
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        nidx = ny * width + nx
                        if not visited[nidx] and data[nx, ny] > 8:
                            visited[nidx] = 1
                            q.append((nx, ny))
            components.append(points)

    if not components:
        return img

    largest = max(components, key=len)
    mask = Image.new("L", img.size, 0)
    mask_data = mask.load()
    for x, y in largest:
        mask_data[x, y] = data[x, y]

    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.alpha_composite(img)
    out.putalpha(mask)
    return out


def alpha_components(img: Image.Image, min_area: int = 80) -> list[dict[str, object]]:
    img = img.convert("RGBA")
    width, height = img.size
    alpha = img.getchannel("A")
    data = alpha.load()
    visited = bytearray(width * height)
    components: list[dict[str, object]] = []

    for y in range(height):
        for x in range(width):
            idx = y * width + x
            if visited[idx] or data[x, y] <= 8:
                continue
            visited[idx] = 1
            q: deque[tuple[int, int]] = deque([(x, y)])
            area = 0
            left = right = x
            top = bottom = y
            while q:
                px, py = q.popleft()
                area += 1
                left = min(left, px)
                right = max(right, px)
                top = min(top, py)
                bottom = max(bottom, py)
                for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        nidx = ny * width + nx
                        if not visited[nidx] and data[nx, ny] > 8:
                            visited[nidx] = 1
                            q.append((nx, ny))
            if area >= min_area:
                components.append({
                    "area": area,
                    "bbox": (left, top, right + 1, bottom + 1),
                    "center": ((left + right + 1) / 2, (top + bottom + 1) / 2),
                })
    return components


def component_grid_crops(sheet: Image.Image, cols: int, rows: int, padding: int = 14) -> list[Image.Image]:
    clean = remove_connected_chroma(sheet)
    expected = cols * rows
    components = sorted(alpha_components(clean), key=lambda item: int(item["area"]), reverse=True)[:expected]
    if len(components) != expected:
        raise RuntimeError(f"expected {expected} sprites, found {len(components)}")

    ordered: list[dict[str, object]] = []
    by_y = sorted(components, key=lambda item: item["center"][1])  # type: ignore[index]
    for row in range(rows):
        row_items = by_y[row * cols : (row + 1) * cols]
        ordered.extend(sorted(row_items, key=lambda item: item["center"][0]))  # type: ignore[index]

    crops = []
    for item in ordered:
        left, top, right, bottom = item["bbox"]  # type: ignore[misc]
        crops.append(clean.crop((
            max(0, left - padding),
            max(0, top - padding),
            min(clean.width, right + padding),
            min(clean.height, bottom + padding),
        )))
    return crops


def fit_to_target(img: Image.Image, target: tuple[int, int], margin: int = 0) -> Image.Image:
    target_w, target_h = target
    out = Image.new("RGBA", target, (0, 0, 0, 0))
    fit_w = max(1, target_w - margin * 2)
    fit_h = max(1, target_h - margin * 2)
    scale = min(fit_w / img.width, fit_h / img.height)
    new_w = max(1, round(img.width * scale))
    new_h = max(1, round(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    out.alpha_composite(resized, ((target_w - new_w) // 2, target_h - margin - new_h))
    return out


def prepare_sprite(img: Image.Image, name: str) -> Image.Image:
    cut = remove_connected_chroma(img)
    cut = keep_largest_alpha_component(cut)
    cut = trim_alpha(cut, padding=12)
    return fit_to_target(cut, TARGETS[name])


def prepare_clean_sprite(img: Image.Image, name: str) -> Image.Image:
    cut = trim_alpha(img.convert("RGBA"), padding=12)
    return fit_to_target(cut, TARGETS[name], margin=4)


def update_manifest(entries: list[dict[str, object]]) -> None:
    if MANIFEST.exists():
        manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        manifest = []
    names = {entry["name"] for entry in entries}
    manifest = [item for item in manifest if item.get("name") not in names]
    manifest.extend(entries)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def save_sprite(name: str, img: Image.Image, entries: list[dict[str, object]], file_name: str | None = None) -> None:
    file_name = file_name or f"{name}.png"
    path = OUT / file_name
    img.save(path)
    entries.append({"name": name, "file": file_name, "size": list(img.size), "source": SOURCE_TAG})


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    static_sheet = Image.open(STATIC_SHEET).convert("RGBA")
    for index, name in enumerate(ANIMALS):
        sprite = prepare_sprite(cell_crop(static_sheet, 5, 3, index), name)
        save_sprite(name, sprite, entries)

    walk_sheet = Image.open(WALK_SHEET).convert("RGBA")
    walk_crops = component_grid_crops(walk_sheet, 4, 15)
    for animal_index, name in enumerate(ANIMALS):
        for frame in range(4):
            index = animal_index * 4 + frame
            sprite = prepare_clean_sprite(walk_crops[index], name)
            frame_name = f"{name}Walk{frame + 1}"
            file_name = f"{name}_walk{frame + 1}.png"
            save_sprite(frame_name, sprite, entries, file_name)

    update_manifest(entries)
    print(f"sliced {len(entries)} ChatGPT Images animal sprites into {OUT}")


if __name__ == "__main__":
    main()
