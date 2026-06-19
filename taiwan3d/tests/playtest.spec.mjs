// playtest.spec.mjs — Tier 2 瀏覽器遊玩測試
//
// 對應 PLAYTEST_SPEC.md §5.4。Phase 0 = 現有 build 今天就能驗的項目;
// Phase 1(互動/任務/知識卡)在 GAMEPLAY_VERTICAL_SLICE 做出來前先 skip,
// 待 SENXUN.debug 掛鉤與遊戲系統完成後再啟用。
import { test, expect } from '@playwright/test';

const PAGE = '/south.html';

// 等遊戲就緒:THREE 載入、main.js 跑完 build、canvas 出現
async function waitReady(page) {
  await page.waitForFunction(
    () => !!(window.THREE && window.SENXUN && window.SENXUN.player && window.SENXUN.player.tile && document.querySelector('canvas')),
    null, { timeout: 15000 }
  );
}

// 讀玩家狀態(座標/地形碼/離岸距離/地名)
async function readState(page) {
  return page.evaluate(() => {
    const t = window.SENXUN.player.tile();
    const r = window.SENXUN.regions.at(t.x, t.y);
    return {
      x: t.x, y: t.y,
      terr: window.SENXUN.height.terrAt(Math.floor(t.x), Math.floor(t.y)),
      inland: window.SENXUN.south.inland(t.x, t.y),
      region: r && r.name,
    };
  });
}

// 收集 console error / pageerror
function attachErrorCollector(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  return errors;
}

// 等 SENXUN.debug 測試掛鉤就緒
async function waitReadyDebug(page) {
  await page.waitForFunction(
    () => !!(window.SENXUN && window.SENXUN.debug && window.SENXUN.debug.quest && document.querySelector('canvas')),
    null, { timeout: 15000 }
  );
}
async function debugState(page) {
  return page.evaluate(() => ({
    tile: window.SENXUN.debug.tile(),
    quest: window.SENXUN.debug.quest(),
    inRange: window.SENXUN.debug.interactablesInRange(),
    cards: window.SENXUN.debug.cards(),
  }));
}
async function pressE(page) {
  await page.keyboard.down('e'); await page.waitForTimeout(70); await page.keyboard.up('e');
  await page.waitForTimeout(150);
}
// 確定性關閉開始畫面 + 取得鍵盤焦點
async function startGame(page) {
  await page.evaluate(() => window.SENXUN.ui.dismissStart());
  await page.locator('body').click();
}
async function shot(page, name) { await page.screenshot({ path: 'tests/shots/' + name, animations: 'disabled' }); }
// 依固定鏡頭按鍵對應(W=內陸/y減, S=向海/y增, A=x增, D=x減)走向目標 tile。
// 持續壓著鍵(只在方向改變時調整);maxMs 寬鬆,因 headless 軟體渲染下移動偏慢(dt 上限造成慢動作)。
async function walkToward(page, tx, ty, maxMs = 20000) {
  let held = [];
  const release = async () => { for (const k of held) await page.keyboard.up(k); held = []; };
  let elapsed = 0; const step = 160;
  while (elapsed < maxMs) {
    const t = await page.evaluate(() => window.SENXUN.debug.tile());
    if (Math.hypot(tx - t.x, ty - t.y) < 6) { await release(); return true; }
    const want = [];
    if (ty - t.y < -1) want.push('w'); else if (ty - t.y > 1) want.push('s');
    if (tx - t.x > 1) want.push('d'); else if (tx - t.x < -1) want.push('a'); // D=+x, A=-x(修正後)
    for (const k of held) if (!want.includes(k)) await page.keyboard.up(k);
    for (const k of want) if (!held.includes(k)) await page.keyboard.down(k);
    held = want;
    await page.waitForTimeout(step);
    elapsed += step;
  }
  await release();
  return false;
}

