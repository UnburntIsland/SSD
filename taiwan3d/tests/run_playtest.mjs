/* run_playtest.mjs — 一鍵最小自動遊玩測試(每次修正後執行)。
 *
 * 跑兩層測試並把結果「自動寫入」repo 根目錄的 AUTONOMOUS_DEV_LOG.md:
 *   Tier 1 (零安裝, Node):  logic_smoke.cjs(地形/移動/碰撞)、slice_logic.cjs(互動/任務/知識卡)
 *   Tier 2 (Playwright, 真瀏覽器, playtest.spec.mjs) 涵蓋使用者要求的 1-9:
 *     1 本機 server 開 south.html  2 等 three.js canvas  3 無 JS error
 *     4 模擬 W/D/S/A  5 玩家 tile 改變  6 HUD 顯示地點/任務
 *     7 移動到第一個互動點  8 觸發互動鍵 E  9 知識卡/任務狀態出現
 *   10 = 本檔把結果寫入 AUTONOMOUS_DEV_LOG.md
 *
 * 用法:  npm run playtest    (或) node tests/run_playtest.mjs
 * 結束碼:0=全綠;1=有失敗。
 */
import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));   // taiwan3d/tests
const t3d = join(here, '..');                            // taiwan3d
const logPath = join(t3d, '..', 'AUTONOMOUS_DEV_LOG.md');// repo 根

function run(cmd) {
  try { return { ok: true, out: execSync(cmd, { cwd: t3d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; }
  catch (e) { return { ok: false, out: ((e.stdout || '') + (e.stderr || '')) }; }
}

console.log('▶ Tier 1 (node) …');
const r1 = run('node tests/logic_smoke.cjs');
const r2 = run('node tests/slice_logic.cjs');
console.log('▶ Tier 2 (playwright) …');
const r3 = run('npx playwright test');

function num(re, s) { const m = s.match(re); return m ? m[1] : null; }
const passed = num(/(\d+) passed/, r3.out), failed = num(/(\d+) failed/, r3.out), skipped = num(/(\d+) skipped/, r3.out);
const t1 = `logic_smoke:${r1.ok ? 'PASS' : 'FAIL'}`;
const t2 = `slice_logic:${r2.ok ? 'PASS' : 'FAIL'}`;
const pw = `playwright:${r3.ok ? 'PASS' : 'FAIL'}(${passed || '?'}P${failed ? '/' + failed + 'F' : ''}${skipped ? '/' + skipped + 'S' : ''})`;
const allOk = r1.ok && r2.ok && r3.ok;

// 時間戳(允許在一般 node 腳本使用 Date)
const stamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
const line = `- \`${stamp}\` — ${t1} · ${t2} · ${pw} → ${allOk ? 'ALL GREEN ✅' : 'FAIL ❌'}`;

const MARK = '## 🤖 自動測試紀錄 (run_playtest.mjs, append-only)';
if (existsSync(logPath)) {
  const content = readFileSync(logPath, 'utf8');
  if (!content.includes(MARK)) appendFileSync(logPath, `\n\n---\n\n${MARK}\n\n`);
  appendFileSync(logPath, line + '\n');
  console.log('✎ 已寫入 AUTONOMOUS_DEV_LOG.md');
} else {
  console.log('⚠ 找不到 AUTONOMOUS_DEV_LOG.md,略過寫入');
}

console.log('\n' + line.replace(/^- /, ''));
if (!allOk) {
  if (!r1.ok) console.log('\n--- logic_smoke 末段 ---\n' + r1.out.split('\n').slice(-8).join('\n'));
  if (!r2.ok) console.log('\n--- slice_logic 末段 ---\n' + r2.out.split('\n').slice(-8).join('\n'));
  if (!r3.ok) console.log('\n--- playwright 末段 ---\n' + r3.out.split('\n').filter(l => !/GET \//.test(l)).slice(-14).join('\n'));
}
process.exit(allOk ? 0 : 1);
