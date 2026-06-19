# AUTONOMOUS DEV LOG — 森循島《西子灣·柴山》

> 自動化開發 / 遊玩測試紀錄。**最新在最上面。**
> 每筆格式：`## YYYY-MM-DD #n — 標題` → 角色/範圍、做了什麼、測試結果、發現、待確認、下一步。
> 相關文件：`PLAYTEST_SPEC.md`（可玩定義＋測試方案）、`GAMEPLAY_VERTICAL_SLICE.md`（第一版流程）。

---

## 2026-06-19 #4 — 垂直切片增量 2：目標 2-4 + 指引 + 開始/完成畫面 + 鏡頭（全綠）

**做了什麼**（你選「繼續增量2 + 調鏡頭」）
- **先驗路線可達性**（route_probe）：從出生點連續導航至 龍泉寺登山口→天雨洞→泰國谷→柴山觀景台**全部到得了**（最遠山頂 inland 249、gy 71），無不可逾越陡崖 → 解 F3。並掃出實際 `trail` 格座標。
- **目標 2-4 互動點**（`interactions_south.js`）：目標2 兩點**落在真正的步道格**(186,276)/(216,240) → 解 **F2**；目標3 天雨洞(300,250,有洞口道具)；目標4 觀景台(332,44)。
- **任務狀態機**：互動點**依當前目標過濾**（不能越級觸發）；目標2 需 2 點;完成最後目標 → `done` → 完成事件。
- **目標指引 pin（F1）**：`main.js` 每幀把當前目標的下個互動點投影到螢幕，UI 顯示 🎯 + 標籤（離開迷路）。
- **開始畫面**：標題 + 「按任意鍵／點擊 開始探索」，任意鍵/點擊關閉。
- **完成畫面**：讀完最後一張卡 → 「🏆 柴山調查完成!」+ 已收集 4 張知識卡清單 + 重新探索。
- **鏡頭 F6**：俯角 52°→36°、距離 72→60、fov 49→52 → 較貼身第三人稱、不那麼像俯瞰地圖。

**TDD**：先擴充 `slice_logic.cjs`（目標2需2、過濾、全程完成 4 目標→done+4卡）看它 RED(11 fail)→ 實作 → GREEN(32/32)。整合層先把 Tier 2 #8 寫成真鍵盤全程完成 → 接 UI → GREEN。

**測試結果（全綠、無 skip）**
```
Tier 1  logic_smoke.cjs  → 13/13   slice_logic.cjs → 32/32
Tier 2  playwright        → 9 passed / 0 skipped（exit 0）
  #1-6 基線、#7 互動、#9 目標1+卡片、#8 全程4目標→4卡+完成畫面 全綠
```
- #8 全程完成測試:為避開 headless 軟體渲染的慢動作(真實地圖山頂距出生點逾 200 格),改用公開 `interactions.init()` 換成出生點附近的群聚互動點,**任務/UI/完成流程與正式完全相同**,只壓縮移動距離。完整真實地圖路線的可達性已由 route_probe 與 Tier 1 證實。
- 截圖:`tests/shots/00-initial.png`(開始畫面)、`01-after-W.png`(降俯角鏡頭+指引)、`02`、`03`(知識卡)、`04-complete.png`(完成畫面)。

**可玩準則進度**（對 `PLAYTEST_SPEC.md`）
- 1✅ 2✅ 3✅ 5✅ 6✅ 7✅ 8✅(KC1-4 皆可解鎖) 9✅　4✅(降俯角+開始畫面取景,可再微調)
- **10**:完整流程已成形(開始→4目標→完成)。實走時間視探索約 **3-6 分鐘**;要穩定到 5-10 分鐘可再加互動點/支線(後續)。
- 餘留:F6 可再依喜好微調;真人試玩驗收(DoD 的人工試玩項)需你親自跑一次。

**目前狀態**：垂直切片**主體完成**——一條「開始 → 海岸調查 → 步道上山(獼猴) → 石灰岩溶洞 → 山頂環境修復 → 完成結算」的可玩路線，4 張在地知識卡，全自動測試兩層全綠。

**可玩**：`cd taiwan3d && python -m http.server 8080` → `http://localhost:8080/south.html`。

---

## 2026-06-19 #3 — 垂直切片增量 1：互動骨幹 + 目標1 + 知識卡（TDD，全綠）