test.describe('Phase 0 — 現有 build 基線', () => {
  test('1. 載入無 console error、three.js 就緒、#err 為空', async ({ page }) => {
    const errors = attachErrorCollector(page);
    await page.goto(PAGE);
    await waitReady(page);
    await page.waitForTimeout(600);
    const errBox = (await page.textContent('#err')) || '';
    expect(errors, '不應有 console/page error:\n' + errors.join('\n')).toHaveLength(0);
    expect(errBox.trim(), '#err 面板應為空').toBe('');
  });

  test('2. 場景渲染出有尺寸的 canvas、標題正確', async ({ page }) => {
    await page.goto(PAGE);
    await waitReady(page);
    const info = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return { w: c ? c.width : 0, h: c ? c.height : 0, title: document.title };
    });
    expect(info.w, 'canvas 寬度 > 0').toBeGreaterThan(0);
    expect(info.h, 'canvas 高度 > 0').toBeGreaterThan(0);
    expect(info.title).toContain('森循島');
    await shot(page, '00-initial.png');
  });

  test('3. 按 W:座標改變、朝內陸前進、未掉海', async ({ page }) => {
    await page.goto(PAGE);
    await waitReady(page);
    await startGame(page); // 確保鍵盤事件有目標
    const before = await readState(page);
    await page.keyboard.down('w');
    await page.waitForTimeout(1300);
    await page.keyboard.up('w');
    const after = await readState(page);
    const moved = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(moved, '座標應有明顯改變').toBeGreaterThan(2);
    expect(after.inland, '應朝內陸前進(離岸距離增加)').toBeGreaterThan(before.inland);
    expect(after.terr, '不應掉進海裡').toBeGreaterThan(1);
    await shot(page, '01-after-W.png');
  });

  test('4. 按 S 朝海:海岸碰撞有效,全程未掉海', async ({ page }) => {
    await page.goto(PAGE);
    await waitReady(page);
    await startGame(page);
    await page.keyboard.down('s');
    let minTerr = 9;
    for (let i = 0; i < 8; i++) {
      await page.waitForTimeout(180);
      const s = await readState(page);
      if (s.terr < minTerr) minTerr = s.terr;
    }
    await page.keyboard.up('s');
    expect(minTerr, '朝海移動全程 terr 應 > 1(未入海)').toBeGreaterThan(1);
  });

  test('5. 方向鍵也能移動(等同 WASD)', async ({ page }) => {
    await page.goto(PAGE);
    await waitReady(page);
    await startGame(page);
    const before = await readState(page);
    await page.keyboard.down('ArrowUp');
    await page.waitForTimeout(1000);
    await page.keyboard.up('ArrowUp');
    const after = await readState(page);
    const moved = Math.abs(after.x - before.x) + Math.abs(after.y - before.y);
    expect(moved, '方向鍵應能移動').toBeGreaterThan(2);
    expect(after.terr).toBeGreaterThan(1);
  });

  test('6. UI:目前地點與目標文字皆非空', async ({ page }) => {
    await page.goto(PAGE);
    await waitReady(page);
    const region = ((await page.textContent('#region')) || '').trim();
    const goal = ((await page.textContent('#hud .goal')) || '').trim();
    expect(region.length, '地點銘牌應有文字').toBeGreaterThan(0);
    expect(goal.length, '目標 HUD 應有文字').toBeGreaterThan(0);
  });
});

