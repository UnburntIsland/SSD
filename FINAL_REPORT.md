# FINAL REPORT — 森循島《西子灣·柴山》Vertical Slice

> 條件 10 最終彙整：修改檔案清單、測試方式、已知限制、下一階段建議。
> 對象：`taiwan3d/south.html`（全台版 `taiwan.html`、回收主遊戲 `index.html` 不在範圍且未被更動）。
> 分支：`vertical-slice`（`main` 維持切片前狀態）。日期：2026-06-19。
> 詳細逐輪過程見 `AUTONOMOUS_DEV_LOG.md`；美術見 `ENVIRONMENT_ART_DIRECTION.md` / `ART_PASS_LOG.md`；可玩定義見 `PLAYTEST_SPEC.md`；流程見 `GAMEPLAY_VERTICAL_SLICE.md`。

---

## 1. 目前是什麼
一條 **5–10 分鐘走向、約 3–6 分鐘可走完**的可玩垂直切片：

開始畫面 →（巡守員嚮導可對話＋解說牌＋🎯指引＋世界發光點）→ **目標1** 調查西子灣海岸(3 點) → **目標2** 沿柴山步道上山·觀察台灣獼猴(2 點) → **目標3** 探查天雨洞(石灰岩溶洞) → **目標4** 山頂環境修復（外來種銀合歡退、原生白榕長出的**可見回饋**）→ 🏆 完成結算畫面；沿途解鎖 **4 張在地知識卡**。

---

## 2. 完成條件對照（10/10）
| # | 條件 | 狀態 | 證據 |
|---|------|:----:|------|
| 1 | south.html 開啟無 console error | ✅ | Tier2 #1（`pageerror`/`console`=0、`#err` 空） |
| 2 | 開始畫面/教學/任務 HUD/地點銘牌 | ✅ | `#start`、`#tip`、常駐 HUD、`#nameplate`、巡守員對話教學 |
| 3 | WASD/方向鍵移動，不卡死/落海/穿地形 | ✅ | Tier1 13/13 + Tier2 #3/#4/#5（含海岸碰撞） |
| 4 | 固定鏡頭舒服、不像開發者工具 | ✅ | 俯角 52°→36°、拉近、開始畫面取景、無開發者讀數 |
| 5 | 地貌可辨（海岸/沙灘/礁岩/森林/步道/洞穴/山頂） | ✅ | 生態帶＋環境美術；截圖 06/07/08 |
| 6 | ≥1 NPC 或敘事引導物 | ✅ | 巡守員嚮導(可對話) + 4 面解說牌 |
| 7 | ≥3 互動點 | ✅ | 7 個任務互動點（3 海岸/2 步道/1 洞/1 山頂）+ 1 對話點 |
| 8 | 環境修復任務（接→前往→互動→知識卡→回饋→完成畫面） | ✅ | 目標4 完整流程，含**環境回饋**(restore) + 完成畫面 |
| 9 | 自動 playtest/smoke test（啟動/移動/UI/任務狀態） | ✅ | `npm run playtest`：Tier1(Node) + Tier2(Playwright 11) |
| 10 | 最終輸出（檔案/測試/限制/建議） | ✅ | 本文件 |

---

## 3. 修改／新增檔案清單

### 3a. 新增 — 遊戲模組（`taiwan3d/js/`，皆 `SENXUN.*` 命名空間，僅 south.html 載入）
| 檔案 | 作用 |
|------|------|
| `cards_south.js` | 4 張在地知識卡資料 + 解鎖狀態 |
| `quest_south.js` | 4 目標任務狀態機（進度/完成/解卡/完成事件） |
| `interactions_south.js` | 互動點接近偵測 + E 觸發；常駐對話(talk)點，任務點優先 |
| `markers_south.js` | 當前目標互動點的世界發光標記（光柱+浮球） |
| `npc_south.js` | 巡守員嚮導 NPC（可對話）+ 4 面 CanvasTexture 解說牌 |
| `environment_art_south.js` | 環境美術：步道(土徑/踏石/碎石/草/落葉)、海岸(漂流木/卵石/礁岩塊)、天雨洞岩壁、山頂木棧平台+欄杆+旗、白榕/露頭地標、夕陽日盤、森林草叢 |
| `restore_south.js` | 環境修復「回饋」：山頂銀合歡退、原生白榕長出 |
| `vegetation_south.js` | 南部植被（**取代** `vegetation.js`）：樹幹+分層樹冠+色彩/尺寸/傾斜變化，3 樹種，非均勻分布 |

