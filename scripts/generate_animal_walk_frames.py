from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "pixel"
MANIFEST = OUT / "manifest.json"
SOURCE = "generated-animal-walk-frames"
FRAME_COUNT = 4

ANIMALS: dict[str, str] = {
    "muntjac": "quadruped",
    "pangolin": "quadruped",
    "blackBear": "quadruped",
    "redstart": "bird",
    "streamfish": "fish",
    "firefly": "firefly",
    "magpie": "bird",
    "landcrab": "crab",
    "butterfly": "butterfly",
    "leopardCat": "quadruped",
    "macaque": "macaque",
    "otter": "otter",
    "treefrog": "hopper",
    "greenTurtle": "turtle",
    "blackKite": "bird",
}


@dataclass(frozen=True)
class Motion:
    dx: int = 0
    dy: int = 0
    scale_x: float = 1.0
    scale_y: float = 1.0
    shadow_alpha: int = 26


MOTIONS: dict[str, tuple[Motion, ...]] = {
    "quadruped": (
        Motion(0, 0, 1.00, 1.00, 24),
        Motion(-1, -2, 0.985, 1.018, 18),
        Motion(0, 0, 1.014, 0.988, 28),
        Motion(1, -2, 0.985, 1.018, 18),
    ),
    "bird": (
        Motion(0, -1, 1.00, 1.00, 18),
        Motion(-1, -4, 0.965, 1.055, 12),
        Motion(0, -1, 1.035, 0.975, 20),
        Motion(1, 1, 0.985, 0.998, 24),
    ),
    "fish": (
        Motion(0, 0, 1.00, 1.00, 10),
        Motion(-1, -1, 0.992, 1.014, 8),
        Motion(0, 0, 1.014, 0.992, 10),
        Motion(1, 1, 0.992, 1.014, 8),
    ),
    "firefly": (
        Motion(0, -1, 1.00, 1.00, 0),
        Motion(-1, -3, 0.972, 1.045, 0),
        Motion(0, -1, 1.025, 0.984, 0),
        Motion(1, 0, 0.982, 1.018, 0),
    ),
    "butterfly": (
        Motion(0, -1, 1.00, 1.00, 10),
        Motion(-1, -4, 0.925, 1.075, 7),
        Motion(0, -1, 1.045, 0.975, 12),
        Motion(1, 1, 0.940, 1.025, 14),
    ),
    "crab": (
        Motion(0, 0, 1.00, 1.00, 24),
        Motion(-2, -1, 1.025, 0.995, 20),
        Motion(0, 0, 0.985, 1.010, 25),
        Motion(2, -1, 1.025, 0.995, 20),
    ),
    "climber": (
        Motion(0, 0, 1.00, 1.00, 24),
        Motion(-1, -3, 0.982, 1.030, 18),
        Motion(0, -1, 1.024, 0.992, 23),
        Motion(1, -2, 0.990, 1.020, 19),
    ),
    "macaque": (
        Motion(0, 0, 1.00, 1.00, 24),
        Motion(-1, -1, 1.00, 1.00, 20),
        Motion(0, 0, 1.00, 1.00, 26),
        Motion(1, -1, 1.00, 1.00, 20),
    ),
    "hopper": (
        Motion(0, 1, 1.045, 0.955, 30),
        Motion(-1, -5, 0.955, 1.065, 12),
        Motion(0, -3, 0.985, 1.025, 16),
        Motion(1, 0, 1.020, 0.982, 25),
    ),
    "turtle": (
        Motion(0, 0, 1.00, 1.00, 22),
        Motion(-1, -1, 1.020, 0.990, 18),
        Motion(0, 0, 0.992, 1.012, 23),
        Motion(1, 1, 1.020, 0.990, 18),
    ),
    "otter": (
        Motion(0, 0, 1.00, 1.00, 20),
        Motion(-1, -1, 1.018, 0.992, 16),
        Motion(0, 0, 0.990, 1.016, 22),
        Motion(1, 1, 1.018, 0.992, 16),
    ),
}


def alpha_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    return img.getchannel("A").getbbox() or (0, 0, img.width, img.height)


def pad_box(box: tuple[int, int, int, int], pad: int, size: tuple[int, int]) -> tuple[int, int, int, int]:
    left, top, right, bottom = box
    width, height = size
    return max(0, left - pad), max(0, top - pad), min(width, right + pad), min(height, bottom + pad)


