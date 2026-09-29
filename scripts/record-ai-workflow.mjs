import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import mongoose from 'mongoose';
const out='video/ai-live';await fs.mkdir(`${out}/raw`,{recursive:true});
const prompt='science er class 8 er marking change hoise, new marking structure in pretest- out of 100 marks, 5 marks diary, 10 marks attendance, 25 weekly test, 60 marks final exam. test- 100 marks, 100 from  exam, final term- 25 marks weekly test, 75 marks final test. ei change ta kore dao.';
const browser=await chromium.launch();
const warm=await browser.newContext();const login=await warm.newPage();
await login.goto('http://localhost:3000/login');await login.getByLabel('Phone or email').fill('01700000001');await login.getByLabel('Password').fill('password123');await login.getByRole('button',{name:'Sign in',exact:true}).click();await login.waitForURL('**/admin');
await login.goto('http://localhost:3000/admin/ai');await login.getByRole('heading',{name:'Seltiv AI',exact:true}).waitFor();
const state=await warm.storageState();await warm.close();
const ctx=await browser.newContext({storageState:state,viewport:{width:1600,height:900},recordVideo:{dir:`${out}/raw`,size:{width:1600,height:900}}});
await ctx.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{
const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important} *{cursor:none!important}';document.head.append(style);
const cursor=document.createElement('div');cursor.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;left:950px;top:530px;width:26px;height:34px;filter:drop-shadow(0 2px 3px #0005)';cursor.innerHTML='<svg width="26" height="34" viewBox="0 0 28 36"><path d="M3 2L3 28L10 21L16 33L21 30L15 19L25 18Z" fill="white" stroke="#173d4b" stroke-width="2"/></svg>';document.body.append(cursor);
document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px'});
document.addEventListener('mousedown',e=>{const dot=document.createElement('i');dot.style.cssText=`position:fixed;z-index:2147483646;pointer-events:none;left:${e.clientX-18}px;top:${e.clientY-18}px;width:36px;height:36px;border:3px solid #0088b0;border-radius:50%`;document.body.append(dot);dot.animate([{transform:'scale(.4)',opacity:1},{transform:'scale(1.8)',opacity:0}],{duration:650}).onfinish=()=>dot.remove()});
})});
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
const epoch=Date.now();const at=()=> (Date.now()-epoch)/1000;const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function point(loc){await loc.scrollIntoViewIfNeeded();const b=await loc.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:25});await sleep(350)}
async function click(loc){await point(loc);await p.mouse.down();await sleep(100);await p.mouse.up()}
await p.goto('http://localhost:3000/admin/ai');await p.getByLabel('What would you like to change?').waitFor();
const timeline={start:at()};
await sleep(900);await click(p.getByLabel('What would you like to change?'));await p.keyboard.type(prompt,{delay:27});await sleep(2000);
timeline.thinking=at();await click(p.getByRole('button',{name:'Prepare changes'}));
await p.getByRole('heading',{name:'Review proposed changes'}).waitFor({timeout:150000});timeline.review=at();
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');
const db=mongoose.connection.db;const klass=await db.collection('classes').findOne({numeric:8});const science=await db.collection('subjects').findOne({name:'Science',klass:klass._id});
const current=await db.collection('markingstructures').findOne({subject:science._id});const revision=current?.version??0;
for(const period of ['pretest','test','final_term']){await point(p.getByTestId(`allocation-${period}`));await sleep(2200)}
await p.screenshot({path:`${out}/live-review.png`});
timeline.approval=at();await click(p.getByRole('button',{name:'Approve changes',exact:true}));
await p.getByRole('heading',{name:'Marking structure applied'}).waitFor();timeline.applied=at();
await expect(p.getByText('Saved successfully. Teacher mark entry will use the approved allocations.')).toBeVisible();
const saved=await db.collection('markingstructures').findOne({subject:science._id});
if(saved?.version!==revision+1||saved.history.length<1)throw Error('Approval was not persisted');
const expected=[['pretest', [['diary',5],['attendance',10],['weekly_test',25],['final_exam',60]]],['test',[['exam',100]]],['final_term',[['weekly_test',25],['final_test',75]]]];
for(const [period,components] of expected){const a=saved.allocations.find(a=>a.period===period);if(a?.total!==100||JSON.stringify(a.components.map(c=>[c.key,c.marks]))!==JSON.stringify(components))throw Error('Persisted allocation mismatch')}
await sleep(2800);await click(p.getByRole('link',{name:'View saved structure',exact:true}));await p.getByRole('heading',{name:'Marking structures',exact:true}).waitFor();timeline.saved=at();
await p.reload();await expect(p.getByText(`Applied · Revision ${saved.version}`)).toBeVisible();await p.screenshot({path:`${out}/live-saved.png`});await sleep(3500);timeline.end=at();
if(errors.length)throw Error(errors.join('\n'));
const video=p.video();await ctx.close();await video.saveAs(`${out}/raw/workflow.webm`);await browser.close();await mongoose.disconnect();
await fs.writeFile(`${out}/timeline.json`,JSON.stringify(timeline,null,2));console.log('Recorded real UI; approval persisted and verified after reload.',timeline);