// ───────────────────────────────────────────────────────────────
// Phase 1 — 互動 / 任務 / 知識卡(增量 1:目標 1 已實作)
// ───────────────────────────────────────────────────────────────
test.describe('Phase 1 — 互動/任務/知識卡', () => {
  test('7. 走近互動點按 E:提示出現、觸發後任務進度 +1', async ({ page }) => {
    await page.goto(PAGE);
    await waitReadyDebug(page);
    await startGame(page);
    const before = await debugState(page);
    expect(before.inRange.length, '第一個互動點應在出生點範圍內').toBeGreaterThan(0);
    expect(before.quest.progress, '初始進度為 0').toBe(0);
    expect(await page.evaluate(() => window.SENXUN.debug.markersActive()), '當前目標應有世界中發光標記').toBeGreaterThan(0);
    await expect(page.locator('#prompt'), '提示 UI 應顯示').toHaveClass(/show/);
    await pressE(page);
    const after = await debugState(page);
    expect(after.quest.progress, '按 E 後進度 +1').toBe(1);
    await shot(page, '02-after-interact.png');
  });

  test('9. 完成目標1(3 點)→ 解鎖知識卡 KC1、卡片彈窗出現', async ({ page }) => {
    test.setTimeout(60000); // headless 軟體渲染移動偏慢,需多走幾步
    await page.goto(PAGE);
    await waitReadyDebug(page);
    await startGame(page);
    await pressE(page);                          // ip1(出生點範圍內)
    await walkToward(page, 160, 290); await pressE(page); // ip2
    await walkToward(page, 140, 290); await pressE(page); // ip3
    const st = await debugState(page);
    expect(st.cards, 'KC1 應解鎖').toContain('KC1');
    expect(st.quest.index, '目標1完成→推進到目標2(index=1)').toBe(1);
    await expect(page.locator('#card'), '知識卡彈窗應出現').toHaveClass(/show/);
    await expect(page.locator('#card-title')).toContainText('珊瑚礁'); // KC1 標題
    await page.waitForTimeout(450); // 等淡入完成再截圖存證
    await shot(page, '03-card-KC1.png');
  });

  test('8. 全程 4 目標完成 → 解鎖 4 張卡 + 完成畫面', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(PAGE);
    await waitReadyDebug(page);
    await startGame(page); // 關開始畫面
    // 以公開 API 換成出生點附近群聚的互動點:流程/任務/UI 與正式完全相同,
    // 只是把「真實地圖上跨 200 格的爬山」壓縮成短程,避開 headless 軟體渲染的慢動作。
    const cluster = await page.evaluate(() => {
      const pts = [
        { id: 'c1', x: 150, y: 288, objective: 1, kind: 'inspect', label: '海岸A', triggered: false },
        { id: 'c2', x: 158, y: 289, objective: 1, kind: 'inspect', label: '海岸B', triggered: false },
        { id: 'c3', x: 142, y: 289, objective: 1, kind: 'inspect', label: '海岸C', triggered: false },
        { id: 'c4', x: 160, y: 286, objective: 2, kind: 'trailhead', label: '步道A', triggered: false },
        { id: 'c5', x: 140, y: 286, objective: 2, kind: 'monkey', label: '步道B', triggered: false },
        { id: 'c6', x: 152, y: 285, objective: 3, kind: 'cave', label: '洞穴', triggered: false },
        { id: 'c7', x: 148, y: 285, objective: 4, kind: 'restore', label: '修復', triggered: false }
      ];
      window.SENXUN.interactions.init(pts);
      return pts.map(p => ({ x: p.x, y: p.y, objective: p.objective }));
    });
    for (const objId of [1, 2, 3, 4]) {
      for (const p of cluster.filter(c => c.objective === objId)) {
        await walkToward(page, p.x, p.y);
        await pressE(page);
        if (await page.evaluate(() => window.SENXUN.ui.cardOpen())) await pressE(page); // 關閉解鎖的知識卡
      }
    }
    const cards = await page.evaluate(() => window.SENXUN.debug.cards());
    expect(cards.length, '4 張知識卡全解鎖').toBe(4);
    expect(await page.evaluate(() => window.SENXUN.debug.quest().done), '任務全部完成').toBe(true);
    expect(await page.evaluate(() => window.SENXUN.debug.restoreApplied()), '環境修復回饋應觸發(條件8)').toBe(true);
    await expect(page.locator('#complete'), '完成畫面應出現').toHaveClass(/show/);
    await page.waitForTimeout(450);
    await shot(page, '04-complete.png');
    // 復育後的山頂(環境回饋):關完成畫面、瞬移到山頂截圖
    await page.evaluate(() => { var c = document.getElementById('complete'); if (c) c.classList.remove('show'); window.SENXUN.debug.warp(332, 47); });
    await page.waitForTimeout(1200);
    await shot(page, '09-restored.png');
  });

  test('10. 世界中有 NPC/敘事引導物 + 巡守員對話可開啟', async ({ page }) => {
    await page.goto(PAGE);
    await waitReadyDebug(page);
    await startGame(page);
    const n = await page.evaluate(() => window.SENXUN.debug.npcCount());
    expect(n, '世界中應有 NPC + 解說牌(敘事引導物)').toBeGreaterThan(0);
    await page.evaluate(() => window.SENXUN.debug.talk());
    await expect(page.locator('#card'), '巡守員對話面板應出現').toHaveClass(/show/);
    await expect(page.locator('#card-tag')).toContainText('對話');
    await page.waitForTimeout(350);
    await shot(page, '05-npc-dialogue.png');
  });

  test('11. 環境美術物件已建立 + 各區截圖(海岸/步道/山頂)', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(PAGE);
    await waitReadyDebug(page);
    await startGame(page);
    const env = await page.evaluate(() => window.SENXUN.debug.envCount());
    expect(env, '環境美術物件數應 > 50').toBeGreaterThan(50);
    await page.waitForTimeout(400); await shot(page, '06-beach.png');
    await page.evaluate(() => window.SENXUN.debug.warp(250, 205)); await page.waitForTimeout(900); await shot(page, '07-trail.png');
    await page.evaluate(() => window.SENXUN.debug.warp(332, 48)); await page.waitForTimeout(900); await shot(page, '08-summit.png');
  });

  test('12. 移動方向符合畫面直覺(A→畫面左 / D→右 / W→上 / S→下)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(PAGE); await waitReadyDebug(page); await startGame(page);
    // 以「世界位移 · 相機螢幕軸」判定畫面方向(不受相機跟隨位移影響;非只看 world x/z)
    async function probe(key) {
      await page.evaluate(() => window.SENXUN.debug.warp(150, 289)); // 開闊海灘,四向可走
      await page.waitForTimeout(250);
      const b = await page.evaluate(() => { const p = window.SENXUN.player.pos(); return { x: p.x, y: p.y, z: p.z }; });
      await page.keyboard.down(key); await page.waitForTimeout(1200); await page.keyboard.up(key);
      return await page.evaluate((b) => {
        const p = window.SENXUN.player.pos(), a = window.SENXUN.debug.screenAxes();
        const dx = p.x - b.x, dy = p.y - b.y, dz = p.z - b.z;
        return { sdx: dx * a.rx + dy * a.ry + dz * a.rz, sdy: dx * a.ux + dy * a.uy + dz * a.uz, moved: Math.hypot(dx, dz) };
      }, b);
    }
    const A = await probe('a'); expect(A.moved, 'A 應有移動').toBeGreaterThan(2); expect(A.sdx, 'A → 畫面左(螢幕x變小)').toBeLessThan(0);
    const D = await probe('d'); expect(D.sdx, 'D → 畫面右').toBeGreaterThan(0);
    const W = await probe('w'); expect(W.sdy, 'W → 畫面上(螢幕y變大)').toBeGreaterThan(0);
    const S = await probe('s'); expect(S.sdy, 'S → 畫面下').toBeLessThan(0);
  });

  test('13. 角色近景截圖(模型 QA)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(PAGE); await waitReadyDebug(page); await startGame(page);
    await page.evaluate(() => window.SENXUN.debug.warp(150, 288));
    await page.evaluate(() => window.SENXUN.debug.closeup(true));
    await page.waitForTimeout(500);
    await shot(page, '10-character.png');
    await page.keyboard.down('w'); await page.waitForTimeout(500); await shot(page, '11-character-walk.png'); await page.keyboard.up('w');
    await page.evaluate(() => window.SENXUN.debug.closeup(false));
  });

  test('14. 探索碰撞:不穿過實體 + 不出關卡邊界', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto(PAGE); await waitReadyDebug(page); await startGame(page);
    expect(await page.evaluate(() => window.SENXUN.debug.colBlocked(150, 298)), 'NPC 為實體').toBe(true);
    expect(await page.evaluate(() => window.SENXUN.debug.colBlocked(150, 255)), '開闊地非實體').toBe(false);
    expect(await page.evaluate(() => window.SENXUN.debug.inBounds(20, 200)), '西側出界').toBe(false);
    // 走入 NPC(150,298):從北側壓 S 應被擋,不穿過
    await page.evaluate(() => window.SENXUN.debug.warp(150, 293)); await page.waitForTimeout(250);
    await page.keyboard.down('s'); await page.waitForTimeout(1500); await page.keyboard.up('s');
    const t1 = await page.evaluate(() => window.SENXUN.player.tile());
    expect(t1.y, 'NPC 擋住、未穿過(y 不超過 ~296)').toBeLessThan(297);
    // 東緣關卡邊界:壓 D 應停在邊界內
    await page.evaluate(() => window.SENXUN.debug.warp(354, 200)); await page.waitForTimeout(250);
    await page.keyboard.down('d'); await page.waitForTimeout(1500); await page.keyboard.up('d');
    const t2 = await page.evaluate(() => window.SENXUN.player.tile());
    expect(t2.x, '東緣邊界擋住(x≤~360)').toBeLessThan(361.5);
  });
});
