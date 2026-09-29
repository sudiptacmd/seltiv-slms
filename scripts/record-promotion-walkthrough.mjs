// Records the year-end promotion walkthrough in the real UI. Run seed-promotion-video.mjs first.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
const out = 'video/promotion', base = 'http://localhost:3000';
await fs.mkdir(`${out}/raw`, { recursive: true });
const ctxInfo = JSON.parse(await fs.readFile(`${out}/context.json`, 'utf8'));
const [failedA, failedB] = ctxInfo.failed;

const browser = await chromium.launch({ channel: 'chromium' });
const warm = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const login = await warm.newPage();
await login.goto(`${base}/login`);
await login.getByPlaceholder('01700000000').fill('01700000001');
await login.locator('input[type=password]').fill('password123');
await login.getByRole('button', { name: 'Sign in', exact: true }).click();
await login.waitForURL('**/admin');
await login.goto(`${base}/admin/students/promote`); // compile routes off-camera (2027 doesn't exist yet, so /pending & plan compile on the recording's first visit otherwise)
const state = await warm.storageState();
await warm.close();

const ctx = await browser.newContext({ storageState: state, viewport: { width: 1600, height: 900 }, recordVideo: { dir: `${out}/raw`, size: { width: 1600, height: 900 } } });
await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => {
  if (!document.head || location.origin !== 'http://localhost:3000') return;
  const style = document.createElement('style'); style.textContent = 'nextjs-portal{display:none!important} *{cursor:none!important}'; document.head.append(style);
  const cursor = document.createElement('div'); cursor.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;left:800px;top:450px;width:26px;height:34px;filter:drop-shadow(0 2px 3px #0005)';
  cursor.innerHTML = '<svg width="26" height="34" viewBox="0 0 28 36"><path d="M3 2L3 28L10 21L16 33L21 30L15 19L25 18Z" fill="white" stroke="#173d4b" stroke-width="2"/></svg>'; document.body.append(cursor);
  let last = null; try { last = sessionStorage.getItem('demo-cursor'); } catch {} if (last) { const [x, y] = last.split(','); cursor.style.left = x + 'px'; cursor.style.top = y + 'px'; }
  document.addEventListener('mousemove', (e) => { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; try { sessionStorage.setItem('demo-cursor', `${e.clientX},${e.clientY}`); } catch {} });
  document.addEventListener('mousedown', (e) => { const dot = document.createElement('i'); dot.style.cssText = `position:fixed;z-index:2147483646;pointer-events:none;left:${e.clientX - 18}px;top:${e.clientY - 18}px;width:36px;height:36px;border:3px solid #0088b0;border-radius:50%`; document.body.append(dot); dot.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 650 }).onfinish = () => dot.remove(); });
}); });
const p = await ctx.newPage();
const errors = []; p.on('pageerror', (e) => errors.push(e.message));
const epoch = Date.now(), at = () => (Date.now() - epoch) / 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let mouse = { x: 800, y: 450 };
async function point(loc, steps = 24) { await loc.scrollIntoViewIfNeeded(); const b = await loc.boundingBox(); mouse = { x: b.x + b.width / 2, y: b.y + b.height / 2 }; await p.mouse.move(mouse.x, mouse.y, { steps }); await sleep(280); }
async function click(loc, steps) { await point(loc, steps); await p.mouse.down(); await sleep(90); await p.mouse.up(); }
const settle = async () => { await p.waitForLoadState('networkidle'); await p.mouse.move(mouse.x, mouse.y); };
const row = (name) => p.locator('tr').filter({ hasText: name });

const t = {};
await p.goto(`${base}/admin/students/promote`); await settle();
t.start = at(); await sleep(2200);
await click(p.getByRole('button', { name: 'Create next academic year' }));
await p.getByText('Ready to promote').waitFor(); await settle();
t.overview = at(); await sleep(1800);
for (const label of ['Ready to promote', 'Need review', 'New admissions']) { await point(p.getByText(label, { exact: true }), 26); await sleep(750); }
await point(p.locator('tr').filter({ hasText: 'Class 7' }).first().locator('td').nth(1), 26); await sleep(1200);