**做了什麼**（你選「開始實作切片」；依 TDD RED→GREEN 進行）
- 新增邏輯模組(不需 THREE)：
  - `js/cards_south.js`（`SENXUN.cards`）— 4 張在地知識卡資料(KC1–KC4) + 解鎖狀態。
  - `js/quest_south.js`（`SENXUN.quest`）— 4 目標狀態機;增量 1 完整實作目標 1(調查海岸 3 點)，2–4 先佔位。
  - `js/interactions_south.js`（`SENXUN.interactions`）— 接近偵測 + 按 E 觸發;目標 1 的 3 個 inspect 點(座標皆驗證落在可走海灘)。
- 整合到瀏覽器：
  - `js/main.js` — `E` 鍵 edge-trigger 觸發互動;初始化 quest/cards/interactions;暴露 `SENXUN.debug` 測試掛鉤。
  - `js/ui_south.js` — **常駐 HUD**(地點/目標/進度/知識卡數) + 互動提示「[E]」+ 知識卡彈窗 + 「目標完成」toast。
  - `south.html` — 新增 DOM/CSS;**順手修掉 F7**(HUD 加深底色+描邊,對比大幅提升)。

**TDD 過程**
- 邏輯層：先寫 `tests/slice_logic.cjs`(RED:模組不存在→ENOENT)→ 實作 → GREEN(20/20)。
- 整合層：先啟用 Tier 2 #7/#9 真實斷言(RED:`SENXUN.debug` 不存在→逾時)→ 接線 → GREEN。
- 過程修掉 2 個測試環境問題:headless SwiftShader 移動慢動作(dt 上限)→ 互動點改群聚 + `walkToward` 連續壓鍵 + 放寬逾時;卡片淡入時序→截圖前等淡入完成。

**測試結果（全綠）**
```
Tier 1  node logic_smoke.cjs  → 13/13 PASS（迴歸:移動/碰撞/分層未壞）
Tier 1  node slice_logic.cjs  → 20/20 PASS（互動/任務/知識卡邏輯）
Tier 2  npx playwright test   → 8 passed / 1 skipped（exit 0）
  Phase 0 #1–6 全綠(迴歸)
  Phase 1 #7 走近按 E → 提示出現、進度 +1  ✅
  Phase 1 #9 完成目標1(3點)→ 解鎖 KC1、卡片彈窗出現  ✅
  Phase 1 #8 全部完成+完成畫面  → skip(待增量 2 補目標 2-4)
```
截圖存證：`tests/shots/02-after-interact.png`(常駐 HUD)、`tests/shots/03-card-KC1.png`(知識卡彈窗+完成 toast)。視覺確認 HUD 對比已改善、卡片排版正確。

**可玩準則進度更新**（對 `PLAYTEST_SPEC.md`，以「目標 1」範圍計）
- 1 知道在哪 ✅(HUD 常駐地點)　2 知道目標 ✅(HUD 目標+進度可更新)　6 任務起點 ✅　7 互動點 ✅　8 知識卡 ✅　9 完成回饋 ✅(toast + 卡片 + 進度)。
- 仍待：10 玩 5–10 分鐘(需目標 2-4)、4 鏡頭手感(F6)。

**仍開放的發現**
- **F1 導引**：尚未做目標指引箭頭(目標 2-4 才會明顯需要)。
- **F2 地標vs步道**：目標 2 才會踩到,屆時把互動點貼齊 `trail` 格。
- **F6 鏡頭手感**：俯角偏高,尚未調整。

**下一步（增量 2，待你說繼續）**：補目標 2(步道/獼猴)、3(洞穴/泰國谷)、4(環境修復)互動點 + 目標指引箭頭(F1) + 開始畫面 + 完成畫面 → 讓 Tier 2 #8 轉綠、達成準則 10。可順手處理 F6 鏡頭。

---

## 2026-06-19 #2 — 建立 Tier 2 瀏覽器測試工具鏈 + 綠燈基線（你已核准）

**做了什麼**（依你核准的三項：裝 Playwright、three.js 在地化、切片方向）
- 安裝 **Playwright 1.61.0** + **Chromium headless shell 149.0.7827.55**。
- **three.js r128 在地化**：下載到 `taiwan3d/vendor/three.min.js`（603KB, MIT）；`south.html` 改為**本機優先 + cdnjs 自動回退**（離線/CI 可重現，且檔案缺失不會壞）。
- 新增測試骨架（不改遊戲邏輯檔）：`taiwan3d/package.json`、`playwright.config.mjs`、`tests/playtest.spec.mjs`、`.gitignore`。靜態伺服器用既有 `python -m http.server`，啟用 SwiftShader 讓 headless 也能跑 WebGL。

