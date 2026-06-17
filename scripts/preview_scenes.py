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
if ISL["terr"] and isinstance(ISL["terr"][0], str):
    ISL["terr"]=[[int(c) for c in r] for r in ISL["terr"]]

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
          ("chair",192,110,156),("plant",370,250,308),("table",180,196,262)]
    bx,by=225,204
    items=[(b,n,x,y) for (n,x,y,b) in furn]; items.append((290,"__p__",225,290)); items.sort(key=lambda t:t[0])
    for (b,n,x,y) in items:
        if n=="__p__":
            shadow(world,225,290,13,6)
            pf=player_frame("up").resize((PM["frameW"]*2,PM["frameH"]*2),Image.NEAREST); world.alpha_composite(pf,(225-PM["footX"]*2,290-PM["footY"]*2))
        else:
            im=A[n]; shadow(world,x+im.width//2,b-2,int(im.width*0.30),5); world.alpha_composite(im,(x,y))
    bc=A["book_closed"]; world.alpha_composite(bc,(bx-bc.width//2,by-bc.height//2))
    fd=ImageDraw.Draw(world); fd.text((bx+2,by-3),"番薯島",font=font(5),fill=(17,17,17,255),anchor="mm")
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
TERR_IMG = ["sea_deep","sea_shallow","sand","grass","forest_floor","mountain",
            "meadow","moon_badland","siziwan_shore","shoushan_hill"]
BASEPAL = [(0x20,0x59,0x75),(0x42,0x91,0xa6),(0xc9,0xae,0x74),(0x65,0x8c,0x45),
           (0x41,0x6b,0x37),(0x6f,0x67,0x5d),(0x70,0x96,0x4f),(0xac,0xb2,0xb2),
           (0xb9,0x9a,0x5d),(0x38,0x69,0x36)]
ELEV_STEP = 3
if ISL.get("height") and isinstance(ISL["height"][0], str):
    ISL["height"] = [[int(c) for c in r] for r in ISL["height"]]
HEIGHT = ISL.get("height")
def hAt(tx, ty):
    if not HEIGHT or tx<0 or ty<0 or tx>=ISL["w"] or ty>=ISL["h"]: return 0
    return HEIGHT[ty][tx]

def mini_image():
    w,h=ISL["w"],ISL["h"]
    pal={0:(38,96,128),1:(78,162,186),2:(230,212,160),3:(124,170,80),4:(80,120,58),
         5:(142,132,116),6:(138,182,92),7:(192,196,195),8:(226,198,132),9:(78,128,68)}
    buf=bytearray(w*h*4); i=0
    for y in range(h):
        ty=ISL["terr"][y]
        for x in range(w):
            c=pal[ty[x]]; buf[i]=c[0];buf[i+1]=c[1];buf[i+2]=c[2];buf[i+3]=255; i+=4
    return Image.frombytes("RGBA",(w,h),bytes(buf))

def render_island(camx, camy, tag, facing="up"):
    w,h=ISL["w"],ISL["h"]; worldW,worldH=w*TILE,h*TILE
    camx=max(0,min(camx,worldW-VW)); camy=max(0,min(camy,worldH-VH))
    world=Image.new("RGBA",(VW,VH),(10,28,24,255)); wd=ImageDraw.Draw(world,"RGBA")
    x0,x1=max(0,camx//TILE),min(w-1,(camx+VW)//TILE)
    y0,y1=max(0,camy//TILE),min(h-1,(camy+VH)//TILE)
    # base-palette skirt under raised tiles
    for ty in range(y0,y1+1):
        for tx in range(x0,x1+1):
            if hAt(tx,ty)<=0: continue
            c=BASEPAL[ISL["terr"][ty][tx]]
            wd.rectangle([tx*TILE-camx,ty*TILE-camy,tx*TILE-camx+TILE-1,ty*TILE-camy+TILE-1],fill=c+(255,))
    # terrain tiles raised by elevation
    for ty in range(y0,y1+1):
        for tx in range(x0,x1+1):
            e=hAt(tx,ty)*ELEV_STEP
            paste(world,TERR_IMG[ISL["terr"][ty][tx]],tx*TILE-camx,ty*TILE-camy-e)
    # side walls (mountain/badland/hill)
    for ty in range(y0,y1+1):
        for tx in range(x0,x1+1):
            ht=hAt(tx,ty)
            if ht<=0: continue
            t=ISL["terr"][ty][tx]; pxv=tx*TILE-camx; pyv=ty*TILE-camy-ht*ELEV_STEP
            diff=ht-hAt(tx,ty+1)
            if diff>0 and (t==7 or t==9 or (t==5 and diff>=2)):
                col=(76,67,58,31) if t==5 else (116,109,92,41) if t==7 else (40,82,42,31) if t==9 else (58,82,48,20)
                world.alpha_composite(Image.new("RGBA",(TILE,diff*ELEV_STEP),col),(pxv,pyv+TILE))
    # sand / siziwan foam at the waterline
    for ay in range(y0,y1+1):
        for ax in range(x0,x1+1):
            if ISL["terr"][ay][ax] not in (2,8): continue
            for dx,dy in ((0,1),(0,-1),(1,0),(-1,0)):
                bx,by=ax+dx,ay+dy
                if bx<0 or by<0 or bx>=w or by>=h: continue
                if ISL["terr"][by][bx]<=1:
                    fx=ax*TILE-camx; fy=ay*TILE-camy-hAt(ax,ay)*ELEV_STEP
                    if dy==1: wd.rectangle([fx+2,fy+TILE-3,fx+TILE-2,fy+TILE-1],fill=(226,244,242,200))
                    elif dy==-1: wd.rectangle([fx+2,fy+1,fx+TILE-2,fy+2],fill=(226,244,242,200))
                    elif dx==1: wd.rectangle([fx+TILE-3,fy+2,fx+TILE-1,fy+TILE-2],fill=(226,244,242,200))
                    else: wd.rectangle([fx+1,fy+2,fx+2,fy+TILE-2],fill=(226,244,242,200))
    px=(ISL["spawn"]["x"]+0.5)*TILE; py=(ISL["spawn"]["y"]+0.9)*TILE
    ptx,pty=ISL["spawn"]["x"],ISL["spawn"]["y"]; R=int(round((ISL["w"]*ISL["h"]/314.159)**0.5))
    pe=hAt(ptx,pty)*ELEV_STEP
    rlist=[]
    for o in ISL["objects"]:
        if x0-2<=o["x"]<=x1+2 and y0-2<=o["y"]<=y1+2 and (o["x"]-ptx)**2+(o["y"]-pty)**2<=R*R:
            oe=hAt(o["x"],o["y"])*ELEV_STEP
            rlist.append(((o["y"]+1)*TILE-oe,("obj",o,oe)))
    rlist.append((py-pe,("player",None,pe))); rlist.sort(key=lambda t:t[0])
    for by,(kind,o,e) in rlist:
        if kind=="player":
            shadow(world,px-camx,py-camy-e,9,4)
            pf=player_frame(facing)
            world.alpha_composite(pf,(int(px-camx-PM["footX"]),int(py-camy-e-PM["footY"])))
        else:
            im=A[o["k"]]; bx=(o["x"]+0.5)*TILE-camx; byy=(o["y"]+1)*TILE+2-camy-e
            shadow(world,bx,byy-2,int(im.width*0.3),4); world.alpha_composite(im,(int(bx-im.width/2),int(byy-im.height)))
    fog=Image.new("RGBA",(VW,VH),(0,0,0,0)); gd=ImageDraw.Draw(fog)
    for ty in range(y0,y1+1):
        for tx in range(x0,x1+1):
            if (tx-ptx)**2+(ty-pty)**2<=R*R: continue
            gd.rectangle([tx*TILE-camx,ty*TILE-camy,tx*TILE-camx+TILE,ty*TILE-camy+TILE],fill=(216,224,234,236))
    world.alpha_composite(fog)
    out=world.resize((CW,CH),Image.NEAREST)
    d=ImageDraw.Draw(out,"RGBA")
    src=mini_image(); mm=Image.new("RGBA",(w,h),(205,215,226,255))
    for yy in range(max(0,pty-R),min(h,pty+R+1)):
        for xx in range(max(0,ptx-R),min(w,ptx+R+1)):
            if (xx-ptx)**2+(yy-pty)**2<=R*R: mm.putpixel((xx,yy),src.getpixel((xx,yy)))
    mh=180; mw=mh; mr=mm.resize((mw,mh),Image.NEAREST)
    out.alpha_composite(mr,(CW-mw-22,22)); d.rectangle([CW-mw-22,22,CW-22,22+mh],outline=(60,74,67,255),width=2)
    sdx=CW-mw-22+int(ISL["spawn"]["x"]/w*mw); sdy=22+int(ISL["spawn"]["y"]/h*mh)
    d.ellipse([sdx-3,sdy-3,sdx+3,sdy+3],fill=(228,74,142,255))
    d.text((18,28),"番薯島 · 探索中",font=font(18),fill=(255,255,255,255),anchor="lm")
    d.text((18,CH-20),"WASD/方向鍵 移動 · M 放大地圖 · Esc 返回",font=font(13),fill=(255,255,255,220),anchor="lm")
    out.convert("RGB").save(os.path.join(AV,f"_preview_island_{tag}.png"))

if __name__ == "__main__":
    render_lobby()
    sp=ISL["spawn"]; sfx=int((sp["x"]+0.5)*TILE); sfy=int((sp["y"]+0.9)*TILE)
    render_island(sfx-VW//2, sfy-VH//2, "spawn", "up")
    render_island((ISL["w"]//2)*TILE-VW//2, 70*TILE, "fog", "up")
    print("previews: _preview_lobby, _preview_island_spawn, _preview_island_fog")
