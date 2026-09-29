// Renders video/grading-walkthrough/raw/walkthrough.webm into the captioned walkthrough MP4.
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
const out = path.resolve('video/grading-walkthrough');
const t = JSON.parse(await fs.readFile(`${out}/timeline.json`, 'utf8'));
const run = (args) => new Promise((resolve, reject) => { const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', (d) => (err += d)); p.on('close', (c) => (c ? reject(Error(err.slice(-2500))) : resolve())); });

const slates = {
  intro: ['SELTIV SLMS · EXAMS &amp; GRADES', 'Grading, done by<br><em>the office.</em>', 'A whole section’s marks in, the school’s report card out.', 'LIVE PRODUCT RECORDING · DEMO DATA'],
  outro: ['SELTIV SLMS · EXAMS &amp; GRADES', 'From marks to report cards,<br><em>in one sitting.</em>', 'With Seltiv SLMS.', 'ENTER.  PROCESS.  PRINT.'],
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
  [0, rel(t.grading), 'The office opens the exam and chooses Enter grades.'],
  [rel(t.grading), rel(t.math), 'Pick a section. Every subject and paper has its own tab.'],
  [rel(t.math), rel(t.save), 'Type the section’s marks. Converted (a), (b), total and grade are calculated as you go.'],
  [rel(t.save), rel(t.records), 'Save — Mathematics is complete for all 12 students.'],
  [rel(t.records), rel(t.summary), 'Add attendance and the class teacher’s remarks.'],
  [rel(t.summary), rel(t.process), 'The summary shows every subject, the GPA and each student’s position.'],
  [rel(t.process), rel(t.card), 'Process the results — as a draft first, publish when ready.'],
  [rel(t.card), end, 'The report card, in the school’s own format — ready to print or share.'],
];
await fs.writeFile(`${out}/captions.srt`, captions.map(([a, b, text], i) => `${i + 1}\n${stamp(a)} --> ${stamp(b)}\n${text}\n`).join('\n'));

// Slow zoom into the report card: full page → marks table → summary and remarks. Coordinates are in the 1600×900 recording.
const ease = (a, b) => `(st(0,clip((on/30-${a})/${b - a},0,1)); ld(0)*ld(0)*(3-2*ld(0)))`;
const z = `1+0.5*${ease(1.2, 2.8)}`;
const cx = `800+150*${ease(1.2, 2.8)}`;
const cy = `450-110*${ease(1.2, 2.8)}+270*${ease(4.8, 6.4)}`;
const zoom = `zoompan=z='${z}':x='clip((${cx})-iw/zoom/2,0,iw-iw/zoom)':y='clip((${cy})-ih/zoom/2,0,ih-ih/zoom)':d=1:s=1920x1080:fps=30`;
const cut = t.pdf + 0.6;
const filter = [
  `[0:v]trim=start=${t.start}:end=${cut},setpts=PTS-STARTPTS,fps=30,scale=1920:1080,setsar=1[a]`,
  `[0:v]trim=start=${cut}:end=${t.end},setpts=PTS-STARTPTS,fps=30,${zoom},setsar=1[b]`,
  `[a][b]concat=n=2:v=1:a=0,drawbox=x=0:y=1012:w=iw:h=68:color=0x0a303e:t=fill,subtitles=${out}/captions.srt:force_style='FontName=Arial,FontSize=8,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,MarginV=6'[screen]`,
  `[1:v]trim=duration=3.5,setpts=PTS-STARTPTS,fps=30,setsar=1,fade=t=out:st=3.1:d=0.4[intro]`,
  `[2:v]trim=duration=6,setpts=PTS-STARTPTS,fps=30,setsar=1,fade=t=in:st=0:d=0.5[outro]`,
  `[intro][screen][outro]concat=n=3:v=1:a=0[v]`,
].join(';');
await run(['-y', '-i', `${out}/raw/walkthrough.webm`, '-loop', '1', '-i', `${out}/intro.png`, '-loop', '1', '-i', `${out}/outro.png`, '-filter_complex', filter, '-map', '[v]', '-an', '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-threads', '4', '-movflags', '+faststart', `${out}/seltiv-grading-walkthrough.mp4`]);
console.log(`Rendered ${(3.5 + end + 6).toFixed(1)} s, 1920×1080, captions only.`);