**Tier 2 基線結果 — `npx playwright test`（exit 0）**
```
Phase 0 — 現有 build 基線
  ✓ 1. 載入無 console error、three.js 就緒、#err 為空
  ✓ 2. 場景渲染出有尺寸 canvas、標題正確（截圖 tests/shots/00-initial.png）
  ✓ 3. 按 W：座標改變、朝內陸前進、未掉海（截圖 01-after-W.png）
  ✓ 4. 按 S 朝海：海岸碰撞有效，全程未掉海
  ✓ 5. 方向鍵也能移動
  ✓ 6. UI：目前地點與目標文字皆非空
Phase 1 — 待垂直切片（skip）
  - 7/8/9 互動點 / 任務完成 / 知識卡（功能尚未實作）
結果：6 passed, 3 skipped
```
- 伺服器 log 顯示 `/vendor/three.min.js 200` → 確認用的是在地化副本。
- **無任何 console error / pageerror**；WebGL 在 headless Chromium(SwiftShader) 正常建立。

**截圖視覺確認**（QA 親眼看圖，非只看尺寸）
- 場景正確渲染：海、沙灘海岸線、散佈森林、灰白礁岩/石灰岩高地、離岸礁石、橘色玩家在西子灣海灘、底部「西子灣海灘」銘牌。準則 5（看得出地貌）視覺成立。
- 移動後鏡頭跟隨、視野推進到石灰岩高地，銘牌顯示地名 → 準則 3 視覺佐證。

**新發現（視覺）**
- **F6（鏡頭手感）**：固定鏡頭俯角偏高、視野很廣，整體偏「地圖/俯瞰」感 → 這正是你說的「像開發者工具」。切片可考慮降低俯角、拉近距離做更貼身的第三人稱（屬準則 4 體感調整，先記錄）。
- **F7（HUD 對比）**：左上「目標」框在沙灘背景上**對比過低、幾乎看不清**。切片做常駐 HUD 時要加深底色/描邊。

**狀態**：Tier 1 + Tier 2 測試工具鏈**全部就緒且綠燈**，現有 build 的可玩底層（載入/渲染/移動/碰撞/UI 文字）皆通過。**互動/任務/知識卡**三項仍為 skip——要等垂直切片實作後才能驗。

**下一步（建議）**：依 `GAMEPLAY_VERTICAL_SLICE.md` §9 第 1 步開始實作（測試掛鉤 `SENXUN.debug` + HUD 常駐地點/目標），逐步打通互動→任務→知識卡→開始/完成畫面，每步回填本 LOG 並讓 Phase 1 測試逐一轉綠。**在此暫停，等你說「開始實作」或調整優先序（如先處理 F6 鏡頭手感）。**

---

## 2026-06-19 #1 — 製作人/主程式/QA 首次審查 + 建立測試基線

**角色**：遊戲製作人 + 主程式 + QA 遊玩測試員
**範圍**：`taiwan3d/south.html` 南部正式場景（不大改既有檔；只新增測試與文件）
**版本**：git `main` @ `b9948fd`（審查當下 HEAD）

### 做了什麼
1. 讀完場景全部原始碼：`south.html`、`js/{main,player,camera_south,heightmap_south,terrain,ui_south,vegetation,config,south_scene,regions_south,south_props,lighting,util}.js`，及設計來源 `docs/superpowers/specs/2026-06-19-south-saki-terrain-design.md`、`DESIGN.md`、南部研究 PDF（文字層擷取）。
2. 建立 **Tier 1 邏輯冒煙測試**（零安裝）：`taiwan3d/tests/logic_smoke.cjs`。
3. 撰寫 `PLAYTEST_SPEC.md`（可玩定義 + 兩層測試方案）與 `GAMEPLAY_VERTICAL_SLICE.md`（第一版可玩流程）。

### 現況評估（一句話）
**目前是「可走動的場景模型 / tech demo」，不是遊戲。** 地形、固定鏡頭、角色、地點銘牌都在，但**沒有開始畫面、沒有真任務、沒有互動點、沒有知識卡、沒有完成回饋**，玩家不知道要幹嘛、何時算贏。缺的是遊戲系統層，不是地形。缺口對照見 `PLAYTEST_SPEC.md` §1（準則 6–10 全為 ❌；1/2/4 為 ⚠️；3/5 大致 ✅）。

### 測試結果

