# 森循島 — 南部西子灣·柴山 地形修復設計 (Phase 1)

日期：2026-06-19
範圍：只修地形，不加 RPG/NPC/任務/小遊戲。目標檔案：`taiwan3d/`（模組版）。

## 目標
依 PDF《南部地圖：西子灣·鼓山·柴山》把南部做成一張可讀的「從海到山頂」縱向地形場景，
保留全台版 (`taiwan.html`) 不動，新增 `south.html` 入口。

## 縱向分層（核心骨架）
海(台灣海峽/高雄港) → 沙灘/海水浴場 → 陡峭礁岩海岸 → 柴山石灰岩森林 → 山頂稜線(眺港)

高度由「離海岸距離 d」分段（smoothstep 連續），避免測試模型感：
- d<0 海；0..BEACH 沙灘(平緩)；BEACH..CLIFF 陡峭礁岩(尖銳但有界)；
  CLIFF..FOREST 石灰岩森林(起伏)；FOREST..SUMMIT 山頂裸岩。
- 海岸線 = 基準曲線 + fbm 擾動 + 西子灣海灣凹槽 → 自然不規則，非幾何直邊。
- 招牌微地形：泰國谷峽谷(高壁凹槽)、猴洞/洞穴入口(礁岩崖底)、登山步道(可讀路徑)。

## 柴山招牌：灰白嶙峋珊瑚礁石灰岩
- 新 biome：`reef`(礁岩岸)、`karst`(石灰岩)、`trail`(步道)；近灰白配色。
- 撒低多邊形岩塊(Icosahedron flatShading) + 白榕(banyan) → 遊戲化非寫實。

## 檔案
新增（只給 south.html 用）：
- `taiwan3d/js/south_scene.js`：定義 `window.SENXUN_ISLAND` + 對 `SENXUN.config` 的場景覆寫(bbox/vegBounds/detail=null/maxStep)。
- `taiwan3d/js/heightmap_south.js`：縱向分層高度模型，保持 `SENXUN.height.at/terrAt/groundY` 介面。
- `taiwan3d/js/regions_south.js`：南部地名(西子灣/礁岩海岸/石灰岩森林/泰國谷/山頂)。
- `taiwan3d/south.html`：南部入口。

增量修改（向後相容，全台版有 fallback）：
- `taiwan3d/js/config.js`：新增 reef/karst/trail 配色（只增鍵）。
- `taiwan3d/js/terrain.js`：bbox/detail/海面裁切讀 config，fallback 原值。
- `taiwan3d/js/vegetation.js`：bounds 讀 config，新增礁岩/白榕散佈。
- `taiwan3d/js/camera.js`：對地形高度夾擠防穿模（通用、保守）。
- `taiwan3d/js/player.js`：坡度上限，避免陡崖垂直瞬移（config.maxStep，未設則不限）。

不動：`data_island.js`、`heightmap.js`、`taiwan.html`、`regions.js`、`index.html`、`番薯島3D地圖.html`。

## 風險
- 新高度模型需對齊既有模組介面 → 保持同介面 + node smoke test 驗證。
- config 只增鍵、terrain/vegetation/player 以 fallback 保護全台版。

## 預覽
`cd taiwan3d && python -m http.server 8080` → `http://localhost:8080/south.html`
