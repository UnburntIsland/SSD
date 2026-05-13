from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE = "generated-weather-icons"

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


def ellipse(d: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, fill: str, outline: str = INK) -> None:
    d.ellipse([x, y, x + w - 1, y + h - 1], fill=color(outline))
    d.ellipse([x + 1, y + 1, x + w - 2, y + h - 2], fill=color(fill))


def cloud(d: ImageDraw.ImageDraw, fill: str, shade: str, x: int = 5, y: int = 13, dark: str = INK) -> None:
    px(d, x + 2, y + 6, 22, 8, dark)
    px(d, x + 5, y + 2, 9, 6, dark)
    px(d, x + 13, y, 8, 8, dark)
    px(d, x + 18, y + 4, 8, 6, dark)
    px(d, x + 3, y + 7, 20, 6, fill)
    px(d, x + 6, y + 4, 8, 5, fill)
    px(d, x + 14, y + 2, 7, 7, fill)
    px(d, x + 19, y + 6, 5, 4, fill)
    px(d, x + 7, y + 11, 14, 2, shade, 165)
    px(d, x + 8, y + 5, 5, 1, "#ffffff", 95)


def raindrop(d: ImageDraw.ImageDraw, x: int, y: int, c: str = "#74c7d8") -> None:
    px(d, x, y, 2, 4, INK_SOFT)
    px(d, x, y, 1, 3, c)
    px(d, x + 1, y + 3, 1, 1, "#d8fbff")


def draw_sunny() -> Image.Image:
    img, d = canvas()
    for x, y, w, h in [(15, 1, 2, 5), (15, 26, 2, 5), (1, 15, 5, 2), (26, 15, 5, 2), (5, 5, 4, 2), (23, 5, 4, 2), (5, 25, 4, 2), (23, 25, 4, 2)]:
        px(d, x, y, w, h, "#f4c653")
    ellipse(d, 8, 8, 16, 16, "#f2b94b", INK_SOFT)
    px(d, 12, 11, 6, 3, "#fff0a8", 190)
    px(d, 19, 19, 3, 2, "#d98b3b", 120)
    return img


def draw_cloudy() -> Image.Image:
    img, d = canvas()
    ellipse(d, 4, 5, 13, 13, "#f0bf57", INK_SOFT)
    px(d, 6, 8, 5, 2, "#fff0a8", 160)
    cloud(d, "#d7e2df", "#9bb2b0")
    px(d, 21, 22, 5, 2, "#7f9694", 125)
    return img


def draw_rain() -> Image.Image:
    img, d = canvas()
    cloud(d, "#aebfc2", "#6c8589", x=4, y=9)
    for x, y in [(8, 24), (14, 22), (20, 24), (25, 22)]:
        raindrop(d, x, y)
    return img


def draw_fog() -> Image.Image:
    img, d = canvas()
    cloud(d, "#d8ddd0", "#9aa791", x=5, y=7)
    for x, y, w, c in [(4, 22, 21, "#e9ecd8"), (8, 25, 20, "#cfd8c7"), (2, 28, 24, "#f6f1d4")]:
        px(d, x, y, w, 2, INK_SOFT, 120)
        px(d, x + 1, y, w - 2, 1, c, 230)
    return img


def draw_overcast() -> Image.Image:
    img, d = canvas()
    cloud(d, "#87959a", "#52646b", x=3, y=8, dark="#2d2a2b")
    cloud(d, "#b4c0c1", "#718385", x=7, y=13, dark=INK_SOFT)
    px(d, 10, 25, 13, 2, "#48575b", 125)
    return img


def draw_storm() -> Image.Image:
    img, d = canvas()
    cloud(d, "#697b84", "#394a52", x=4, y=8, dark="#251d1c")
    for x, y in [(8, 24), (23, 23)]:
        raindrop(d, x, y, "#5fb6d0")
    d.polygon([(16, 20), (21, 20), (18, 25), (23, 25), (14, 31), (17, 25), (13, 25)], fill=color(INK_SOFT))
    d.polygon([(17, 20), (20, 20), (17, 25), (21, 25), (15, 30), (18, 24), (15, 24)], fill=color("#f4d94f"))
    px(d, 18, 21, 2, 2, "#fff5a6", 170)
    return img


ICONS = {
    "weatherSunny": draw_sunny,
    "weatherCloudy": draw_cloudy,
    "weatherRain": draw_rain,
    "weatherFog": draw_fog,
    "weatherOvercast": draw_overcast,
    "weatherStorm": draw_storm,
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
    print(f"generated {len(entries)} weather icons in {OUT}")


if __name__ == "__main__":
    main()
