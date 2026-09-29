import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=path.resolve('video/ai-live');const timeline=JSON.parse(await fs.readFile(`${out}/timeline.json`,'utf8'));
const run=(args)=>new Promise((resolve,reject)=>{const p=spawn('ffmpeg',args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('close',c=>c?reject(Error(err.slice(-2500))):resolve())});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1920,height:1080}});await page.goto(`file://${out}/outro.html`);await page.screenshot({path:`${out}/outro.png`});await browser.close();
const cutStart=timeline.thinking+3,cutEnd=timeline.review-2,cut=cutEnd-cutStart;
const time=t=>Math.max(0,t-timeline.start-(t>=cutEnd?cut:0));const end=time(timeline.end);
const stamp=t=>{let ms=Math.round(t*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`};
const captions=[
[0,time(timeline.thinking),'Describe the change in your own words.'],
[time(timeline.thinking),time(timeline.review),'AI prepares the proposal.  (Processing wait shortened.)'],
[time(timeline.review),time(timeline.approval),'Review every allocation. You stay in control.'],
[time(timeline.approval),time(timeline.saved),'Approve the changes. The new marking structure is saved.'],
[time(timeline.saved),end,'Saved in Seltiv SLMS — verified after reloading.'],
];
await fs.writeFile(`${out}/captions.srt`,captions.map(([a,b,text],i)=>`${i+1}\n${stamp(a)} --> ${stamp(b)}\n${text}\n`).join('\n'));
const filter=`[0:v]trim=start=${timeline.start}:end=${cutStart},setpts=PTS-STARTPTS[a];[0:v]trim=start=${cutEnd}:end=${timeline.end},setpts=PTS-STARTPTS[b];[a][b]concat=n=2:v=1:a=0,fps=30,scale=1920:1080,drawbox=x=0:y=1012:w=iw:h=68:color=0x0a303e:t=fill,subtitles=${out}/captions.srt:force_style='FontName=Arial,FontSize=8,PrimaryColour=&H00FFFFFF,Outline=0,Shadow=0,MarginV=6'[screen];[1:v]trim=duration=7,setpts=PTS-STARTPTS,fps=30,fade=t=in:st=0:d=0.5[outro];[screen][outro]concat=n=2:v=1:a=0[v]`;
await run(['-y','-i',`${out}/raw/workflow.webm`,'-loop','1','-i',`${out}/outro.png`,'-filter_complex',filter,'-map','[v]','-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-threads','4','-movflags','+faststart',`${out}/seltiv-ai-live.mp4`]);
console.log(`Rendered actual product recording. ${(end+7).toFixed(2)} seconds, 1920×1080, silent.`);
