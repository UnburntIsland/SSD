/* slice_logic.cjs — 垂直切片「邏輯層」TDD 測試（零安裝，Node）
 *
 * 測試互動/任務/知識卡的純邏輯(不需 THREE/瀏覽器):
 *   SENXUN.interactions（接近偵測 + 觸發）
 *   SENXUN.quest（4 目標狀態機；增量 1 只實作目標 1=調查海岸 3 點）
 *   SENXUN.cards（知識卡解鎖/查詢）
 *
 * 執行：node taiwan3d/tests/slice_logic.cjs   （結束碼 0=PASS）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const JS = path.join(__dirname, '..', 'js');
function load(f) { vm.runInThisContext(fs.readFileSync(path.join(JS, f), 'utf8'), { filename: f }); }

['util.js', 'config.js', 'south_scene.js', 'heightmap_south.js', 'regions_south.js',
 'cards_south.js', 'quest_south.js', 'interactions_south.js'].forEach(load);

const SENXUN = globalThis.SENXUN, ISL = globalThis.SENXUN_ISLAND;
SENXUN.height.init(ISL); SENXUN.regions.init(ISL);

let pass = 0, fail = 0;
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  [PASS] ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  [FAIL] ${name}${detail ? ' — ' + detail : ''}`); }
}

const Q = SENXUN.quest, I = SENXUN.interactions, K = SENXUN.cards;
Q.init(); I.init();

console.log('=== 垂直切片邏輯 TDD ===');

// T1 任務初始狀態
const s0 = Q.state();
ok('quest 初始 index=0', s0.index === 0, 'index=' + s0.index);
ok('quest 共 4 目標', s0.total === 4, 'total=' + s0.total);
ok('目標1 需要 3 點', s0.need === 3, 'need=' + s0.need);
ok('目標1 進度 0', s0.progress === 0, 'progress=' + s0.progress);
ok('尚未全部完成', s0.done === false, 'done=' + s0.done);
ok('目標1 標題含「海岸」', /海岸|西子灣/.test(s0.title), '「' + s0.title + '」');

// T2 互動點載入
const pts = I.points();
ok('目標1 至少 3 個互動點', pts.filter(p => p.objective === 1).length >= 3, '共' + pts.length);

// T3 接近偵測
ok('出生點(150,294)範圍內有互動點', I.inRange(150, 294).length >= 1, JSON.stringify(I.inRange(150, 294).map(p => p.id)));
ok('遠處(300,100)範圍內無互動點', I.nearestInRange(300, 100) === null);

// T4 觸發第一點 → 進度 +1
const r1 = I.tryInteract(150, 294);
ok('觸發成功', r1.ok === true, 'point=' + (r1.point && r1.point.id));
ok('進度變 1', Q.state().progress === 1, 'progress=' + Q.state().progress);

// T5 同點不重複計數（已觸發後該點移出範圍）
const r1b = I.tryInteract(150, 294);
ok('同地點再按E不重複觸發', r1b.ok === false);
ok('進度仍為 1', Q.state().progress === 1, 'progress=' + Q.state().progress);

// T6 觸發另外兩點 → 目標1 完成 → 解鎖 KC1、推進到目標2
I.tryInteract(160, 290);
ok('進度變 2', Q.state().progress === 2, 'progress=' + Q.state().progress);
const r3 = I.tryInteract(140, 290);
ok('第三點觸發成功', r3.ok === true);
ok('目標1完成後推進到 index=1', Q.state().index === 1, 'index=' + Q.state().index);
ok('解鎖知識卡 KC1', K.list().indexOf('KC1') >= 0, JSON.stringify(K.list()));
ok('仍未全部完成(還有目標2-4)', Q.state().done === false);

// T7 知識卡資料完整
const c = K.get('KC1');
ok('KC1 有標題', !!(c && c.title), c && c.title);
ok('KC1 有內文(>20字)', !!(c && c.body && c.body.length > 20), c && ('len=' + (c.body && c.body.length)));

// ── 增量 2:目標 2-4 + 依當前目標過濾 + 全部完成 ──
console.log('--- 增量 2 ---');
// 此時已在目標 2(index=1, need=2)
ok('目標2 需要 2 點', Q.state().need === 2, 'need=' + Q.state().need);
// T8 依當前目標過濾:目標2階段,目標3的點(天雨洞 300,250)不可互動;目標2步道點才可
ok('過濾:目標3的點在目標2階段不在範圍', I.inRange(300, 250).length === 0, JSON.stringify(I.inRange(300, 250)));
ok('當前目標(2)步道點可互動', I.inRange(186, 276).length >= 1, JSON.stringify(I.inRange(186, 276).map(p => p.id)));
// T9 完成目標2(2 點)→ KC2、推進目標3
I.tryInteract(186, 276);
ok('目標2 進度1', Q.state().progress === 1, 'progress=' + Q.state().progress);
I.tryInteract(216, 240);
ok('目標2完成→index=2', Q.state().index === 2, 'index=' + Q.state().index);
ok('解鎖 KC2', K.list().indexOf('KC2') >= 0, JSON.stringify(K.list()));
// T10 完成目標3(天雨洞)→ KC3、推進目標4
I.tryInteract(300, 250);
ok('目標3完成→index=3', Q.state().index === 3, 'index=' + Q.state().index);
ok('解鎖 KC3', K.list().indexOf('KC3') >= 0);
// T11 完成目標4(觀景台)→ 全部完成、KC4
var rLast = I.tryInteract(332, 44);
ok('目標4 觸發成功', rLast.ok === true);
ok('全部完成 done=true', Q.state().done === true, 'done=' + Q.state().done);
ok('事件 all-complete', Q.state().event === 'all-complete', Q.state().event);
ok('解鎖 KC4(共4張)', K.list().length === 4, JSON.stringify(K.list()));

// ── 增量 3:NPC/敘事引導 talk 點(常駐、不消耗、quest 優先) ──
console.log('--- 增量 3: talk 點 ---');
SENXUN.cards.init(); Q.init(); I.init();   // 重置一輪(前面已跑到 done)
I.addTalk({ id: 'npc', x: 150, y: 298, label: '與巡守員對話', dialogue: { title: '巡守員', body: '歡迎來到柴山，沿著發光點調查海岸，再循指引上山。' } });
ok('talk 點已加入', I.talks().length === 1, '共' + I.talks().length);
ok('NPC 附近偵測到 talk 點', I.inRange(150, 300).some(p => p.id === 'npc'), JSON.stringify(I.inRange(150, 300).map(p => p.id)));
ok('quest 點優先於 talk(兩者都在範圍時)', I.inRange(150, 294)[0] && I.inRange(150, 294)[0].id !== 'npc', JSON.stringify(I.inRange(150, 294).map(p => p.id)));
var bp = Q.state().progress;
var tk = I.tryInteract(150, 300);
ok('觸發 talk 回傳 talk:true', tk.ok === true && tk.talk === true);
ok('talk 不推進任務', Q.state().progress === bp, 'progress=' + Q.state().progress);
var tk2 = I.tryInteract(150, 300);
ok('talk 可重複(不消耗)', tk2.ok === true && tk2.talk === true);
ok('NPC 不算進 nextTarget(導引只指任務點)', (function () { var nt = I.nextTarget(150, 300); return !nt || nt.id !== 'npc'; })());

console.log(`\n=== 總結 ===  ${pass} PASS / ${fail} FAIL  →  ${fail === 0 ? 'PASS ✅' : 'FAIL ❌'}`);
process.exit(fail === 0 ? 0 : 1);