def clipped_composite(out: Image.Image, img: Image.Image, dx: int = 0, dy: int = 0) -> None:
    left = max(0, -dx)
    top = max(0, -dy)
    right = min(img.width, out.width - dx)
    bottom = min(img.height, out.height - dy)
    if right <= left or bottom <= top:
        return
    out.alpha_composite(img.crop((left, top, right, bottom)), (dx + left, dy + top))


def scale_image(
    img: Image.Image,
    scale_x: float,
    scale_y: float,
    resample: Image.Resampling = Image.Resampling.BICUBIC,
) -> Image.Image:
    width = max(1, round(img.width * scale_x))
    height = max(1, round(img.height * scale_y))
    if width == img.width and height == img.height:
        return img.copy()
    return img.resize((width, height), resample)


def draw_shadow(out: Image.Image, box: tuple[int, int, int, int], motion: Motion) -> None:
    if motion.shadow_alpha <= 0:
        return
    left, top, right, bottom = box
    width = right - left
    height = bottom - top
    shadow_w = max(8, round(width * 0.56 * motion.scale_x))
    shadow_h = max(3, round(height * 0.075))
    cx = round((left + right) / 2 + motion.dx)
    y = min(out.height - shadow_h, bottom - max(1, shadow_h // 2))
    draw = ImageDraw.Draw(out)
    draw.ellipse(
        [cx - shadow_w // 2, y, cx + shadow_w // 2, y + shadow_h],
        fill=(42, 34, 25, motion.shadow_alpha),
    )


def body_frame(img: Image.Image, motion: Motion, pad: int = 3) -> Image.Image:
    box = alpha_bbox(img)
    crop_box = pad_box(box, pad, img.size)
    piece = img.crop(crop_box)
    scaled = scale_image(piece, motion.scale_x, motion.scale_y)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_shadow(out, box, motion)
    crop_left, crop_top, crop_right, crop_bottom = crop_box
    center_x = (crop_left + crop_right) / 2 + motion.dx
    foot_y = crop_bottom + motion.dy
    x = round(center_x - scaled.width / 2)
    y = round(foot_y - scaled.height)
    clipped_composite(out, scaled, x, y)
    return out


def add_region_motion(
    out: Image.Image,
    img: Image.Image,
    rect: tuple[int, int, int, int],
    dx: int = 0,
    dy: int = 0,
    scale_x: float = 1.0,
    scale_y: float = 1.0,
    resample: Image.Resampling = Image.Resampling.BICUBIC,
) -> None:
    left, top, right, bottom = rect
    left = max(0, left)
    top = max(0, top)
    right = min(img.width, right)
    bottom = min(img.height, bottom)
    if right <= left or bottom <= top:
        return
    piece = img.crop((left, top, right, bottom))
    scaled = scale_image(piece, scale_x, scale_y, resample)
    x = round((left + right) / 2 + dx - scaled.width / 2)
    y = round(bottom + dy - scaled.height)
    clipped_composite(out, scaled, x, y)


def fish_frame(img: Image.Image, frame: int) -> Image.Image:
    left, top, right, bottom = alpha_bbox(img)
    w = right - left
    motion = MOTIONS["fish"][frame]
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw_shadow(out, (left, top, right, bottom), motion)

    tail_left = left + round(w * 0.68)
    body = img.crop((0, 0, min(img.width, tail_left + 4), img.height))
    clipped_composite(out, body, motion.dx, motion.dy)

    sway = (-4, 2, 4, -2)[frame]
    add_region_motion(
        out,
        img,
        (tail_left - 2, top, right, bottom),
        dx=motion.dx + sway,
        dy=motion.dy + (0, -1, 0, 1)[frame],
        scale_x=(1.04, 0.98, 1.04, 0.98)[frame],
        scale_y=(0.98, 1.02, 0.98, 1.02)[frame],
        resample=Image.Resampling.NEAREST,
    )
    return out


def add_tail_sway(out: Image.Image, img: Image.Image, frame: int, width_ratio: float = 0.28) -> None:
    left, top, right, bottom = alpha_bbox(img)
    w = right - left
    tail_left = left + round(w * (1 - width_ratio))
    sway = (-2, 1, 2, -1)[frame]
    add_region_motion(
        out,
        img,
        (tail_left, top, right, bottom),
        dx=sway,
        dy=(0, -1, 0, 1)[frame],
        scale_x=(1.06, 0.98, 1.06, 0.98)[frame],
        scale_y=(0.98, 1.02, 0.98, 1.02)[frame],
    )


def add_wing_pulse(out: Image.Image, img: Image.Image, frame: int, width_ratio: float = 0.52) -> None:
    left, top, right, bottom = alpha_bbox(img)
    h = bottom - top
    upper = (left, top, right, top + round(h * width_ratio))
    add_region_motion(
        out,
        img,
        upper,
        dx=(-1, 0, 1, 0)[frame],
        dy=(0, -2, 0, 1)[frame],
        scale_x=(1.00, 0.96, 1.04, 0.98)[frame],
        scale_y=(1.00, 1.08, 0.97, 1.02)[frame],
    )


def add_firefly_glow(out: Image.Image, img: Image.Image, frame: int) -> Image.Image:
    left, top, right, bottom = alpha_bbox(img)
    w = right - left
    h = bottom - top
    glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow)
    cx = left + round(w * 0.52)
    cy = top + round(h * 0.66) + (-1, -3, -1, 0)[frame]
    alpha = (48, 92, 72, 56)[frame]
    draw.ellipse([cx - 13, cy - 11, cx + 13, cy + 11], fill=(255, 232, 92, alpha))
    draw.ellipse([cx - 6, cy - 5, cx + 6, cy + 5], fill=(255, 245, 134, min(180, alpha + 72)))
    glow.alpha_composite(out)
    return glow


def make_frame(img: Image.Image, mode: str, frame: int) -> Image.Image:
    if mode == "fish":
        return fish_frame(img, frame)

    motion = MOTIONS.get(mode, MOTIONS["quadruped"])[frame]
    out = body_frame(img, motion)

    if mode == "otter":
        add_tail_sway(out, img, frame, 0.24)
    elif mode == "bird":
        add_wing_pulse(out, img, frame)
    elif mode == "butterfly":
        add_wing_pulse(out, img, frame, 0.82)
    elif mode == "firefly":
        add_wing_pulse(out, img, frame, 0.70)
        out = add_firefly_glow(out, img, frame)
    elif mode == "turtle":
        left, top, right, bottom = alpha_bbox(img)
        w = right - left
        h = bottom - top
        flipper_y = top + round(h * 0.48)
        add_region_motion(
            out,
            img,
            (left, flipper_y, right, bottom),
            dx=(-1, 1, 1, -1)[frame],
            dy=(0, -1, 1, 0)[frame],
            scale_x=(1.03, 0.99, 1.03, 0.99)[frame],
            scale_y=(0.99, 1.02, 0.99, 1.02)[frame],
        )
    elif mode in {"quadruped", "crab", "climber", "hopper", "macaque"}:
        left, top, right, bottom = alpha_bbox(img)
        h = bottom - top
        add_region_motion(
            out,
            img,
            (left, top + round(h * 0.58), right, bottom),
            dx=(-1, 1, 1, -1)[frame],
            dy=(0, -1, 0, -1)[frame],
            scale_x=(1.01, 1.00, 1.01, 1.00)[frame] if mode == "macaque" else (1.02, 0.99, 1.02, 0.99)[frame],
            scale_y=(1.00, 1.01, 1.00, 1.01)[frame] if mode == "macaque" else (0.99, 1.02, 0.99, 1.02)[frame],
        )

    return out


def make_frames() -> list[dict[str, object]]:
    entries: list[dict[str, object]] = []
    for name, mode in ANIMALS.items():
        src = OUT / f"{name}.png"
        if not src.exists():
            raise FileNotFoundError(src)
        img = Image.open(src).convert("RGBA")
        for frame_index in range(FRAME_COUNT):
            asset_index = frame_index + 1
            frame_name = f"{name}Walk{asset_index}"
            file_name = f"{name}_walk{asset_index}.png"
            frame = make_frame(img, mode, frame_index)
            frame.save(OUT / file_name)
            entries.append({"name": frame_name, "file": file_name, "size": list(frame.size), "source": SOURCE})
    return entries


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
        "Deprecated: animal walk frames now come from ChatGPT Images sheets. "
        "Run scripts/slice_chatgpt_animal_assets.py instead."
    )


if __name__ == "__main__":
    main()