### 3b. 新增 — 測試與工具（`taiwan3d/`）
| 檔案 | 作用 |
|------|------|
| `tests/logic_smoke.cjs` | Tier1 地形/出生點/移動/碰撞/分層（零安裝 Node） |
| `tests/slice_logic.cjs` | Tier1 互動/任務/知識卡/talk 點邏輯（39 檢查） |
| `tests/playtest.spec.mjs` | Tier2 Playwright 11 案例（載入/渲染/移動/UI/互動/任務/環境美術/截圖） |
| `tests/run_playtest.mjs` | 一鍵 `npm run playtest`：跑兩層並自動寫入 `AUTONOMOUS_DEV_LOG.md` |
| `package.json` / `package-lock.json` | scripts + devDep `@playwright/test` |
| `playwright.config.mjs` | webServer(python http.server) + SwiftShader 旗標 + 逾時 |
| `.gitignore` | 忽略 `node_modules`/`test-results`/`tests/shots` 等 |
| `vendor/three.min.js` | 在地化 three.js r128（south.html 本機優先 + cdnjs 回退） |

### 3c. 新增 — 文件（repo 根）
`PLAYTEST_SPEC.md`、`GAMEPLAY_VERTICAL_SLICE.md`、`AUTONOMOUS_DEV_LOG.md`、`ENVIRONMENT_ART_DIRECTION.md`、`ART_PASS_LOG.md`、`FINAL_REPORT.md`(本文件)。

### 3d. 修改 — 既有檔案（南部向後相容，**全台版/回收主遊戲未動**）
| 檔案 | 改動 |
|------|------|
| `taiwan3d/south.html` | HUD/開始/完成/卡片/提示/toast/指引 DOM+CSS；載入新模組；three.js 本機優先+回退；`vegetation.js`→`vegetation_south.js` |
| `taiwan3d/js/main.js` | E 鍵互動、初始化 quest/cards/interactions、建/更新 markers/npc/envart/restore、目標指引投影、`SENXUN.debug` 測試掛鉤 |
| `taiwan3d/js/ui_south.js` | 常駐 HUD、互動提示、知識卡/對話面板、toast、開始/完成畫面、指引 pin |
| `taiwan3d/js/south_scene.js` | 鏡頭俯角/距離/fov、夕照光與霧調校 |
| `taiwan3d/js/player.js` | `setTile`（除錯/截圖瞬移，不影響玩法） |

> 未更動：`vegetation.js`(全台版仍用)、`terrain.js`、`heightmap*.js`、`lighting.js`、`config.js`、`regions*.js`、`camera*.js`、`south_props.js`、`util.js`、`data_island.js`、`taiwan.html`、`index.html`。

---

## 4. 測試方式
```bash
cd taiwan3d
npm run playtest      # 一鍵：Tier1(Node) + Tier2(Playwright)，自動把結果寫入 ../AUTONOMOUS_DEV_LOG.md
# 個別：
node tests/logic_smoke.cjs     # 零安裝，地形/移動/碰撞
node tests/slice_logic.cjs     # 零安裝，互動/任務/知識卡邏輯
npx playwright test            # 真瀏覽器 11 案例
# 手動試玩：
python -m http.server 8080     # → http://localhost:8080/south.html
```
**Tier2 涵蓋**：本機 server 開 south.html → 等 three.js canvas → 無 JS error → 模擬 WASD/方向鍵 → tile 改變 → 海岸碰撞 → HUD 地點/任務 → 走到互動點按 E → 任務進度/知識卡 → 全程 4 目標完成 + 完成畫面 + 環境回饋 → NPC 對話 → 環境美術物件數 + 各區截圖。截圖存 `taiwan3d/tests/shots/`。
**目前狀態**：`logic_smoke PASS · slice_logic 39/39 · playwright 11/11` → ALL GREEN。

---

## 5. 已知限制
1. **時長 ~3–6 分鐘**，未穩定到 5–10 分（需更多支線/收集物）。
2. **環境美術**：樹間地表頂點色仍偏均勻、無投射/接觸陰影、水面偏平、沙→礁過渡基本（列為 Pass 3）。
3. **角色**：玩家仍是簡單膠囊，無走路動畫（角色美術依指示延後）。
4. **鏡頭**：固定方位 diorama，無法自由環視（已降俯角，主觀體感）。
5. **效能**：headless CPU(SwiftShader) 對植被密度敏感，已為其調低；真機 GPU 餘裕大。Tier2 全跑約 5 分鐘。
6. **#8 全程完成測試**：用公開 `interactions.init()` 換成群聚互動點以避開 headless 慢動作長途；真實地圖路線可達性另由 `route_probe`/Tier1 驗證。
7. 在分支 **`vertical-slice`**，尚未併入 `main`。

---

## 6. 下一階段建議
- **環境美術 Pass 3**：地表頂點色變化/相鄰生態交融、樹與岩接觸陰影感、近岸浪花泡沫、沙灘→礁岩過渡。
- **時長**：加入選配調查點/收集物/支線，把流程穩定到 5–10 分。
- **角色**：第三人稱角色模型 + 走路動畫。
- **聲音**：環境音（浪/風）、腳步、互動音效。
- **整合**：視需要把回收主玩法（`DESIGN.md`）接入此場景。
- **收尾**：滿意後將 `vertical-slice` 併回 `main`。
