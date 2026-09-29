import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {once} from 'node:events';
const dir=path.dirname(new URL(import.meta.url).pathname);
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:810},deviceScaleFactor:1});
await page.goto('file://'+dir+'/index.html?render');
await page.evaluate(()=>document.fonts.ready);
for(const t of [8,12,17.5,21,26,30,34,40]){await page.evaluate(t=>renderFrame(t),t);await page.screenshot({path:`${dir}/preview-${t}.png`});}
if(process.argv.includes('--preview')){await browser.close();process.exit(0)}
const encoder=spawn('ffmpeg',['-y','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-an','-vf','scale=1920:1080:flags=lanczos','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-threads','4','-movflags','+faststart',`${dir}/seltiv-ai-grading.mp4`],{stdio:['pipe','ignore','pipe']});
let err='';encoder.stderr.on('data',d=>err+=d);const ended=new Promise((r,j)=>encoder.on('close',c=>c?j(Error(err.slice(-2000))):r()));
for(let f=0;f<44*30;f++){await page.evaluate(t=>renderFrame(t),f/30);const jpg=await page.screenshot({type:'jpeg',quality:95});if(!encoder.stdin.write(jpg))await once(encoder.stdin,'drain');if(f%150===0)console.log(`Rendered ${(f/30).toFixed(0)} / 44 seconds`)}
encoder.stdin.end();await ended;await browser.close();console.log('Saved '+dir+'/seltiv-ai-grading.mp4');