t.plan = at();
await click(p.getByRole('link', { name: 'Plan Class 7' }));
await p.getByRole('heading', { name: /Class 7 · 2027/ }).waitFor(); await settle(); await sleep(1800);
await point(row(failedA).getByText('Failed'), 30); await sleep(1100);
t.untick = at();
await click(row(ctxInfo.held).getByRole('checkbox'), 30); await sleep(1300);

t.sizes = at();
await click(p.getByPlaceholder('e.g. 10'), 30);
await p.keyboard.type('9', { delay: 200 }); await sleep(600);
await click(p.getByRole('button', { name: 'Apply to all' })); await sleep(1300);
t.addsection = at();
await click(p.getByRole('button', { name: '+ Add section' })); await sleep(1500);
await expect(p.getByLabel('Size of section C')).toBeVisible();
await point(p.getByText(/students but only/).or(p.getByText('Sections in 2027')), 20); await sleep(500);
t.fill = at();
await click(p.getByRole('button', { name: 'Fill sections in order' })); await sleep(1600);
await p.mouse.move(700, 600, { steps: 20 }); await p.mouse.wheel(0, 700); await sleep(1600); await p.mouse.wheel(0, 700); await sleep(1600);
await p.mouse.wheel(0, -3000); await sleep(900);
t.confirm = at();
const confirmBtn = p.getByRole('button', { name: /^Promote \d+ students to Class 7/ });
await expect(confirmBtn).toBeEnabled();
await point(confirmBtn, 30); await sleep(1000);
await click(confirmBtn);
await p.waitForURL('**/admin/students/promote'); await p.getByText('Ready to promote').waitFor(); await settle();
t.done = at(); await sleep(2600);

t.pending = at();
await click(p.getByRole('link', { name: 'Promote manually' }));
await p.getByRole('heading', { name: 'Not promoted yet' }).waitFor(); await settle(); await sleep(2200);
t.manual = at();
const held = row(ctxInfo.held);
await point(held.locator('select'), 30); await sleep(900);
const optC = await held.locator('select option', { hasText: 'Class 7 C' }).getAttribute('value');
await held.locator('select').selectOption(optC); await sleep(1200);
await click(held.getByRole('button', { name: 'Place' }));
await expect(row(ctxInfo.held)).toHaveCount(0); await settle(); await sleep(1800);

t.retain = at();
const fr = row(failedA);
await point(fr.locator('select'), 30); await sleep(900);
const optKeep = await fr.locator('select option', { hasText: /Keep in|Class 6 [AB] —/ }).first().getAttribute('value');
await fr.locator('select').selectOption(optKeep); await sleep(1200);
await click(fr.getByRole('button', { name: 'Place' }));
await expect(row(failedA)).toHaveCount(0); await settle(); await sleep(1800);
await point(row(failedB), 30); await sleep(1500);

t.back = at();
await click(p.getByRole('link', { name: 'Promotion', exact: true }).last());
await p.getByText('Ready to promote').waitFor(); await settle(); await sleep(3200);
t.end = at();
if (errors.length) throw Error(errors.join('\n'));
const video = p.video(); await ctx.close(); await video.saveAs(`${out}/raw/walkthrough.webm`); await browser.close();

await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');
const db = mongoose.connection.db;
const y27 = await db.collection('academicyears').findOne({ name: '2027' });
const c7 = await db.collection('classes').findOne({ numeric: 7 });
const secs = await db.collection('sections').find({ klass: c7._id }).sort({ name: 1 }).toArray();
const counts = {}; for (const s of secs) counts[s.name] = await db.collection('enrollments').countDocuments({ year: y27._id, section: s._id });
const total = await db.collection('enrollments').countDocuments({ year: y27._id });
const retained = await db.collection('enrollments').countDocuments({ status: 'retained' });
const enrolled = await db.collection('admissionapplications').countDocuments({ demoPromotion: true, stage: 'enrolled' });
await mongoose.disconnect();
if (total !== 28 || enrolled !== 5 || counts.A !== 9 || counts.B !== 9 || counts.C !== 9 || retained < 1) throw Error(`Persistence check failed ${JSON.stringify({ counts, total, enrolled, retained })}`);
await fs.writeFile(`${out}/timeline.json`, JSON.stringify(t, null, 2));
console.log(`Recorded ${(t.end - t.start).toFixed(1)}s. Verified:`, counts, `total ${total}, ${enrolled} new admissions enrolled.`, t);