**Tier 1 — `node taiwan3d/tests/logic_smoke.cjs`（結束碼 0 = PASS）**
```
A. 場景資料 / 出生點
  [PASS] SENXUN_ISLAND 已定義 — W=380 H=480
  [PASS] spawn 已定義 — spawn=(150, 294)
  [PASS] 出生點在陸地(非海) — terrAt=4
  [PASS] 出生點 groundY 有效且>=0 — groundY=0.88
  [PASS] 出生點地名可解析(UI可顯示) — 「西子灣海灘」
  [info] 出生點離岸距離 inland — 7.57
B. 移動模擬 / 海岸碰撞
  [PASS] 按W：座標有改變 — (150.5,294.5) → (150.5,206.5)
  [PASS] 按W：朝內陸前進(y減少) — Δy=-88
  [PASS] 按W：全程未掉進海裡 — minTerr=4
  [PASS] 按W：仍在地圖範圍內
  [PASS] 按S(朝海)：全程未掉進海裡(碰撞有效) — minTerr=4
  [PASS] 按A：座標有改變且未入海
  [PASS] 按D：座標有改變且未入海
C. 可攀爬性探針（長按 W 30 秒）
  [info] 最終位置 (150.5,1)；最遠 inland 113.3；最終地名「柴山石灰岩森林」；groundY 29.2
  [info] 判讀：沿 x=150 直線向北會到地圖北緣森林帶，到不了山頂(山頂在東北 x≈330)
D. 縱向分層 / 高度
  [PASS] 山頂明顯高於海灘 — beach≈1.83 vs summit≈69.72
E. 地標 / 地名解析
  [info] 7 個地標(西子灣海灘/龍泉寺登山口/猴洞/天雨洞/泰國谷/柴山觀景台/旗津) terr 皆可踏、地名解析皆 OK

=== 總結 ===  硬性檢查：13 PASS / 0 FAIL  →  RESULT: PASS ✅
```

**語法/引用檢查（零安裝）**
- 12 支 JS `node --check` 全部 OK；`south.html` 13 個 `<script>` 引用全部存在。
- three.js 來源：`cdnjs r128`（網路相依）。

### 發現（Findings）
- **F1（阻擋可玩）導引缺失**：無方向指引，玩家從出生點直走到不了山頂/觀景台（在東北），會迷路。→ 切片必做目標指引（邊緣箭頭/地面光柱）。
- **F2（要修）地標與步道不重合**：`trailX(d)` 蜿蜒步道與 `龍泉寺登山口` 等地標座標偏離數十單位，「沿步道走到登山口」幾何上不成立。→ 互動點貼齊 `biome==="trail"` 格子或微調地標座標。
- **F3（好消息）移動底層穩**：八方向順暢、海岸碰撞可靠（壓 S 朝海被擋、全程未入海）、不出界、`maxStep=3.0` 在測試走廊未卡死。完整含轉向的「海灘→觀景台」路線仍待 Tier 2 實走複驗。
- **F4（要改）地點銘牌淡出**：銘牌 3.2 秒後消失，需改 HUD 常駐顯示目前地點（準則 1）。
- **F5（測試基建）three.js 網路相依**：建議在地化 `three.min.js` 以利離線/CI 重現（見待確認）。

### 待你確認（依你指示，未自行安裝）
1. **是否安裝 Playwright 做 Tier 2 瀏覽器測試？**
   - 原因：本遊戲是 Three.js WebGL，必須用真實瀏覽器才能驗「開頁、console error、真實鍵盤、畫面有東西、截圖、互動/任務完成」。詳見 `PLAYTEST_SPEC.md` §5。
   - 要裝：`@playwright/test`（`npm i -D`）＋ `npx playwright install chromium`（約 120–170MB）。靜態伺服器用既有 `python -m http.server`，不需額外套件。
   - 會新增（不改遊戲檔）：`taiwan3d/package.json`、`taiwan3d/playwright.config.mjs`、`taiwan3d/tests/playtest.spec.mjs`。
2. **是否把 three.js 在地化**到 `taiwan3d/vendor/`（建議：是，利於離線/CI）。
3. 確認 `GAMEPLAY_VERTICAL_SLICE.md` 的流程與主題方向（環境調查＋在地知識＋輕量修復，先不做戰鬥/垃圾怪）。

### 下一步（等你確認後）
- 你點頭 → 安裝 Playwright + 建 Tier 2 骨架 → 依 `GAMEPLAY_VERTICAL_SLICE.md` §9 順序開始實作切片，每步跑 Tier 1（迴歸）+ Tier 2 並回填本 LOG。
- **目前先停止，等待你的確認。**
