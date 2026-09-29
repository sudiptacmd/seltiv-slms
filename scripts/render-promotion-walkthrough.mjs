// Renders video/promotion/raw/walkthrough.webm into the captioned promotion walkthrough MP4.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const out = path.resolve('video/promotion');
const t = JSON.parse(await fs.readFile(`${out}/timeline.json`, 'utf8'));
const run = (args) => new Promise((resolve, reject) => { const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', (d) => (err += d)); p.on('close', (c) => (c ? reject(Error(err.slice(-2500))) : resolve())); });

const slates = {
  intro: ['SELTIV SLMS · STUDENTS', 'Year-end promotion,<br><em>class by class.</em>', 'Promoted students and new admissions, seated in next year’s sections.', 'LIVE PRODUCT RECORDING · DEMO DATA'],
  outro: ['SELTIV SLMS · STUDENTS', 'A new session,<br><em>without the spreadsheet.</em>', 'With Seltiv SLMS.', 'REVIEW.  PLACE.  PROMOTE.'],
};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const [name, [eyebrow, title, sub, foot]] of Object.entries(slates)) {
  await page.goto(`file://${out}/slate.html`);
  await page.evaluate(([e, ti, s, f]) => { eyebrow.innerHTML = e; title.innerHTML = ti; document.getElementById('sub').innerHTML = s; document.getElementById('foot').innerHTML = f; }, [eyebrow, title, sub, foot]);
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();

const rel = (x) => Math.max(0, x - t.start), end = rel(t.end);
const stamp = (s) => { const ms = Math.round(s * 1000); return `${String(Math.floor(ms / 3600000)).padStart(2, '0')}:${String(Math.floor(ms / 60000) % 60).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const captions = [
  [0, rel(t.overview), 'At year end the office opens Promotion and creates the next academic year.'],
  [rel(t.overview), rel(t.plan), 'One view: who is ready, who needs review, and the new admissions waiting for a seat.'],
  [rel(t.plan), rel(t.untick), 'Plan Class 7 — last year’s Class 6 students and the new admissions, together.'],
  [rel(t.untick), rel(t.sizes), 'Students who failed are unticked automatically. Untick anyone else to hold them back.'],
  [rel(t.sizes), rel(t.addsection), 'Set how many students each section should hold.'],
  [rel(t.addsection), rel(t.fill), 'Need more room? Add a new section.'],
  [rel(t.fill), rel(t.confirm), 'Fill the sections in order — and adjust any student by hand.'],
  [rel(t.confirm), rel(t.done), 'Confirm: everyone is enrolled in 2027 with a roll number.'],
  [rel(t.done), rel(t.pending), 'The overview updates — sections show their new head counts.'],
  [rel(t.pending), rel(t.manual), 'Students left out wait under “Not promoted yet”.'],
  [rel(t.manual), rel(t.retain), 'Promote a held-back student later, into any section with a free seat.'],
  [rel(t.retain), rel(t.back), 'Or keep them in their current class for another year.'],
  [rel(t.back), end, 'Every seat accounted for — ready for the new session.'],
];
await fs.writeFile(`${out}/captions.srt`, captions.map(([a, b, text], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${text}\n`).join('\n'));

const filter = [
  `[0:v]trim=start=${t.start}:end=${t.end},setpts=PTS-STARTPTS,fps=30,scale=1920:1080,setsar=1,drawbox=x=0:y=1012:w=iw:h=68:color=0x0a303e:t=fill,subtitles=${out}/captions.srt:force_style='FontName=Arial,FontSize=8,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,MarginV=6'[screen]`,
  `[1:v]trim=duration=3.5,setpts=PTS-STARTPTS,fps=30,setsar=1,fade=t=out:st=3.1:d=0.4[intro]`,
  `[2:v]trim=duration=6,setpts=PTS-STARTPTS,fps=30,setsar=1,fade=t=in:st=0:d=0.5[outro]`,
  `[intro][screen][outro]concat=n=3:v=1:a=0[v]`,
].join(';');
await run(['-y', '-i', `${out}/raw/walkthrough.webm`, '-loop', '1', '-i', `${out}/intro.png`, '-loop', '1', '-i', `${out}/outro.png`, '-filter_complex', filter, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-threads', '4', '-movflags', '+faststart', `${out}/seltiv-promotion-walkthrough.mp4`]);
console.log(`Rendered ${(3.5 + end + 6).toFixed(1)} s, 1920×1080, captions only.`);
