#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Visual QA: composite the lobby + island views from the REAL assets and
island.json using the same coordinates/draw-order as the game renderer.
This is a faithful still-frame proxy (the live game uses Canvas) so we can
eyeball composition, fog, coastline, sprites and layout without a browser."""
import os, json, glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AV = os.path.join(ROOT, "assets", "v2")
TILE, SCALE = 32, 2
VW, VH = 480, 288
CW, CH = 960, 576

A = {}
for f in glob.glob(os.path.join(AV, "*.png")):
    n = os.path.splitext(os.path.basename(f))[0]
    if n.startswith("_preview"): continue
    A[n] = Image.open(f).convert("RGBA")
ISL = json.load(open(os.path.join(ROOT, "build", "island.json"), encoding="utf-8"))
PM = json.load(open(os.path.join(ROOT, "build", "assets_b64.json"), encoding="utf-8"))["meta"]["player"]

def font(sz):
    for p in ["/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
              "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, sz)
            except: pass
    return ImageFont.load_default()

def paste(dst, name, x, y):
    im = A[name]; dst.alpha_composite(im, (int(x), int(y)))

def player_frame(facing, frame=0):
    row = PM["dirs"].index(facing); fw, fh = PM["frameW"], PM["frameH"]
    return A["player_sheet"].crop((frame*fw, row*fh, frame*fw+fw, row*fh+fh))

def shadow(dst, cx, cy, rx, ry):
    sh = Image.new("RGBA", (rx*2+2, ry*2+2), (0,0,0,0))
    ImageDraw.Draw(sh).ellipse([1,1,rx*2,ry*2], fill=(20,30,20,70))
    dst.alpha_composite(sh, (int(cx-rx), int(cy-ry)))

def rrect(d, box, r, fill=None, outline=None, width=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

# ---------------------------------------------------------------- LOBBY
def render_lobby():
    RW,RH=448,352; FX0,FY0,FX1,FY1=32,96,416,320
    world=Image.new("RGBA",(RW,RH),(40,46,54,255))
    for ty in range(RH//TILE+1):
        for tx in range(RW//TILE+1):
            if tx*TILE<RW and ty*TILE<RH: paste(world,"wall",tx*TILE,ty*TILE)
    for fy in range(FY0//TILE,FY1//TILE):
        for fx in range(FX0//TILE,FX1//TILE): paste(world,"floor",fx*TILE,fy*TILE)
    ImageDraw.Draw(world).rectangle([FX0,FY0,FX1,FY0+2],fill=(40,52,64,70))
    paste(world,"window",176,14); paste(world,"clock",300,30)
    paste(world,"rug",172,182)
    furn=[("wardrobe",32,100,215),("bed",350,100,206),("desk",170,94,146),("laptop",182,78,114),
          ("chair",192,126,172),("plant",370,250,308),("table",180,196,262)]
    bx,by=225,204
    items=[(b,n,x,y) for (n,x,y,b) in furn]; items.append((290,"__p__",225,290)); items.sort(key=lambda t:t[0])
    for (b,n,x,y) in items:
        if n=="__p__":
            shadow(world,225,290,9,5); world.alpha_composite(player_frame("up"),(225-PM["footX"],290-PM["footY"]))
        else:
            im=A[n]; shadow(world,x+im.width//2,b-2,int(im.width*0.30),5); world.alpha_composite(im,(x,y))
    bc=A["book_closed"]; world.alpha_composite(bc,(bx-bc.width//2,by-bc.height//2))
    fd=ImageDraw.Draw(world); fd.text((bx,by-4),"番薯島",font=font(7),fill=(17,17,17,255),anchor="mm")
    # simulate in-game zoomed follow-cam (S~5 on 1080 => ~2.5x, centred on player)
    Z=2.5; big=world.resize((int(RW*Z),int(RH*Z)),Image.NEAREST)
    pcx,pcy=int(225*Z),int(290*Z)
    cx0=max(0,min(big.width-CW, pcx-CW//2)); cy0=max(0,min(big.height-CH, pcy-CH//2))
    out=big.crop((cx0,cy0,cx0+CW,cy0+CH)).convert("RGBA")
    d=ImageDraw.Draw(out)
    d.text((18,28),"我的房間",font=font(20),fill=(255,255,255,255),anchor="lm")
    d.text((18,CH-20),"WASD / 方向鍵 移動 · 走到桌前按 E 翻開《番薯島》",font=font(14),fill=(255,255,255,220),anchor="lm")
    out.convert("RGB").save(os.path.join(AV,"_preview_lobby.png"))

# ---------------------------------------------------------------- ISLAND
TERR_IMG = ["sea_deep","sea_shallow","sand","grass","forest_floor","mountain","meadow"]
def mini_image():
    w, h = ISL["w"], ISL["h"]
    c = Image.new("RGBA", (w, h)); px = c.load()
    pal = {0:(38,96,128),1:(78,162,186),2:(230,212,160),3:(124,170,80),4:(80,120,58),5:(142,132,116),6:(138,182,92)}
    for y in range(h):
        for x in range(w):
            t = ISL["terr"][y][x]; px[x,y] = pal[t]+(255,)
            if ISL["region"][y][x] == 0 and t >= 2:
                base = pal[t]
                px[x,y] = tuple(int(base[i]*0.18 + (214,224,234)[i]*0.82) for i in range(3))+(255,)
    return c

def render_island(camx, camy, tag, facing="up"):
    w, h = ISL["w"], ISL["h"]
    worldW, worldH = w*TILE, h*TILE
    camx = max(0, min(camx, worldW-VW)); camy = max(0, min(camy, worldH-VH))
    world = Image.new("RGBA", (VW, VH), (10,28,24,255))
    x0, x1 = max(0, camx//TILE), min(w-1, (camx+VW)//TILE)
    y0, y1 = max(0, camy//TILE), min(h-1, (camy+VH)//TILE)
    # terrain
    for ty in range(y0, y1+1):
        for tx in range(x0, x1+1):
            paste(world, TERR_IMG[ISL["terr"][ty][tx]], tx*TILE-camx, ty*TILE-camy)
    # coastline foam
    foam = Image.new("RGBA", (VW, VH), (0,0,0,0)); fd = ImageDraw.Draw(foam)
    for ty in range(y0, y1+1):
        for tx in range(x0, x1+1):
            if ISL["terr"][ty][tx] != 2: continue
            fx, fy = tx*TILE-camx, ty*TILE-camy
            for dx,dy in ((0,1),(0,-1),(1,0),(-1,0)):
                ax,ay = tx+dx, ty+dy
                if 0<=ax<w and 0<=ay<h and ISL["terr"][ay][ax] <= 1:
                    if dy==1:  fd.rectangle([fx+2,fy+TILE-3,fx+TILE-4,fy+TILE-2], fill=(226,244,242,150))
                    elif dy==-1: fd.rectangle([fx+2,fy+1,fx+TILE-4,fy+2], fill=(226,244,242,150))
                    elif dx==1: fd.rectangle([fx+TILE-3,fy+2,fx+TILE-2,fy+TILE-4], fill=(226,244,242,150))
                    else: fd.rectangle([fx+1,fy+2,fx+2,fy+TILE-4], fill=(226,244,242,150))
    world.alpha_composite(foam)
    # objects + player by base y
    px = (ISL["spawn"]["x"]+0.5)*TILE; py = (ISL["spawn"]["y"]+0.9)*TILE
    rlist = []
    for o in ISL["objects"]:
        if x0-2 <= o["x"] <= x1+2 and y0-2 <= o["y"] <= y1+2:
            rlist.append(((o["y"]+1)*TILE, ("obj", o)))
    rlist.append((py, ("player", None)))
    rlist.sort(key=lambda t: t[0])
    for by, (kind, o) in rlist:
        if kind == "player":
            shadow(world, px-camx, py-camy, 9, 4)
            world.alpha_composite(player_frame(facing), (int(px-camx-PM["footX"]), int(py-camy-PM["footY"])))
        else:
            im = A[o["k"]]; bx=(o["x"]+0.5)*TILE-camx; byy=(o["y"]+1)*TILE+2-camy
            shadow(world, bx, byy-2, int(im.width*0.3), 4)
            world.alpha_composite(im, (int(bx-im.width/2), int(byy-im.height)))
    # fog over locked land
    fog = Image.new("RGBA", (VW, VH), (0,0,0,0)); gd = ImageDraw.Draw(fog)
    for ty in range(y0, y1+1):
        for tx in range(x0, x1+1):
            if ISL["region"][ty][tx] != 0: continue
            if ISL["terr"][ty][tx] < 2: continue
            depth = ISL["openBoundary"]-ty
            a = max(0, min(0.93, 0.40+depth*0.16))
            gd.rectangle([tx*TILE-camx, ty*TILE-camy, tx*TILE-camx+TILE, ty*TILE-camy+TILE], fill=(223,231,240,int(a*255)))
    world.alpha_composite(fog)
    # drifting fog puffs (matches in-game cloud layer)
    prng = __import__("random").Random(7)
    pimgs = [A["fog1"], A["fog2"], A["fog3"]]
    for _ in range(110):
        fx = prng.uniform(0, w*TILE); fy = prng.uniform(ISL["ymin"]*TILE, ISL["openBoundary"]*TILE+TILE)
        if not (camx-90 < fx < camx+VW+90 and camy-100 < fy < camy+VH+100): continue
        pim = pimgs[prng.randrange(3)]; sc = 0.7+prng.random()*0.9
        iw, ih = max(1, int(pim.width*sc)), max(1, int(pim.height*sc))
        pr = pim.resize((iw, ih)); al = 0.5+prng.random()*0.4
        pr.putalpha(pr.split()[3].point(lambda v: int(v*al)))
        world.alpha_composite(pr, (int(fx-camx-iw/2), int(fy-camy-ih/2)))
    out = world.resize((CW, CH), Image.NEAREST)
    d = ImageDraw.Draw(out, "RGBA")
    # minimap panel
    mh = 210; mw = round(mh*ISL["w"]/ISL["h"]); mpx = CW-mw-26; mpy = 22; pad = 10
    rrect(d, [mpx-pad, mpy-pad-18, mpx+mw+pad, mpy+mh+pad], 10, fill=(243,231,198,255), outline=(60,74,43,255), width=3)
    d.text((mpx+mw/2, mpy-9), "地  圖", font=font(14), fill=(60,74,43,255), anchor="mm")
    mini = mini_image().resize((mw, mh), Image.NEAREST)
    out.paste(mini, (mpx, mpy))
    d.rectangle([mpx-1, mpy-1, mpx+mw, mpy+mh], outline=(60,74,43,255), width=2)
    sx, sy = mw/worldW, mh/worldH
    d.rectangle([mpx+camx*sx, mpy+camy*sy, mpx+(camx+VW)*sx, mpy+(camy+VH)*sy], outline=(255,255,255,230), width=2)
    d.ellipse([mpx+px*sx-4, mpy+py*sy-4, mpx+px*sx+4, mpy+py*sy+4], fill=(228,74,142,255), outline=(255,255,255,255))
    # HUD name plate
    rrect(d, [20,20,216,72], 10, fill=(243,231,198,255), outline=(60,74,43,255), width=3)
    d.text((36,40), "森循島民", font=font(17), fill=(58,51,38,255), anchor="lm")
    d.text((36,60), "台灣島 · 南部沙灘", font=font(12), fill=(122,108,79,255), anchor="lm")
    hint = "WASD / 方向鍵 移動 · 迷霧區域尚未開放 · Esc 返回大廳"; hf = font(13)
    hw = d.textlength(hint, font=hf)
    rrect(d, [CW/2-hw/2-12, CH-34, CW/2+hw/2+12, CH-10], 8, fill=(28,40,28,190))
    d.text((CW/2, CH-22), hint, font=hf, fill=(244,234,208,235), anchor="mm")
    out.convert("RGB").save(os.path.join(AV, f"_preview_island_{tag}.png"))

if __name__ == "__main__":
    render_lobby()
    sp = ISL["spawn"]
    sfx = int((sp["x"]+0.5)*TILE); sfy = int((sp["y"]+0.9)*TILE)
    render_island(sfx-VW//2, sfy-VH//2, "spawn", "up")
    # boundary view: centre camera near the fog line
    bx = ISL["w"]*TILE//2
    render_island(bx-VW//2, ISL["openBoundary"]*TILE-120, "fog", "up")
    print("previews written: _preview_lobby, _preview_island_spawn, _preview_island_fog")
