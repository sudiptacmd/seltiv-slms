// Records the admin grading walkthrough in the real UI. Run seed-grading-video.mjs first.
// Uses Playwright's full Chromium (channel "chromium") so the report card opens in the built-in PDF viewer.
import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
const out = 'video/grading-walkthrough', base = 'http://localhost:3000';
await fs.mkdir(`${out}/raw`, { recursive: true });
const ctxInfo = JSON.parse(await fs.readFile(`${out}/context.json`, 'utf8'));
const grading = `/admin/exams/${ctxInfo.examId}/grading?section=${ctxInfo.sectionId}`;
const REMARK = 'The result is satisfactory. Try hard to keep up such progress.';

const browser = await chromium.launch({ channel: 'chromium' });
const warm = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const login = await warm.newPage();
await login.goto(`${base}/login`);
await login.getByPlaceholder('01700000000').fill('01700000001');
await login.locator('input[type=password]').fill('password123');
await login.getByRole('button', { name: 'Sign in', exact: true }).click();
await login.waitForURL('**/admin');
for (const path of ['/admin/exams', grading, `${grading}&tab=math`, `${grading}&tab=records`, `${grading}&tab=summary`]) await login.goto(base + path); // compile routes off-camera
const state = await warm.storageState();
await warm.close();

const ctx = await browser.newContext({ storageState: state, viewport: { width: 1600, height: 900 }, recordVideo: { dir: `${out}/raw`, size: { width: 1600, height: 900 } } });
await ctx.addInitScript(() => { document.addEventListener('DOMContentLoaded', () => {
  // Only on the app's own pages — not inside the PDF viewer or its internal frames.
  if (!document.head || location.origin !== 'http://localhost:3000' || location.pathname.startsWith('/print/')) return;
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

const t = {};
await p.goto(`${base}/admin/exams`); await settle();
t.start = at(); await sleep(1400);
const examPanel = p.locator('section, div').filter({ has: p.getByText('Second Term Examination 2026', { exact: true }) }).filter({ has: p.locator(`a[href="/admin/exams/${ctxInfo.examId}/grading"]`) }).last();
await point(examPanel.getByText('Second Term Examination 2026', { exact: true })); await sleep(700);
await click(p.locator(`a[href="/admin/exams/${ctxInfo.examId}/grading"]`));
await p.getByRole('heading', { name: 'Grading — Second Term Examination 2026' }).waitFor(); await settle();
t.grading = at(); await sleep(1600);
await point(p.getByRole('link', { name: 'Class 8 B' })); await sleep(500);
await point(p.getByRole('link', { name: /Bangla 1st Paper/ })); await sleep(900);

t.math = at();
await click(p.getByRole('link', { name: /^Mathematics/ }));
await p.getByText('Mathematics · full marks 100').waitFor(); await settle(); await sleep(1200);
t.typing = at();
const rows = p.locator('tbody tr');
for (const [i, r] of ctxInfo.onCamera.math.entries()) {
  const order = ['written', 'objective', 'oral', 'attendance', 'assignment', 'ct', 'diary'];
  await click(rows.nth(i).locator('input[name$="_written"]'), 14);
  for (const [j, f] of order.entries()) {
    await p.keyboard.type(String(r.values[f]), { delay: i === 0 ? 95 : 45 });
    if (j < order.length - 1) { await sleep(i === 0 ? 260 : 90); await p.keyboard.press('Tab'); }
  }
  await sleep(i === 0 ? 1600 : 500);
}
await expect(p.getByText('12/12 complete', { exact: false })).toBeVisible();
await point(rows.nth(0).locator('td').nth(-4)); await sleep(1400);
t.save = at();
await click(p.getByRole('button', { name: 'Save Mathematics' }));
await expect(p.getByText('Mathematics: saved — 12 of 12 students complete.')).toBeVisible(); await sleep(2000);

t.records = at();
await click(p.getByRole('link', { name: 'Attendance & remarks' }));
await p.getByText('Working days for everyone').waitFor(); await settle(); await sleep(1300);
await click(p.getByLabel(/remarks$/).first(), 18);
await p.keyboard.type(REMARK, { delay: 28 }); await sleep(700);
await click(p.getByRole('button', { name: 'Save attendance & remarks' }));
await expect(p.getByText(/Attendance and remarks saved/)).toBeVisible(); await sleep(1800);

t.summary = at();
await click(p.getByRole('link', { name: 'Summary', exact: true }));
await p.getByText(/Class 8 A · 12 students/i).waitFor(); await settle(); await sleep(1400);
const star = p.locator('tbody tr').first();
for (const n of [2, 6, 12]) { await point(star.locator('td').nth(n), 30); await sleep(650); }
await point(star.locator('td').nth(-2), 30); await sleep(1200);

t.process = at();
await click(p.getByRole('button', { name: 'Process (draft)' }));
await expect(p.getByText(/Processed \d+ students \(draft/)).toBeVisible(); await sleep(2200);

t.card = at();
const cardLink = star.getByRole('link', { name: 'Report card' });
await cardLink.evaluate((a) => a.removeAttribute('target')); // open in this tab so it stays in the recording
await click(cardLink);
await p.waitForURL(/print\/gradesheet/); await sleep(1500);
t.pdf = at();
await p.mouse.move(1590, 880, { steps: 12 }); await sleep(9000); // held still; the render zooms into the card
await p.screenshot({ path: `${out}/report-card.png` });
t.end = at();
if (errors.length) throw Error(errors.join('\n'));
const video = p.video(); await ctx.close(); await video.saveAs(`${out}/raw/walkthrough.webm`); await browser.close();

// Confirm what the video shows actually landed in the database.
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');
const db = mongoose.connection.db, oid = (s) => new mongoose.Types.ObjectId(s);
const math = await db.collection('gradeentries').countDocuments({ exam: oid(ctxInfo.examId), section: oid(ctxInfo.sectionId), row: 'math' });
const res = await db.collection('results').find({ exam: oid(ctxInfo.examId), section: oid(ctxInfo.sectionId) }).toArray();
const top = res.find((r) => r.sectionRank === 1);
await mongoose.disconnect();
if (math !== 12 || res.length !== 12 || !top?.rows?.length || top.remarks !== REMARK) throw Error(`Persistence check failed: math=${math} results=${res.length}`);
await fs.writeFile(`${out}/timeline.json`, JSON.stringify(t, null, 2));
console.log(`Recorded ${(t.end - t.start).toFixed(1)}s. Verified: 12 Mathematics rows saved, 12 results processed, remark stored.`, t);
