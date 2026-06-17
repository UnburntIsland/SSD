#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
森循島 v2 — pixel art + island map generator.

Generates all game art procedurally (cohesive warm cozy palette), the
Taiwan-shaped island tilemap, a base64 asset manifest for single-file
embedding, and preview sheets for visual verification.

Run:  python3 scripts/gen_assets.py
Outputs:
  assets/v2/*.png          individual art assets (for reference)
  build/assets_b64.json    { name: "data:image/png;base64,..." }
  build/island.json        island map data (terrain/object/region grids)
  assets/v2/_preview_*.png  contact sheets for QA
"""
import os, json, base64, random, math, io
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT  = os.path.join(ROOT, "assets", "v2")
BUILD = os.path.join(ROOT, "build")
os.makedirs(OUT, exist_ok=True)
os.makedirs(BUILD, exist_ok=True)

TILE = 32
ASSETS = {}   # name -> PIL.Image (RGBA)

def reg(name, img):
    img = img.convert("RGBA")
    img.save(os.path.join(OUT, name + ".png"))
    ASSETS[name] = img
    return img

def C(*a):
    """color helper -> (r,g,b,255) or pass-through 4-tuple"""
    if len(a) == 1: a = a[0]
    if len(a) == 3: return (a[0], a[1], a[2], 255)
    return tuple(a)

# ---------------------------------------------------------------- palette
SEA_DEEP  = (38, 96, 128); SEA_DEEP2 = (46, 110, 144); SEA_DEEP3 = (32, 84, 114)
SEA_SHAL  = (78, 162, 186); SEA_SHAL2 = (104, 188, 206)
FOAM      = (222, 244, 242)
SAND      = (230, 212, 160); SAND_D = (208, 186, 130); SAND_L = (242, 228, 188)
GRASS     = (124, 170, 80); GRASS_D = (104, 150, 66); GRASS_L = (148, 191, 101)
MEADOW    = (138, 182, 92)
FOREST    = (80, 122, 58); FOREST_D = (62, 102, 47); FOREST_L = (100, 144, 73)
MOUNT     = (142, 132, 116); MOUNT_D = (112, 103, 90); MOUNT_L = (172, 162, 145)
BADLAND   = (192, 196, 195); BADLAND_D = (146, 153, 156); BADLAND_L = (213, 217, 216)
BADLAND_W = (231, 235, 235); BADLAND_SH = (168, 175, 177); DRY_GRASS = (150, 146, 104)
SIZIWAN_SAND = (226, 198, 132); SIZIWAN_SAND_L = (245, 222, 164); SIZIWAN_REEF = (112, 111, 103)
SIZIWAN_WATER = (72, 166, 178); SIZIWAN_FOAM = (226, 246, 236)
SHOUSHAN     = (74, 128, 68); SHOUSHAN_D = (50, 96, 54); SHOUSHAN_L = (106, 158, 82)
LIMESTONE    = (178, 178, 162); LIMESTONE_D = (128, 126, 112); LIMESTONE_L = (218, 216, 196)
SNOW      = (235, 238, 238)
TRUNK     = (112, 76, 45); TRUNK_D = (84, 55, 32)
CANOPY    = (74, 124, 60); CANOPY_D = (56, 100, 46); CANOPY_L = (104, 156, 80)
PINE      = (66, 112, 66); PINE_D = (48, 90, 52); PINE_L = (92, 140, 84)
ROCK      = (150, 146, 138); ROCK_D = (116, 112, 104); ROCK_L = (184, 180, 170)

# room
WOOD   = (183, 133, 82); WOOD_D = (158, 112, 66); WOOD_L = (201, 152, 98); WOOD_GAP = (138, 96, 56)
WALL   = (214, 196, 162); WALL_D = (193, 174, 140); WALL_HI = (230, 214, 182)
WAIN   = (152, 110, 72); WAIN_D = (126, 88, 56)
RUG    = (178, 86, 64); RUG_D = (150, 66, 48); RUG_L = (204, 122, 98); RUG_PAT = (234, 208, 152)
TBL    = (158, 110, 64); TBL_D = (126, 84, 46); TBL_L = (186, 138, 86)
PAGE   = (246, 234, 202); PAGE_D = (230, 214, 172); PAGE_SH = (214, 196, 150)
LEATHER= (124, 76, 48); LEATHER_D = (94, 56, 34); LEATHER_L = (150, 98, 64)
GOLD   = (208, 168, 92); GOLD_L = (236, 206, 132)
LEAFG  = (108, 156, 78); LEAFG_D = (84, 128, 62); POT = (170, 96, 64); POT_D = (140, 74, 48)

# character
SKIN = (240, 197, 152); SKIN_SH = (214, 168, 124)
HAIR = (92, 60, 38); HAIR_L = (120, 82, 52)
SHIRT = (94, 158, 87); SHIRT_D = (72, 130, 68); SHIRT_L = (120, 184, 110)
PANTS = (92, 108, 140); PANTS_D = (72, 86, 116)
SHOE = (58, 46, 38); OUTLINE = (44, 38, 34)
PACK = (162, 122, 70); PACK_D = (132, 96, 52)

def noise(img, rng, palette_probs, exclude_alpha0=True):
    """palette_probs: list of (color_rgb, prob)"""
    px = img.load(); w, h = img.size
    for y in range(h):
        for x in range(w):
            if exclude_alpha0 and px[x, y][3] == 0: continue
            r = rng.random(); acc = 0
            for col, p in palette_probs:
                acc += p
                if r < acc:
                    px[x, y] = C(col); break

def fill(w, h, col):
    return Image.new("RGBA", (w, h), C(col))

# ================================================================ TILES
def tile_sea(deep=True, seed=1):
    rng = random.Random(seed)
    base = SEA_DEEP if deep else SEA_SHAL
    lite = SEA_DEEP2 if deep else SEA_SHAL2
    dark = SEA_DEEP3 if deep else SEA_SHAL
    img = fill(TILE, TILE, base)
    d = ImageDraw.Draw(img)
    noise(img, rng, [(lite, 0.05), (dark, 0.05)])      # subtle mottle, no harsh bands
    for _ in range(6):                                  # short broken wavelets
        x = rng.randint(0, TILE-8); y = rng.randint(0, TILE-1); w = rng.randint(3, 7)
        d.line([(x, y), (x+w, y)], fill=C(lite))
    for _ in range(3):
        x = rng.randint(0, TILE-6); y = rng.randint(0, TILE-1)
        d.line([(x, y), (x+rng.randint(2, 5), y)], fill=C(dark))
    for _ in range(2 if deep else 3):                   # sparkle
        d.point((rng.randint(1, TILE-2), rng.randint(1, TILE-2)), fill=C(SEA_SHAL2 if deep else FOAM))
    return img

def tile_sand(seed=2):
    rng = random.Random(seed)
    img = fill(TILE, TILE, SAND)
    noise(img, rng, [(SAND_D, 0.10), (SAND_L, 0.10)])
    d = ImageDraw.Draw(img)
    for _ in range(5):  # pebbles
        x, y = rng.randint(1, TILE-3), rng.randint(1, TILE-3)
        d.rectangle([x, y, x+1, y+1], fill=C(SAND_D if rng.random() < .5 else SAND_L))
    return img

def tile_grass(seed=3, base=GRASS, dark=GRASS_D, light=GRASS_L):
    rng = random.Random(seed)
    img = fill(TILE, TILE, base)
    noise(img, rng, [(dark, 0.12), (light, 0.10)])
    d = ImageDraw.Draw(img)
    for _ in range(14):  # blades
        x, y = rng.randint(0, TILE-1), rng.randint(2, TILE-1)
        col = dark if rng.random() < .55 else light
        d.line([(x, y), (x, y-rng.randint(1, 2))], fill=C(col))
    return img

def tile_forestfloor(seed=4):
    img = tile_grass(seed, base=FOREST, dark=FOREST_D, light=FOREST_L)
    rng = random.Random(seed+9)
    d = ImageDraw.Draw(img)
    for _ in range(3):  # leaf litter
        x, y = rng.randint(2, TILE-3), rng.randint(2, TILE-3)
        d.rectangle([x, y, x+1, y], fill=C(TRUNK))
    return img

def tile_meadow(seed=7):
    img = tile_grass(seed, base=MEADOW, dark=GRASS_D, light=(176,206,128))
    rng = random.Random(seed+5); d = ImageDraw.Draw(img)
    for _ in range(4):  # tiny flowers
        x, y = rng.randint(2, TILE-3), rng.randint(2, TILE-3)
        col = rng.choice([(246,232,140),(240,240,244),(232,150,170)])
        d.point((x, y), fill=C(col))
    return img

def tile_mountain(seed=5):
    rng = random.Random(seed)
    img = fill(TILE, TILE, MOUNT)
    noise(img, rng, [(MOUNT_D, 0.16), (MOUNT_L, 0.12)])
    d = ImageDraw.Draw(img)
    for _ in range(4):  # cracks
        x, y = rng.randint(2, TILE-4), rng.randint(2, TILE-6)
        d.line([(x, y), (x+rng.randint(-2,2), y+rng.randint(3,6))], fill=C(MOUNT_D))
    return img

def tile_moon_badland(seed=6):
    # 田寮/草山月世界:青灰色泥岩/砂岩/頁岩惡地(白堊土感)。冷灰底 + 近垂直的雨蝕溝,
    # 不含任何三角形(原本每格烤入的三角外框是「滿地灰三角」的元兇)。
    rng = random.Random(seed)
    img = fill(TILE, TILE, BADLAND)
    noise(img, rng, [(BADLAND_L, 0.14), (BADLAND_D, 0.07), (BADLAND_SH, 0.06)])
    d = ImageDraw.Draw(img)
    # 近垂直的雨蝕溝:暗溝 + 西側脊高光;接近全高,平鋪後縱向相連成連續溝紋
    for _ in range(7):
        x = rng.randint(0, TILE-1)
        pts = []
        for y in range(-2, TILE+3, rng.randint(3, 5)):
            x = max(0, min(TILE-1, x + rng.randint(-1, 1)))
            pts.append((x, y))
        if len(pts) > 1:
            d.line([(px+1, py) for px, py in pts], fill=C(BADLAND_W), width=1)
            d.line(pts, fill=C(BADLAND_D), width=1)
    # 風化顆粒
    for _ in range(8):
        x, y = rng.randint(0, TILE-1), rng.randint(0, TILE-1)
        d.point((x, y), fill=C(rng.choice([BADLAND_L, BADLAND_SH])))
    # 谷地零星枯草(極少、偏冷)
    for _ in range(3):
        x, y = rng.randint(1, TILE-2), rng.randint(3, TILE-1)
        d.line([(x, y), (x, y-2)], fill=C(DRY_GRASS))
    return img

def tile_siziwan_shore(seed=8):
    # 西子灣金沙灘:乾淨、可無縫平鋪的金色沙面。不再把方向性海浪弧烤進貼圖,
    # 否則寬沙灘整片平鋪會變成重複的條紋。真正的浪花白沫改由遊戲端水陸交界
    # 的 foam 程式(只畫在實際水線上)即時繪製。
    rng = random.Random(seed)
    img = fill(TILE, TILE, SIZIWAN_SAND)
    noise(img, rng, [(SIZIWAN_SAND_L, 0.16), (SAND_D, 0.06), (SIZIWAN_REEF, 0.016)])
    d = ImageDraw.Draw(img)
    for _ in range(4):                              # 細微風吹沙紋(短線,平鋪不接縫)
        x, y = rng.randint(0, TILE-9), rng.randint(2, TILE-3)
        d.line([(x, y), (x+rng.randint(4, 8), y)], fill=C(SIZIWAN_SAND_L))
    for _ in range(3):                              # 幾顆貝殼/小石
        x, y = rng.randint(1, TILE-2), rng.randint(1, TILE-2)
        d.point((x, y), fill=C(SIZIWAN_REEF))
    return img

def tile_shoushan_hill(seed=9):
    # 壽山:森林綠丘陵。移除原本每格烤入的灰色石灰岩三角形(平鋪會變滿地三角);
    # 石灰岩特徵改由地圖上零星的 rock 物件呈現,地表保持乾淨的綠丘草紋。
    rng = random.Random(seed)
    img = tile_grass(seed, base=SHOUSHAN, dark=SHOUSHAN_D, light=SHOUSHAN_L)
    d = ImageDraw.Draw(img)
    for _ in range(12):
        x, y = rng.randint(1, TILE-2), rng.randint(2, TILE-1)
        d.line([(x, y), (x+rng.choice([-1, 0, 1]), y-2)], fill=C(SHOUSHAN_D))
    return img

# ================================================================ OBJECTS
def obj_tree(seed=11):
    rng = random.Random(seed)
    W, H = 40, 52
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    cx = W//2
    # trunk
    d.rectangle([cx-3, H-18, cx+2, H-2], fill=C(TRUNK))
    d.rectangle([cx-3, H-18, cx-2, H-2], fill=C(TRUNK_D))
    # canopy: stacked blobs
    blobs = [(cx, 16, 17), (cx-9, 22, 12), (cx+9, 22, 12), (cx, 26, 16), (cx-6, 12, 10), (cx+6, 12, 10)]
    for (bx, by, r) in blobs:
        d.ellipse([bx-r, by-r, bx+r, by+r], fill=C(CANOPY))
    # shading bottom-right / highlight top-left
    for (bx, by, r) in blobs:
        d.ellipse([bx-r, by-r+3, bx+r-2, by+r], fill=C(CANOPY_D), outline=None)
        d.ellipse([bx-r+1, by-r+1, bx, by-r+6], fill=C(CANOPY_L))
    # leaf speckle
    px = img.load()
    for _ in range(70):
        x, y = rng.randint(4, W-4), rng.randint(2, 38)
        if px[x, y][3] > 0:
            px[x, y] = C(rng.choice([CANOPY_L, CANOPY_D, CANOPY]))
    return img

def obj_pine(seed=12):
    rng = random.Random(seed)
    W, H = 34, 54
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img); cx = W//2
    d.rectangle([cx-2, H-12, cx+2, H-2], fill=C(TRUNK))
    tiers = [(8, 6), (16, 10), (26, 15), (38, 19)]
    ty = 6
    for (cy, half) in tiers:
        d.polygon([(cx, ty), (cx-half, cy), (cx+half, cy)], fill=C(PINE))
        d.polygon([(cx, ty+2), (cx-half+3, cy), (cx+1, cy)], fill=C(PINE_L))
        d.polygon([(cx, cy-3), (cx+half, cy), (cx-2, cy)], fill=C(PINE_D))
        ty = cy - 4
    return img

def obj_rock(seed=13):
    rng = random.Random(seed)
    W, H = 26, 20
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    d.ellipse([2, 6, W-2, H-1], fill=C(ROCK))
    d.ellipse([2, 6, W-2, H-1], outline=C(ROCK_D))
    d.chord([2, 4, W-2, H-3], 180, 360, fill=C(ROCK_L))
    d.ellipse([6, 10, 14, 16], fill=C(ROCK_D))
    return img

def obj_bush(seed=14):
    rng = random.Random(seed)
    W, H = 26, 20
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    for (bx, by, r) in [(8, 12, 7), (17, 12, 7), (13, 9, 7)]:
        d.ellipse([bx-r, by-r, bx+r, by+r], fill=C(CANOPY))
    d.ellipse([5, 10, 12, 17], fill=C(CANOPY_L))
    px = img.load()
    for _ in range(20):
        x, y = rng.randint(3, W-3), rng.randint(3, H-3)
        if px[x, y][3] > 0: px[x, y] = C(rng.choice([CANOPY_L, CANOPY_D]))
    # tiny berries
    for _ in range(3):
        x, y = rng.randint(4, W-5), rng.randint(5, H-5)
        d.point((x, y), fill=C((212, 96, 88)))
    return img

def obj_palm(seed=15):
    """beach palm for tropical south coast"""
    W, H = 40, 54
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img); cx = W//2
    # curved trunk
    for i in range(20):
        x = cx + int(3*math.sin(i*0.25)); y = H-2-i
        d.rectangle([x-2, y-1, x+1, y], fill=C(TRUNK if i%2 else TRUNK_D))
    top = (cx+2, H-22)
    fronds = [(-16,-6),(-14,6),(16,-6),(14,8),(0,-14),(-8,-12),(8,-12)]
    for (dx, dy) in fronds:
        d.line([top, (top[0]+dx, top[1]+dy)], fill=C(PINE), width=3)
        d.line([top, (top[0]+dx, top[1]+dy)], fill=C(PINE_L), width=1)
    d.ellipse([top[0]-4, top[1]-4, top[0]+4, top[1]+4], fill=C(PINE_D))
    # coconuts
    for c in [(-3,2),(3,2),(0,4)]:
        d.ellipse([top[0]+c[0]-2, top[1]+c[1]-2, top[0]+c[0]+2, top[1]+c[1]+2], fill=C((120,86,46)))
    return img

# ================================================================ CHARACTER
def draw_char(dirn, phase):
    """dirn in {down,up,left,right}; phase 0..3 walk cycle. Returns 32x40 RGBA, feet at (16,39)."""
    W, H = 32, 40
    img = Image.new("RGBA", (W, H), (0,0,0,0))
    d = ImageDraw.Draw(img)
    cx = 16
    # walk leg/arm offsets
    swing = [0, 3, 0, -3][phase]
    bob = [0, -1, 0, -1][phase]
    def box(x0, y0, x1, y1, fillc, ol=True):
        d.rectangle([x0, y0, x1, y1], fill=C(fillc), outline=C(OUTLINE) if ol else None)

    legtop = 30 + bob
    # ----- legs (drawn first, behind torso)
    if dirn in ("down", "up"):
        lx, rx = cx-5, cx+1
        d.rectangle([lx, legtop-swing*0, lx+4, 38], fill=C(PANTS), outline=C(OUTLINE))
        d.rectangle([rx, legtop, rx+4, 38], fill=C(PANTS), outline=C(OUTLINE))
        # feet
        d.rectangle([lx, 37, lx+4, 38], fill=C(SHOE))
        d.rectangle([rx, 37, rx+4, 38], fill=C(SHOE))
        # add step: shift one leg forward via shading
        if phase == 1: d.rectangle([lx, 36, lx+4, 38], fill=C(SHOE))
        if phase == 3: d.rectangle([rx, 36, rx+4, 38], fill=C(SHOE))
    else:  # side
        front = cx + (3 if dirn == "right" else -3)
        back  = cx + (-1 if dirn == "right" else 0)
        d.rectangle([back-2, legtop, back+2, 38], fill=C(PANTS_D), outline=C(OUTLINE))
        d.rectangle([front-2+swing*(1 if dirn=='right' else 1), legtop, front+2+swing*(1 if dirn=='right' else 1), 38], fill=C(PANTS), outline=C(OUTLINE))
        d.rectangle([front-2+swing, 37, front+2+swing, 38], fill=C(SHOE))
        d.rectangle([back-2, 37, back+2, 38], fill=C(SHOE))

    # ----- torso (shirt)
    ty0 = 18 + bob; ty1 = 31 + bob
    box(cx-6, ty0, cx+5, ty1, SHIRT)
    d.rectangle([cx-6, ty0, cx-4, ty1], fill=C(SHIRT_D))      # left shade
    d.rectangle([cx+3, ty0, cx+5, ty1], fill=C(SHIRT_D))
    d.rectangle([cx-3, ty0+1, cx+2, ty0+3], fill=C(SHIRT_L))  # collar light
    if dirn == "up":  # backpack
        box(cx-5, ty0+1, cx+4, ty1-2, PACK)
        d.rectangle([cx-5, ty0+1, cx-3, ty1-2], fill=C(PACK_D))

    # ----- arms
    ay = 19 + bob
    if dirn in ("down", "up"):
        d.rectangle([cx-9, ay-swing, cx-6, ay+8-swing], fill=C(SHIRT_D), outline=C(OUTLINE))
        d.rectangle([cx+5, ay+swing, cx+8, ay+8+swing], fill=C(SHIRT_D), outline=C(OUTLINE))
        # hands
        d.rectangle([cx-9, ay+7-swing, cx-6, ay+8-swing], fill=C(SKIN))
        d.rectangle([cx+5, ay+7+swing, cx+8, ay+8+swing], fill=C(SKIN))
    else:
        ax = cx + (4 if dirn == "right" else -7)
        d.rectangle([ax, ay+swing, ax+3, ay+8+swing], fill=C(SHIRT_D), outline=C(OUTLINE))
        d.rectangle([ax, ay+7+swing, ax+3, ay+8+swing], fill=C(SKIN))

    # ----- head
    hy0 = 5 + bob; hy1 = 18 + bob
    box(cx-6, hy0, cx+5, hy1, SKIN)
    # hair
    if dirn == "down":
        d.rectangle([cx-6, hy0, cx+5, hy0+4], fill=C(HAIR))
        d.rectangle([cx-6, hy0, cx-5, hy0+6], fill=C(HAIR))
        d.rectangle([cx+4, hy0, cx+5, hy0+6], fill=C(HAIR))
        d.rectangle([cx-3, hy0+1, cx+2, hy0+2], fill=C(HAIR_L))
        # eyes
        d.rectangle([cx-4, hy0+7, cx-3, hy0+8], fill=C(OUTLINE))
        d.rectangle([cx+2, hy0+7, cx+3, hy0+8], fill=C(OUTLINE))
        # cheeks
        d.point((cx-5, hy0+9), fill=C(SKIN_SH)); d.point((cx+4, hy0+9), fill=C(SKIN_SH))
        d.rectangle([cx-2, hy0+10, cx+1, hy0+11], fill=C(SKIN_SH))  # smile
    elif dirn == "up":
        d.rectangle([cx-6, hy0, cx+5, hy1-2], fill=C(HAIR))
        d.rectangle([cx-3, hy0+1, cx+2, hy0+2], fill=C(HAIR_L))
    else:
        fx = 1 if dirn == "right" else -1
        d.rectangle([cx-6, hy0, cx+5, hy0+4], fill=C(HAIR))
        if dirn == "right":
            d.rectangle([cx-6, hy0, cx-3, hy1], fill=C(HAIR))  # hair back
            d.rectangle([cx+2, hy0+7, cx+3, hy0+8], fill=C(OUTLINE))  # eye front
        else:
            d.rectangle([cx+2, hy0, cx+5, hy1], fill=C(HAIR))
            d.rectangle([cx-3, hy0+7, cx-2, hy0+8], fill=C(OUTLINE))
    return img

def build_player_sheet():
    dirs = ["down", "up", "left", "right"]
    frames = 4
    sheet = Image.new("RGBA", (32*frames, 40*len(dirs)), (0,0,0,0))
    for r, dn in enumerate(dirs):
        for c in range(frames):
            fr = draw_char(dn, c)
            sheet.paste(fr, (c*32, r*40), fr)
    reg("player_sheet", sheet)
    return {"frameW": 32, "frameH": 40, "frames": frames,
            "dirs": dirs, "footX": 16, "footY": 39}

# ================================================================ ROOM (modern bedroom)
M_FLOOR=(216,198,160); M_FLOOR_D=(196,176,138); M_FLOOR_L=(232,216,180); M_FGAP=(178,158,122)
M_WALL=(206,221,233); M_WALL_D=(185,202,217); M_WALL_HI=(227,237,245)
BEDF=(150,110,72); BEDF_D=(120,86,56); DUVET=(94,162,196); DUVET_D=(72,136,170); DUVET_L=(150,202,226)
SHEETC=(246,246,250); PILLOW=(252,252,254); PILLOW_D=(225,228,236)
DESKW=(238,238,242); DESKW_D=(210,210,216); DESKLEG=(200,200,206)
SCR=(44,52,68); SCR_ON=(126,200,228); SCR_ON2=(176,226,242); KEYB=(70,76,90)
CHAIRC=(72,80,96); CHAIRC_D=(52,58,72); CHAIR_AC=(214,98,86)
SHW=(210,182,142); SHW_D=(178,152,114)
RGM=(240,234,224); RGM2=(118,178,172); RGM3=(234,178,98); RGM_D=(206,200,190)
PLG=(98,170,98); PLG_D=(72,136,76); POTM=(236,236,240); POTM_D=(206,206,212)
WFR=(238,240,244); WSKY=(150,206,236); WSKY2=(188,226,246); CURT=(222,130,122); CURT_D=(194,104,98)
LMP=(240,232,150); LMP_AR=(84,90,104)
PSTR_A=(88,142,196); PSTR_B=(238,182,82); PSTR_FR=(248,248,250)
MGC=(120,90,184); MGC_D=(90,64,144); MGC_L=(176,148,228); MGC_GLOW=(196,176,255); MGOLD=(234,208,134)
CLK=(248,248,250); CLK_FR=(90,96,110)

def tile_floor(seed=21):
    rng=random.Random(seed); img=fill(TILE,TILE,M_FLOOR); d=ImageDraw.Draw(img); ph=16
    for i in range(0,TILE+ph,ph):
        d.line([(0,i),(TILE,i)],fill=C(M_FGAP)); d.line([(0,i+1),(TILE,i+1)],fill=C(M_FLOOR_L))
        for _ in range(4):
            gx=rng.randint(0,TILE-6); gy=i+rng.randint(2,ph-2); gl=rng.randint(5,12)
            d.line([(gx,gy),(min(TILE,gx+gl),gy)],fill=C(M_FLOOR_D if rng.random()<.6 else M_FLOOR_L))
    noise(img,rng,[(M_FLOOR_D,0.03)]); return img

def tile_wall(seed=22):
    img=fill(TILE,TILE,M_WALL); d=ImageDraw.Draw(img); rng=random.Random(seed); px=img.load()
    for x in range(TILE): px[x,0]=C(M_WALL_HI); px[x,1]=C(M_WALL_HI)
    for y in range(TILE):
        for x in range(TILE):
            if rng.random()<0.04: px[x,y]=C(M_WALL_D if rng.random()<.5 else M_WALL_HI)
    return img

def obj_bed(seed=31):
    W,H=60,108; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([5,H-8,W-5,H-1],fill=C(20,28,20,45))
    d.rounded_rectangle([2,5,W-3,H-3],radius=10,fill=C(BEDF),outline=C(BEDF_D),width=3)
    d.rounded_rectangle([6,10,W-7,H-9],radius=8,fill=C(SHEETC))
    d.rounded_rectangle([10,H-66,W-11,H-12],radius=8,fill=C(DUVET))
    d.rounded_rectangle([10,H-66,W-11,H-56],radius=6,fill=C(DUVET_L))
    for yy in range(H-54,H-18,11): d.line([(14,yy),(W-15,yy)],fill=C(DUVET_D))
    d.rounded_rectangle([13,14,W-14,38],radius=8,fill=C(PILLOW),outline=C(PILLOW_D))
    return img

def obj_desk(seed=32):
    W,H=75,52; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([5,H-6,W-5,H-1],fill=C(20,28,20,40))
    d.rectangle([2,8,W-3,31],fill=C(DESKW),outline=C(DESKW_D))
    d.rectangle([2,8,W-3,15],fill=C(255,255,255,150)); d.line([(2,31),(W-3,31)],fill=C(DESKW_D))
    d.rectangle([8,31,16,H-2],fill=C(DESKLEG)); d.rectangle([W-16,31,W-8,H-2],fill=C(DESKLEG))
    d.rectangle([W-34,13,W-10,27],fill=C(DESKW_D)); d.ellipse([W-24,17,W-18,23],fill=C(CHAIRC))
    return img

def obj_laptop(seed=33):
    W,H=40,30; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.polygon([(4,H-4),(W-4,H-4),(W-8,H-12),(8,H-12)],fill=C(KEYB))
    d.rectangle([9,2,W-9,H-12],fill=C(SCR),outline=C(CHAIRC_D))
    d.rectangle([11,4,W-11,H-15],fill=C(SCR_ON)); d.rectangle([11,4,W-11,8],fill=C(SCR_ON2)); return img

def obj_chair(seed=34):
    W,H=32,48; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rounded_rectangle([5,2,W-5,25],radius=5,fill=C(CHAIRC),outline=C(CHAIRC_D))
    d.rounded_rectangle([9,6,W-9,20],radius=3,fill=C(CHAIR_AC))
    d.rounded_rectangle([4,24,W-4,34],radius=5,fill=C(CHAIRC_D))
    d.rectangle([W//2-2,34,W//2+2,H-6],fill=C(CHAIRC_D)); d.ellipse([W//2-9,H-7,W//2+9,H-1],fill=C(CHAIRC_D))
    return img

def obj_shelf(seed=35):
    W,H=75,40; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rectangle([0,0,W-1,H-1],fill=C(SHW),outline=C(SHW_D)); d.rectangle([2,2,W-3,H-3],fill=C(SHW))
    d.rectangle([3,H-7,W-4,H-5],fill=C(SHW_D))
    rng=random.Random(seed); x=6
    while x<W-12:
        bw=rng.randint(5,9); bh=rng.randint(16,28)
        col=rng.choice([(214,96,86),(86,140,196),(98,170,110),(238,184,86),(150,120,196),(90,196,196)])
        d.rectangle([x,H-7-bh,x+bw,H-7],fill=C(col),outline=C((54,54,62))); x+=bw+2
    return img

def obj_rug(seed=36):
    W,H=120,80; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([2,2,W-2,H-2],fill=C(RGM),outline=C(RGM_D),width=2)
    d.ellipse([16,12,W-16,H-12],outline=C(RGM2),width=4)
    d.ellipse([34,24,W-34,H-24],fill=C(RGM3)); d.ellipse([48,33,W-48,H-33],fill=C(RGM)); return img

def obj_window(seed=37):
    W,H=82,58
    WFR=(238,240,244); WSKY=(150,206,236); WSKY2=(188,226,246); CURT=(222,130,122); CURT_D=(194,104,98)
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rectangle([0,0,W-1,H-1],fill=C(WFR),outline=C((210,210,216)))
    d.rectangle([6,6,W-7,H-7],fill=C(WSKY)); d.rectangle([6,6,W-7,H//2],fill=C(WSKY2))
    d.ellipse([14,12,38,28],fill=C(255,255,255,200)); d.ellipse([46,14,68,30],fill=C(255,255,255,180))
    d.line([(W//2,6),(W//2,H-7)],fill=C(WFR),width=3); d.line([(6,H//2),(W-7,H//2)],fill=C(WFR),width=3)
    d.rectangle([0,0,11,H-1],fill=C(CURT)); d.rectangle([W-11,0,W-1,H-1],fill=C(CURT))
    d.rectangle([0,0,4,H-1],fill=C(CURT_D)); d.rectangle([W-5,0,W-1,H-1],fill=C(CURT_D))
    return img

def obj_plant(seed=38):
    W,H=38,60; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img); cx=W//2
    d.rectangle([cx-11,H-21,cx+10,H-3],fill=C(POTM),outline=C(POTM_D)); d.rectangle([cx-11,H-21,cx+10,H-16],fill=C(POTM_D))
    for (dx,dy,r) in [(-9,22,10),(9,22,10),(0,14,11),(-5,8,9),(6,10,9)]: d.ellipse([cx+dx-r,dy-r,cx+dx+r,dy+r],fill=C(PLG))
    for (dx,dy,r) in [(-9,22,10),(9,22,10),(0,14,11)]: d.ellipse([cx+dx-r,dy-r+3,cx+dx+r-2,dy+r],fill=C(PLG_D))
    return img

def obj_lamp(seed=39):
    W,H=24,54; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img); cx=W//2
    d.ellipse([cx-8,H-7,cx+7,H-1],fill=C(LMP_AR)); d.line([(cx,H-4),(cx,21)],fill=C(LMP_AR),width=3)
    d.line([(cx,21),(cx+9,11)],fill=C(LMP_AR),width=3); d.polygon([(cx+2,13),(cx+16,11),(cx+11,1),(cx,3)],fill=C(LMP))
    return img

def obj_poster(seed=40,kind=0):
    W,H=40,52; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rectangle([0,0,W-1,H-1],fill=C(PSTR_FR),outline=C(CHAIRC_D))
    if kind==0:
        d.rectangle([3,3,W-4,H-4],fill=C(PSTR_A)); d.ellipse([10,14,30,40],fill=C((120,176,96))); d.ellipse([14,20,26,44],fill=C((96,150,80)))
    else:
        d.rectangle([3,3,W-4,H-4],fill=C(PSTR_B)); d.ellipse([W//2-9,12,W//2+9,30],fill=C((238,120,90)))
        for sx,sy in [(8,40),(20,44),(30,38)]: d.point((sx,sy),fill=C((255,255,255)))
    return img

def obj_clock(seed=41):
    W,H=22,22; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([1,1,W-2,H-2],fill=C(CLK),outline=C(CLK_FR),width=2)
    d.line([(W//2,H//2),(W//2,5)],fill=C(CLK_FR),width=2); d.line([(W//2,H//2),(W-6,H//2)],fill=C(CLK_FR),width=2); return img

def obj_beanbag(seed=42):
    W,H=40,30; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([2,8,W-2,H-2],fill=C((232,178,98)),outline=C((196,144,76)),width=2)
    d.chord([2,4,W-2,H-6],180,360,fill=C((244,196,120))); return img

def obj_dresser(seed=46):
    W,H=58,50; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([5,H-6,W-5,H-1],fill=C(20,28,20,40))
    d.rectangle([3,5,W-4,H-2],fill=C(SHW),outline=C(SHW_D)); d.rectangle([3,5,W-4,14],fill=C(M_FLOOR_L))
    for r in range(2):
        y0=18+r*14; d.rectangle([8,y0,W-9,y0+10],fill=C(M_FLOOR if r%2 else M_FLOOR_D),outline=C(SHW_D))
        d.ellipse([W//2-4,y0+3,W//2+4,y0+9],fill=C(SHW_D))
    return img

def obj_table(seed=49):
    W,H=90,68
    WD=(192,142,92); WD_D=(156,112,70); WD_L=(214,166,114)
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([7,H-9,W-7,H-1],fill=C(20,28,20,45))
    d.rectangle([14,40,23,H-3],fill=C(WD_D)); d.rectangle([W-23,40,W-14,H-3],fill=C(WD_D))
    d.rounded_rectangle([2,6,W-3,42],radius=10,fill=C(WD),outline=C(WD_D))
    d.rounded_rectangle([2,6,W-3,18],radius=10,fill=C(WD_L))
    rng=random.Random(seed)
    for _ in range(26):
        gx=rng.randint(10,W-18); gy=rng.randint(22,40); d.line([(gx,gy),(gx+rng.randint(5,13),gy)],fill=C(WD_D))
    return img

def obj_wardrobe(seed=47):
    W,H=65,116
    WD=(206,180,140); WD_D=(164,140,104); WD_L=(224,200,160)
    PANEL=(240,238,232); PANEL_D=(208,204,194); HANDLE=(110,100,84)
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([5,H-8,W-5,H-1],fill=C(20,28,20,45))
    d.polygon([(5,15),(25,6),(25,H-7),(5,H-3)],fill=C(WD_D))
    d.rounded_rectangle([22,5,W-3,H-3],radius=5,fill=C(WD),outline=C(WD_D))
    d.rectangle([22,5,W-3,14],fill=C(WD_L))
    fx0,fx1=27,W-7
    d.rectangle([fx0,16,fx1,H-12],fill=C(PANEL),outline=C(PANEL_D))
    midx=(fx0+fx1)//2; d.rectangle([midx,16,midx+1,H-12],fill=C(WD_D))
    d.rectangle([midx-5,H//2-14,midx-3,H//2+14],fill=C(HANDLE)); d.rectangle([midx+5,H//2-14,midx+7,H//2+14],fill=C(HANDLE))
    return img

def obj_door(seed=48):
    W,H=54,58
    FR=(176,150,112); FR_D=(138,114,82); DOOR=(222,212,192); DOOR_D=(196,186,166); KNOB=(208,168,92)
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rectangle([2,2,W-3,H-1],fill=C(FR_D))
    d.rectangle([6,5,W-7,H-1],fill=C(DOOR),outline=C(DOOR_D))
    d.rectangle([10,9,W-11,24],fill=C(DOOR_D)); d.rectangle([10,28,W-11,H-6],fill=C(DOOR_D))
    d.ellipse([W-16,H//2-2,W-12,H//2+2],fill=C(KNOB))
    return img

def _glow(img,cx,cy,r,col):
    g=Image.new("RGBA",img.size,(0,0,0,0)); ImageDraw.Draw(g).ellipse([cx-r,cy-r,cx+r,cy+r],fill=(col[0],col[1],col[2],95))
    return Image.alpha_composite(img,g.filter(ImageFilter.GaussianBlur(r*0.5)))

def obj_book_closed(seed=43):
    W,H=32,24
    ECO=(58,157,93); ECO_D=(40,120,70); CREAM=(245,239,216); CREAM_D=(214,206,176)
    SPUD=(199,151,97); SPUD_D=(160,118,72); LEAFC=(122,196,112)
    img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.ellipse([4,H-4,W-4,H-1],fill=C(20,28,20,50))
    d.rounded_rectangle([4,6,W-4,H-2],radius=2,fill=C(CREAM),outline=C(CREAM_D))
    d.rounded_rectangle([4,2,W-5,H-5],radius=2,fill=C(ECO),outline=C(ECO_D),width=2)
    d.rectangle([5,4,8,H-7],fill=C(ECO_D))
    d.rounded_rectangle([10,5,W-7,13],radius=1,fill=C(CREAM),outline=C(CREAM_D))
    cx=W//2; d.ellipse([cx-5,15,cx+1,20],fill=C(SPUD)); d.ellipse([cx+1,14,cx+6,19],fill=C(LEAFC))
    return img




def obj_book_open(seed=44):
    W,H=360,240; img=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(img)
    d.rounded_rectangle([4,8,W-4,H-4],radius=12,fill=C(MGC),outline=C(MGC_D),width=2)
    pad=16; cx=W//2
    d.rounded_rectangle([pad,pad,cx-3,H-pad],radius=6,fill=C(PAGE),outline=C(PAGE_SH))
    d.rounded_rectangle([cx+3,pad,W-pad,H-pad],radius=6,fill=C(PAGE),outline=C(PAGE_SH))
    d.rectangle([cx-6,pad,cx+6,H-pad],fill=C(MGC_D))
    for i in range(10):
        a=max(0,60-i*6)
        d.line([(cx-8-i,pad+2),(cx-8-i,H-pad-2)],fill=(150,130,90,a)); d.line([(cx+8+i,pad+2),(cx+8+i,H-pad-2)],fill=(150,130,90,a))
    return img

# ================================================================ FOG
def fog_puff(seed=40, tint=(214, 224, 234)):
    S = 96
    img = Image.new("RGBA", (S, S), (0,0,0,0))
    d = ImageDraw.Draw(img)
    rng = random.Random(seed)
    cx, cy = S//2, S//2
    for _ in range(7):
        r = rng.randint(20, 34)
        x = cx + rng.randint(-16, 16); y = cy + rng.randint(-12, 12)
        d.ellipse([x-r, y-r, x+r, y+r], fill=(tint[0], tint[1], tint[2], 70))
    img = img.filter(ImageFilter.GaussianBlur(7))
    # boost center opacity
    core = Image.new("RGBA", (S, S), (0,0,0,0))
    dc = ImageDraw.Draw(core)
    dc.ellipse([cx-26, cy-22, cx+26, cy+22], fill=(tint[0], tint[1], tint[2], 120))
    core = core.filter(ImageFilter.GaussianBlur(9))
    img = Image.alpha_composite(img, core)
    return img

# ================================================================ ISLAND MAP
# Terrain codes: 0 deep sea, 1 shallow sea, 2 sand, 3 grass, 4 forest, 5 mountain, 6 meadow, 7 badland, 8 bay shore, 9 coastal hill
def gen_island():
    import random as _r
    from collections import deque
    W=H=760                              # square map
    rng=_r.Random(2026)
    def smooth(n,amp,seed):
        r=_r.Random(seed); v=[r.uniform(-1,1) for _ in range(n)]; out=[]
        for i in range(H):
            t=i/(H-1)*(n-1); a=int(t); b=min(a+1,n-1); f=t-a; f=f*f*(3-2*f)
            out.append((v[a]*(1-f)+v[b]*f)*amp)
        return out
    # Taiwan coast profile: (t north->south, west half, east half) as fraction of maxHalf
    prof=[(0.00,0.10,0.08),(0.04,0.34,0.42),(0.10,0.50,0.50),(0.18,0.56,0.54),
          (0.28,0.72,0.60),(0.40,0.88,0.64),(0.50,0.98,0.66),(0.60,0.94,0.60),
          (0.70,0.80,0.52),(0.80,0.62,0.40),(0.88,0.44,0.27),(0.94,0.24,0.16),
          (0.98,0.10,0.08),(1.00,0.03,0.03)]
    def prof_at(t):
        for i in range(len(prof)-1):
            t0,l0,r0=prof[i]; t1,l1,r1=prof[i+1]
            if t0<=t<=t1:
                f=(t-t0)/(t1-t0) if t1>t0 else 0; f=f*f*(3-2*f)
                return l0+(l1-l0)*f, r0+(r1-r0)*f
        return prof[-1][1],prof[-1][2]
    cwob=smooth(20,4.0,11); wwob=smooth(30,6.0,12); ewob=smooth(26,3.0,13)
    YT0,YT1=0.055*H,0.93*H; maxHalf=W*0.20
    land=[[False]*W for _ in range(H)]; main=[[False]*W for _ in range(H)]; cxs=[None]*H
    for y in range(H):
        ty=(y-YT0)/(YT1-YT0)
        if ty<0 or ty>1: continue
        L,R=prof_at(ty)
        cx=W*0.50+(0.5-ty)*W*0.05+cwob[y]
        lh=L*maxHalf+wwob[y]; rh=R*maxHalf+ewob[y]; cxs[y]=cx
        for x in range(W):
            if (cx-lh)<=x<=cx or cx<x<=(cx+rh): land[y][x]=True; main[y][x]=True
    # offshore islands (Penghu west, Lanyu/Green SE, Guishan NE, Liuqiu SW)
    smalls=[(0.155*W,0.46*H,8),(0.125*W,0.40*H,4.5),(0.175*W,0.52*H,5.5),(0.10*W,0.49*H,3.5),
            (0.84*W,0.74*H,7),(0.80*W,0.66*H,4.5),(0.665*W,0.155*H,3.5),(0.305*W,0.85*H,4.5)]
    for (scx,scy,r) in smalls:
        for y in range(int(scy-r-2),int(scy+r+3)):
            for x in range(int(scx-r-2),int(scx+r+3)):
                if 0<=x<W and 0<=y<H:
                    dd=((x-scx)**2+(y-scy)**2)/(r*r)
                    if dd<=1.0+0.18*math.sin(x*1.2+y*0.8): land[y][x]=True
    # distance to sea
    INF=999; dist=[[INF]*W for _ in range(H)]; q=deque()
    for y in range(H):
        for x in range(W):
            if not land[y][x]: dist[y][x]=0; q.append((x,y))
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<W and 0<=ny<H and dist[ny][nx]>dist[y][x]+1:
                dist[ny][nx]=dist[y][x]+1; q.append((nx,ny))
    en=[[rng.uniform(-1.0,1.0) for _ in range(W)] for _ in range(H)]
    terr=[[0]*W for _ in range(H)]
    height=[[0]*W for _ in range(H)]
    for y in range(H):
        ty=(y-YT0)/(YT1-YT0)
        cxrow=cxs[y] if cxs[y] is not None else W*0.5
        for x in range(W):
            if not land[y][x]:
                adj=any(0<=x+dx<W and 0<=y+dy<H and land[y+dy][x+dx] for dx in(-1,0,1) for dy in(-1,0,1))
                terr[y][x]=1 if adj else 0
                height[y][x]=0
            else:
                d2=dist[y][x]
                if d2<=1:
                    terr[y][x]=2
                    height[y][x]=0
                elif main[y][x]:
                    ridge_main=cxrow+maxHalf*(0.10+0.04*math.sin(ty*math.pi*5.2))
                    ridge_west=cxrow-maxHalf*(0.24+0.05*math.sin(ty*math.pi*4.1))
                    ridge_east=cxrow+maxHalf*(0.34+0.03*math.sin(ty*math.pi*6.0))
                    spine=math.exp(-((x-ridge_main)/(W*0.078))**2)*(0.52+0.42*math.exp(-((ty-0.50)**2)/0.16))
                    foothill=0.38*math.exp(-((x-ridge_west)/(W*0.15))**2)*math.exp(-((ty-0.52)**2)/0.42)
                    east_hill=0.30*math.exp(-((x-ridge_east)/(W*0.105))**2)*math.exp(-((ty-0.48)**2)/0.30)
                    north_peak=0.30*math.exp(-((ty-0.20)**2)/0.030)*math.exp(-((x-ridge_main)/(W*0.12))**2)
                    south_peak=0.28*math.exp(-((ty-0.82)**2)/0.026)*math.exp(-((x-(cxrow+maxHalf*0.05))/(W*0.12))**2)
                    coast=max(0.0,min(1.0,(d2-1)/18.0))
                    texture=0.08*math.sin(x*0.075+y*0.045)+0.05*math.sin(x*0.19-y*0.11)+en[y][x]*0.055
                    e=max(0.0,(spine+foothill+east_hill+north_peak+south_peak)*coast*0.60+texture)
                    if e>0.76:
                        terr[y][x]=5; height[y][x]=5 if e<0.92 else 6
                    elif e>0.58:
                        terr[y][x]=5 if (x+y)%7==0 else 4; height[y][x]=4
                    elif e>0.40:
                        terr[y][x]=4; height[y][x]=3
                    elif e>0.25:
                        terr[y][x]=4 if (x*3+y)%9==0 else 3; height[y][x]=2
                    else:
                        terr[y][x]=6 if ((x+y)%11==0 and d2>8) else 3; height[y][x]=1
                else:
                    terr[y][x]=3 if (x+y)%5 else 6
                    height[y][x]=1
    def in_moon_world(x, y):
        cx, cy = 374, 594
        dx = (x-cx) / 58.0
        dy = (y-cy) / 42.0
        ridge = dx*dx + dy*dy
        waviness = 0.10*math.sin(x*0.17+y*0.08) + 0.07*math.sin(y*0.23)
        south_spur = ((x-350)/24.0)**2 + ((y-622)/12.0)**2 < 1.0
        east_spur = ((x-418)/25.0)**2 + ((y-581)/15.0)**2 < 1.0
        return ridge + waviness < 1.0 or south_spur or east_spur
    def in_moon_pool(x, y):
        return ((x-361)/9.5)**2 + ((y-592)/5.0)**2 < 1.0
    for y in range(max(0, 540), min(H, 636)):
        for x in range(max(0, 305), min(W, 445)):
            if main[y][x] and terr[y][x] in (3,4,5,6) and in_moon_world(x,y):
                terr[y][x]=7
                core=max(0.0,1.0-(((x-374)/58.0)**2+((y-594)/42.0)**2))
                height[y][x]=max(height[y][x],3+int(core*2.4))
    _pool_cells=[]
    for y in range(max(0, 584), min(H, 601)):
        for x in range(max(0, 350), min(W, 373)):
            if main[y][x] and terr[y][x]==7 and in_moon_pool(x,y):
                terr[y][x]=1
                height[y][x]=0                 # 沉入盆地的惡地池塘(原本浮在 h5 山頂)
                _pool_cells.append((x,y))
    # 在池塘四周做漸層池壁,讓惡地一階一階下降到水面,而非一面垂直陡壁
    for (px,py) in _pool_cells:
        for dy in range(-4,5):
            for dx in range(-4,5):
                x,y=px+dx,py+dy
                if 0<=x<W and 0<=y<H and main[y][x] and terr[y][x]==7:
                    ring=max(abs(dx),abs(dy))
                    if height[y][x]>ring: height[y][x]=ring
    west_edge = {}
    for y in range(max(0, 628), min(H, 684)):
        xs=[x for x in range(W) if main[y][x]]
        if xs:
            west_edge[y]=min(xs)
    for y, wx in west_edge.items():
        c = (y-656) / 23.0
        bite = max(0, int(8*(1-c*c))) if abs(c) < 1 else 0
        beach_w = 6 + max(0, int(3*(1-c*c))) if abs(c) < 1 else 5
        for x in range(wx, min(W, wx+bite)):
            if main[y][x] and terr[y][x] in (2,3,4,5,6):
                terr[y][x]=1
                height[y][x]=0
        for x in range(wx+bite, min(W, wx+bite+beach_w)):
            if main[y][x] and terr[y][x] in (2,3,4,5,6):
                terr[y][x]=8
                height[y][x]=0
    def in_shoushan(x, y):
        return ((x-358)/34.0)**2 + ((y-652)/30.0)**2 < 1.0 or ((x-374)/23.0)**2 + ((y-632)/18.0)**2 < 1.0
    for y in range(max(0, 612), min(H, 679)):
        for x in range(max(0, 320), min(W, 405)):
            if main[y][x] and terr[y][x] in (3,4,5,6) and in_shoushan(x,y):
                terr[y][x]=9
                rise=max(0.0,1.0-(((x-358)/34.0)**2+((y-652)/30.0)**2))
                height[y][x]=max(height[y][x],2+int(rise*2.8))
    for _ in range(3):
        nxt=[row[:] for row in height]
        for y in range(1,H-1):
            for x in range(1,W-1):
                if not main[y][x] or terr[y][x] in (0,1,2,7,8,9):
                    continue
                low=min(height[y-1][x],height[y+1][x],height[y][x-1],height[y][x+1])
                if height[y][x]>low+1:
                    nxt[y][x]=low+1
        height=nxt
    for y in range(H):
        for x in range(W):
            if not main[y][x] or terr[y][x] in (0,1,2,7,8,9):
                continue
            if height[y][x]>=5:
                terr[y][x]=5
            elif height[y][x]>=3:
                terr[y][x]=4
            elif height[y][x]<=1 and terr[y][x] in (4,5):
                terr[y][x]=3
    land_rows=[y for y in range(H) if any(main[y])]; ymin,ymax=land_rows[0],land_rows[-1]
    def rowwidth(y): return sum(1 for x in range(W) if main[y][x])
    target=None
    for y in range(ymax,ymin,-1):
        if rowwidth(y)>=34: target=y; break
    if target is None: target=ymax-6
    xs=[x for x in range(W) if main[target][x]]; cx0=sum(xs)//len(xs)
    spawn=None
    for dy in range(0,8):
        yy=target+dy
        if yy>=H: break
        cand=[x for x in range(W) if main[yy][x] and terr[yy][x]==2]
        if cand: spawn=(min(cand,key=lambda x:abs(x-cx0)),yy); break
    if spawn is None:
        cand=[x for x in xs if terr[target][x] in (2,3,4,6)]
        spawn=(min(cand,key=lambda x:abs(x-cx0)) if cand else cx0,target)
    objs=[]; occ=set()
    def clr(x,y): return abs(x-spawn[0])+abs(y-spawn[1])>9
    for y in range(ymin,ymax+1):
        for x in range(W):
            if not land[y][x] or (x,y) in occ or not clr(x,y): continue
            tt=terr[y][x]; r=rng.random(); kind=None
            if tt==4:
                if r<0.11: kind="tree" if rng.random()<.7 else "pine"
            elif tt in (3,6):
                if r<0.02: kind="tree" if rng.random()<.5 else "bush"
            elif tt==2:
                if r<0.015: kind="palm" if rng.random()<.6 else "rock"
            elif tt==5:
                if r<0.03: kind="rock"
            elif tt==7:
                if r<0.025: kind="rock"
            elif tt==8:
                if r<0.014: kind="palm" if rng.random()<.45 else "rock"
            elif tt==9:
                if r<0.055: kind="tree" if rng.random()<.55 else ("pine" if rng.random()<.7 else "rock")
            if kind: objs.append({"k":kind,"x":x,"y":y}); occ.add((x,y))
    return {"w":W,"h":H,"tile":TILE,"terr":terr,"height":height,"objects":objs,
            "spawn":{"x":spawn[0],"y":spawn[1]},"ymin":ymin,"ymax":ymax}

# ================================================================ PREVIEW
def preview_tiles():
    names = ["sea_deep","sea_shallow","sand","grass","meadow","forest_floor","mountain",
             "moon_badland","siziwan_shore","shoushan_hill","floor","wall"]
    cols = len(names)
    sheet = Image.new("RGBA", (cols*(TILE+4)+4, TILE+24), (40,44,40,255))
    d = ImageDraw.Draw(sheet)
    for i, n in enumerate(names):
        sheet.paste(ASSETS[n], (4+i*(TILE+4), 4))
        d.text((4+i*(TILE+4), TILE+8), n[:6], fill=(220,220,210,255))
    sheet.save(os.path.join(OUT, "_preview_tiles.png"))

def preview_island(data):
    W,H=data["w"],data["h"]; terr=data["terr"]; height=data.get("height")
    pal={0:(38,96,128),1:(78,162,186),2:(230,212,160),3:(124,170,80),4:(80,120,58),5:(142,132,116),6:(138,182,92),7:(192,196,195),8:(226,198,132),9:(78,128,68)}
    buf=bytearray(W*H*3); i=0
    for y in range(H):
        ty=terr[y]
        for x in range(W):
            col=pal[ty[x]]
            if height:
                shade=1.0+height[y][x]*0.045
                col=(min(255,int(col[0]*shade)),min(255,int(col[1]*shade)),min(255,int(col[2]*shade)))
            buf[i]=col[0]; buf[i+1]=col[1]; buf[i+2]=col[2]; i+=3
    img=Image.frombytes("RGB",(W,H),bytes(buf))
    d=ImageDraw.Draw(img); sx,sy=data["spawn"]["x"],data["spawn"]["y"]
    d.ellipse([sx-5,sy-5,sx+5,sy+5],fill=(255,40,200))
    img.save(os.path.join(OUT,"_preview_island.png"))



# ================================================================ MAIN
def main():
    # tiles
    reg("sea_deep", tile_sea(True, 101))
    reg("sea_shallow", tile_sea(False, 102))
    reg("sand", tile_sand(103))
    reg("grass", tile_grass(104))
    reg("meadow", tile_meadow(105))
    reg("forest_floor", tile_forestfloor(106))
    reg("mountain", tile_mountain(107))
    reg("moon_badland", tile_moon_badland(110))
    reg("siziwan_shore", tile_siziwan_shore(111))
    reg("shoushan_hill", tile_shoushan_hill(112))
    reg("floor", tile_floor(108))
    reg("wall", tile_wall(109))
    # objects
    reg("tree", obj_tree(201)); reg("pine", obj_pine(202)); reg("rock", obj_rock(203))
    reg("bush", obj_bush(204)); reg("palm", obj_palm(205))
    # room (modern bedroom)
    reg("bed", obj_bed(331)); reg("desk", obj_desk(332)); reg("laptop", obj_laptop(333))
    reg("chair", obj_chair(334)); reg("shelf", obj_shelf(335)); reg("rug", obj_rug(336))
    reg("window", obj_window(337)); reg("plant", obj_plant(338)); reg("lamp", obj_lamp(339))
    reg("poster_map", obj_poster(340,0)); reg("poster_space", obj_poster(341,1))
    reg("clock", obj_clock(342)); reg("beanbag", obj_beanbag(343)); reg("dresser", obj_dresser(346))
    reg("book_closed", obj_book_closed(344)); reg("book_open", obj_book_open(345))
    reg("wardrobe", obj_wardrobe(347)); reg("door", obj_door(348)); reg("table", obj_table(349))
    # fog
    reg("fog1", fog_puff(401, (216, 226, 236)))
    reg("fog2", fog_puff(402, (206, 218, 230)))
    reg("fog3", fog_puff(403, (224, 232, 240)))
    # player
    pmeta = build_player_sheet()

    # island
    island = gen_island()
    isl_json = dict(island)
    isl_json["terr"] = ["".join(str(v) for v in row) for row in island["terr"]]
    isl_json["height"] = ["".join(str(v) for v in row) for row in island["height"]]
    with open(os.path.join(BUILD, "island.json"), "w", encoding="utf-8") as f:
        json.dump(isl_json, f, separators=(",", ":"))
    preview_tiles(); preview_island(island)

    # base64 manifest
    manifest = {}
    for name, img in ASSETS.items():
        buf = io.BytesIO(); img.save(buf, format="PNG")
        manifest[name] = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    with open(os.path.join(BUILD, "assets_b64.json"), "w", encoding="utf-8") as f:
        json.dump({"meta": {"player": pmeta, "tile": TILE}, "img": manifest}, f)

    total = sum(len(v) for v in manifest.values())
    print(f"assets: {len(ASSETS)}  b64 bytes: {total}")
    print(f"island: {island['w']}x{island['h']} spawn={island['spawn']} objects={len(island['objects'])}")
    print("done")

if __name__ == "__main__":
    main()
