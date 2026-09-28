import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
const OUT=path.resolve('brag-output/interactive');
await fs.mkdir(`${OUT}/render`,{recursive:true});
const run=(cmd,args)=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:['ignore','ignore','pipe']});let err='';p.stderr.on('data',d=>err+=d);p.on('exit',c=>c?reject(Error(err.slice(-3000))):resolve());});
const order=['01-progress','02-notices','03-payment','19-print','04-teacher-day','05-attendance','06-marks','07-routine','08-subjects','09-publish','10-access','11-audit','12-monitor','13-batch','14-ledger','15-reconcile','16-plans','17-payroll','18-reports'];
const clips=await Promise.all(order.map(async id=>JSON.parse(await fs.readFile(`${OUT}/${id}.json`,'utf8'))));
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const segments=[];const chapters=[];let total=0;
const encode=['-an','-r','30','-c:v','libx264','-preset','veryfast','-crf','19','-pix_fmt','yuv420p','-threads','4'];
async function card(id,eyebrow,title,sub,duration=2.6,outro=false){
 const html=`<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#092f3c;color:#faf9f5;font-family:Arial,sans-serif;height:1080px;overflow:hidden}.orb{position:absolute;width:850px;height:850px;border:1px solid #55818d55;border-radius:50%;right:-180px;top:90px;box-shadow:0 0 0 90px #55818d0a,0 0 0 190px #55818d08}.dot{position:absolute;width:220px;height:220px;border-radius:50%;background:#0088b0;right:235px;top:175px;opacity:.3}.brand{position:absolute;top:72px;left:112px;font-size:27px;font-weight:bold;letter-spacing:5px}.brand small{font-size:15px;color:#9ab8c2;margin-left:30px;letter-spacing:2px;font-weight:normal}.content{position:absolute;left:112px;top:295px;max-width:1480px}.eyebrow{color:#70d2e7;font-size:22px;letter-spacing:4px;font-weight:bold;text-transform:uppercase;margin-bottom:35px}h1{font:normal 91px/1.1 Georgia,serif;letter-spacing:-2px;max-width:1400px;margin:0 0 37px}p{font-size:29px;line-height:1.5;color:#bed0d5;max-width:1380px;margin:0}.line{margin-top:49px;height:5px;width:135px;background:#eaa97a}.foot{position:absolute;left:112px;bottom:75px;color:#9ab8c2;font-size:19px;letter-spacing:2px}.number{position:absolute;right:112px;bottom:70px;font:60px Georgia;color:#59808c}.pill{display:inline-block;margin-top:40px;background:#faf9f5;color:#123846;font-size:24px;padding:19px 30px;border-radius:6px}</style></head><body><div class="orb"></div><div class="dot"></div><div class="brand">SELTIV<small>SCHOOL MANAGEMENT, CONNECTED</small></div><div class="content"><div class="eyebrow">${escape(eyebrow)}</div><h1>${escape(title)}</h1><p>${escape(sub)}</p>${outro?'<div class="pill">Let’s build your school’s version →</div>':'<div class="line"></div>'}</div><div class="foot">${outro?'YOUR WORKFLOWS. YOUR BRAND. YOUR SCHOOL.':'A LIVE PRODUCT WALKTHROUGH · DEMO DATA'}</div><div class="number">${id==='intro'?'01 — 04':id==='outro'?'Made for you':id.slice(0,2)}</div></body></html>`;
 await page.setContent(html);await page.screenshot({path:`${OUT}/render/${id}.png`});
 const output=`${OUT}/render/${id}-card.mp4`;
 await run('ffmpeg',['-y','-loop','1','-i',`${OUT}/render/${id}.png`,'-t',String(duration),'-vf',`scale=1920:1080,fade=t=in:st=0:d=0.25,fade=t=out:st=${duration-.2}:d=0.2`,...encode,output]);
 segments.push(output);total+=duration;
}
await card('intro','Meet Seltiv','One school. One connected experience.','Parents, teachers, administrators and finance—working together.',4);
for(const [i,c] of clips.entries()){
 chapters.push({time:total,title:c.title,role:c.role});
 await card(`${String(i+1).padStart(2,'0')}-${c.id}`,c.subtitle.split(' / ')[0],c.title,c.subtitle.split(' / ')[1]);
 const output=`${OUT}/render/${c.id}-screen.mp4`;
 await run('ffmpeg',['-y','-ss',String(c.start),'-i',path.resolve(c.file),'-t',String(c.duration),'-vf',`fps=30,scale=1920:1080,setsar=1,fade=t=in:st=0:d=0.2,fade=t=out:st=${Math.max(0,c.duration-.2)}:d=0.2`,...encode,output]);
 segments.push(output);total+=c.duration;console.log('RENDERED',c.id);
}
chapters.push({time:total,title:'Customized for your school',role:'outro'});
await card('outro','Built around your needs','Your school is unique. Your software can be too.','Customize workflows, reports, permissions, branding and integrations to fit the way your school works.',6,true);
await browser.close();
await fs.writeFile(`${OUT}/render/concat.txt`,segments.map(f=>`file '${f}'`).join('\n'));
await run('ffmpeg',['-y','-f','concat','-safe','0','-i',`${OUT}/render/concat.txt`,'-c','copy',`${OUT}/render/picture.mp4`]);
const final=path.resolve('brag-output/seltiv-interactive-walkthrough.mp4');
await run('ffmpeg',['-y','-i',`${OUT}/render/picture.mp4`,'-stream_loop','-1','-i',path.resolve('brag-output/composition/assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',`volume=0.22,afade=t=in:d=2,afade=t=out:st=${total-4}:d=4`,'-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',final]);
const stamp=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
await fs.writeFile(`${OUT}/chapters.md`,['# Seltiv interactive walkthrough','',`Runtime: approximately ${stamp(total)}. 1920×1080, 30 fps, background music.`, '',...chapters.map(c=>`- ${stamp(c.time)} — ${c.title}`),'','Recorded from the running local application using synthetic school records. bKash is sandbox-only. The cursor tracks actual browser mouse events; clicks, typing and scrolling operate the application.',''].join('\n'));
console.log('FINAL',final,'SECONDS',total);
