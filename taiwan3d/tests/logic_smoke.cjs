/* logic_smoke.cjs — 零安裝邏輯冒煙測試（Tier 1）
 *
 * 目的：不開瀏覽器、不裝任何套件，純用 Node 載入南部場景的「邏輯層」JS，
 *       以極小 THREE stub 驅動 player.build/update，驗證在真正做出可玩流程前，
 *       地形/出生點/移動/海岸碰撞/地名解析這些「底層保證」沒有壞掉。
 *
 * 涵蓋使用者列出的自動檢查中、今天就能驗的子集：
 *   - 模擬 WASD/方向鍵移動           → W/S/A/D 模擬
 *   - 玩家座標有改變                 → moveW.changed
 *   - 玩家不會掉進海裡               → everInSea 必須為 false
 *   - UI 有「目前地點」可顯示         → regions.at() 解析非空
 * 互動點/任務完成/知識卡 等檢查需先做出 GAMEPLAY_VERTICAL_SLICE，故留待 Tier 2(Playwright)。
 *
 * 執行：  node taiwan3d/tests/logic_smoke.cjs
 * 結束碼：0 = 全部硬性檢查通過；1 = 有硬性檢查失敗。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS = path.join(__dirname, '..', 'js');
function load(f) { vm.runInThisContext(fs.readFileSync(path.join(JS, f), 'utf8'), { filename: f }); }

// 依 south.html 載入順序載入「邏輯層」子集（不含 terrain/vegetation/lighting/camera/props/ui —— 那些需要 THREE/DOM）
['util.js', 'config.js', 'south_scene.js', 'heightmap_south.js', 'regions_south.js', 'collision_south.js', 'player.js'].forEach(load);

const SENXUN = globalThis.SENXUN;
const ISL = globalThis.SENXUN_ISLAND;

/* ---------- 極小 THREE stub（涵蓋 player.js 人物模型用到的 API） ---------- */
function Vec3(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
Vec3.prototype.normalize = function () { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; };
function XYZ() { return { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }; }
function Obj3() { this.position = XYZ(); this.rotation = XYZ(); this.scale = XYZ(); }
Obj3.prototype.add = function () { return this; };
Obj3.prototype.translateY = function () { return this; };
function Geo() {}
Geo.prototype.translate = function () { return this; };
Geo.prototype.scale = function () { return this; };
Geo.prototype.rotateX = function () { return this; };
const THREE = {
  Vector3: Vec3, Group: Obj3, Mesh: Obj3,
  CylinderGeometry: Geo, SphereGeometry: Geo, ConeGeometry: Geo, BoxGeometry: Geo, IcosahedronGeometry: Geo, CircleGeometry: Geo, PlaneGeometry: Geo,
  MeshStandardMaterial: function () {}, MeshBasicMaterial: function () {},
};
const scene = { add() {} };

/* ---------- 測試框架（極簡） ---------- */
let hardFails = 0, hardPass = 0;
const lines = [];
function log(s) { lines.push(s); }
function hard(name, cond, detail) {
  if (cond) { hardPass++; log(`  [PASS] ${name}${detail ? ' — ' + detail : ''}`); }
  else { hardFails++; log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`); }
}
function soft(name, detail) { log(`  [info] ${name}${detail !== undefined ? ' — ' + detail : ''}`); }
function r2(n) { return Math.round(n * 100) / 100; }

/* ---------- 初始化（同 main.js 的順序） ---------- */
SENXUN.height.init(ISL);
SENXUN.regions.init(ISL);
if (SENXUN.collision) SENXUN.collision.init(); // 實體 blocker + 關卡邊界(樹幹需 THREE,Node 不載入;主路線本就排除樹幹碰撞)
SENXUN.player.build(THREE, scene, ISL.spawn);

const H = SENXUN.height, R = SENXUN.regions, S = SENXUN.south, P = SENXUN.player;

/* ---------- 移動模擬 ---------- */
// 鏡頭固定在玩家正南方（+z），與 camera_south 一致：W=向內陸(上山)、S=向海。
function simulate(keyCode, frames) {
  const keys = {}; keys[keyCode] = true;
  const cam = { position: { x: 0, y: 60, z: 0 } };
  const start = Object.assign({}, P.tile());
  let everInSea = false, minTerr = 99, maxInland = -1e9;
  for (let i = 0; i < frames; i++) {
    const p = P.pos();
    cam.position.x = p.x; cam.position.y = p.y + 60; cam.position.z = p.z + 72;
    P.update(1 / 60, keys, cam);
    const t = P.tile();
    const terr = H.terrAt(Math.floor(t.x), Math.floor(t.y));
    if (terr <= 1) everInSea = true;
    if (terr < minTerr) minTerr = terr;
    const d = S.inland(t.x, t.y); if (d > maxInland) maxInland = d;
  }
  const end = Object.assign({}, P.tile());
  return {
    start, end, everInSea, minTerr, maxInland,
    changed: (Math.abs(end.x - start.x) + Math.abs(end.y - start.y)) > 0.5,
    inBounds: end.x >= 1 && end.x <= ISL.W - 2 && end.y >= 1 && end.y <= ISL.H - 2,
  };
}

/* ============================ 跑測試 ============================ */
log('=== 森循島 南部場景 — Tier 1 邏輯冒煙測試 ===');
log('');

// A. 場景資料
log('A. 場景資料 / 出生點');
hard('SENXUN_ISLAND 已定義', !!ISL && ISL.W === 380 && ISL.H === 480, ISL ? `W=${ISL.W} H=${ISL.H}` : 'undefined');
hard('spawn 已定義', !!ISL.spawn && Number.isFinite(ISL.spawn.x) && Number.isFinite(ISL.spawn.y), `spawn=(${ISL.spawn.x}, ${ISL.spawn.y})`);
const spawnTerr = H.terrAt(Math.round(ISL.spawn.x), Math.round(ISL.spawn.y));
hard('出生點在陸地(非海)', spawnTerr === 4, `terrAt=${spawnTerr} (4=陸地,2=沙洲,1=淺海,0=海)`);
const spawnY = H.groundY(ISL.spawn.x, ISL.spawn.y);
hard('出生點 groundY 有效且>=0', Number.isFinite(spawnY) && spawnY >= 0, `groundY=${r2(spawnY)}`);
const spawnRegion = R.at(ISL.spawn.x, ISL.spawn.y);
hard('出生點地名可解析(UI可顯示)', !!spawnRegion && !!spawnRegion.name, spawnRegion ? `「${spawnRegion.name}」` : 'null');
soft('出生點離岸距離 inland', r2(S.inland(ISL.spawn.x, ISL.spawn.y)));
log('');

// B. 移動 + 海岸碰撞
log('B. 移動模擬 / 海岸碰撞');
const W = simulate('KeyW', 240);    // 向內陸走 4 秒
hard('按W：座標有改變', W.changed, `(${r2(W.start.x)},${r2(W.start.y)}) → (${r2(W.end.x)},${r2(W.end.y)})`);
hard('按W：朝內陸前進(y減少)', W.end.y < W.start.y - 1, `Δy=${r2(W.end.y - W.start.y)}`);
hard('按W：全程未掉進海裡', !W.everInSea, `minTerr=${W.minTerr}`);
hard('按W：仍在地圖範圍內', W.inBounds, `end=(${r2(W.end.x)},${r2(W.end.y)})`);

const Smv = simulate('KeyS', 240);  // 朝海走 4 秒，碰撞必須擋住
hard('按S(朝海)：全程未掉進海裡(碰撞有效)', !Smv.everInSea, `minTerr=${Smv.minTerr}`);
soft('按S：終點', `(${r2(Smv.end.x)},${r2(Smv.end.y)}) inland=${r2(S.inland(Smv.end.x, Smv.end.y))}`);

const A = simulate('KeyA', 120), D = simulate('KeyD', 120);
hard('按A：座標有改變且未入海', A.changed && !A.everInSea, `(${r2(A.start.x)},${r2(A.start.y)})→(${r2(A.end.x)},${r2(A.end.y)})`);
hard('按D：座標有改變且未入海', D.changed && !D.everInSea, `(${r2(D.start.x)},${r2(D.start.y)})→(${r2(D.end.x)},${r2(D.end.y)})`);
log('');

// C. 可攀爬性探針（觀察用，非硬性）—— 從出生點長按 W，看能爬多遠/卡在哪
log('C. 可攀爬性探針（從出生點長按 W 30 秒）');
SENXUN.player.build(THREE, scene, ISL.spawn); // 重置玩家到出生點
const climb = simulate('KeyW', 1800);
soft('長按W最終位置', `(${r2(climb.end.x)},${r2(climb.end.y)})`);
soft('最遠到達 inland 距離', `${r2(climb.maxInland)}  (參考：BEACH<16, CLIFF<40, FOREST<150, SUMMIT<270)`);
soft('最終地名', `「${R.at(climb.end.x, climb.end.y).name}」`);
soft('最終 groundY', r2(H.groundY(climb.end.x, climb.end.y)));
soft('判讀', climb.maxInland > 150 ? '可爬進森林/接近山頂' : (climb.maxInland > 40 ? '只到森林帶下緣，疑似卡在礁岩陡坡' : '卡在海岸帶附近，攀爬受阻'));
log('');

// D. 縱向分層（海→山頂 高度遞增）
log('D. 縱向分層 / 高度');
const gyBeach = H.groundY(150, 286), gySummit = H.groundY(330, 50);
hard('山頂區域明顯高於海灘', gySummit > gyBeach + 10, `beach≈${r2(gyBeach)} vs summit≈${r2(gySummit)}`);
soft('沿內陸取樣 groundY', [10, 30, 80, 160, 240].map(function (yy) {
  return `(150,${yy})=${r2(H.groundY(150, yy))}`;
}).join('  '));
log('');

// E. 地標可達性 + 地名解析（多為觀察；offshore 允許在水上）
log('E. 地標 / 地名解析');
(S.markers || []).forEach(function (m) {
  const terr = H.terrAt(Math.round(m.x), Math.round(m.y));
  const reg = R.at(m.x, m.y);
  const onLand = terr >= 2;
  const named = reg && reg.name === m.name;
  soft(`${m.name} (${m.kind})`, `terr=${terr} ${onLand ? '可踏' : '✗在深海'}  地名解析:${named ? 'OK' : '「' + (reg && reg.name) + '」'}`);
});
log('');

// F. 主路線可走(含碰撞 + 邊界 + 陡坡):出生點 → 登山口 → 步道 → 天雨洞 → 山頂
log('F. 主路線可走性(含碰撞/邊界/陡坡)');
SENXUN.player.build(THREE, scene, ISL.spawn); // 重置到出生點
function steerTo(tx, ty, maxFrames) {
  var cam = { position: { x: 0, y: 60, z: 0 } };
  for (var i = 0; i < maxFrames; i++) {
    var p = P.pos(); cam.position.x = p.x; cam.position.y = p.y + 60; cam.position.z = p.z + 72;
    var t = P.tile(), dx = tx - t.x, dy = ty - t.y;
    if (Math.hypot(dx, dy) < 6.5) return { ok: true, frames: i, tile: P.tile() };
    var keys = {};
    if (dy < -1) keys.KeyW = true; else if (dy > 1) keys.KeyS = true;
    if (dx > 1) keys.KeyD = true; else if (dx < -1) keys.KeyA = true; // D=+x, A=-x(修正後)
    P.update(1 / 60, keys, cam);
  }
  return { ok: false, frames: maxFrames, tile: P.tile() };
}
var WPS = [['登山口', 186, 276], ['步道', 216, 240], ['天雨洞', 300, 250], ['山頂觀景', 332, 44]];
for (var wi = 0; wi < WPS.length; wi++) {
  var r = steerTo(WPS[wi][1], WPS[wi][2], 60 * 50);
  hard('可走到 ' + WPS[wi][0] + '(未被擋死)', r.ok === true, '用' + r2(r.frames / 60) + 's 停在(' + r2(r.tile.x) + ',' + r2(r.tile.y) + ')');
}
hard('全程未掉海/不出界(終點在陸且關卡內)', H.terrAt(Math.round(P.tile().x), Math.round(P.tile().y)) === 4 && SENXUN.collision.inBounds(P.tile().x, P.tile().y));
hard('脫困(last-safe)未在正常路線狂觸發', P.lastSafeHits() < 30, 'hits=' + P.lastSafeHits());
log('');

/* ---------- 總結 ---------- */
log('=== 總結 ===');
log(`硬性檢查：${hardPass} PASS / ${hardFails} FAIL`);
log(hardFails === 0 ? 'RESULT: PASS ✅' : 'RESULT: FAIL ❌');

const out = lines.join('\n');
console.log(out);
process.exit(hardFails === 0 ? 0 : 1);
