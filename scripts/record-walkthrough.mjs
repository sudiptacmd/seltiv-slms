import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const OUT = 'brag-output/interactive';
const base = 'http://localhost:3000';
const only = process.argv[2];
await fs.mkdir(`${OUT}/raw`, {recursive:true});
const browser = await chromium.launch({headless:true});
const manifest = [];
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function ready(p) { await p.waitForLoadState('domcontentloaded'); await pause(650); }
async function point(p, l) {
 await l.scrollIntoViewIfNeeded(); const b=await l.boundingBox();
 if (!b) throw Error('No interaction target');
 await p.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:30}); await pause(350);
}
async function click(p,l) { await point(p,l); await p.mouse.down(); await pause(100); await p.mouse.up(); await ready(p); }
async function type(p,l,v) { await click(p,l); await p.keyboard.press('ControlOrMeta+A'); await p.keyboard.type(v,{delay:55}); await pause(350); }
async function scroll(p,dy) { await p.mouse.move(1400,700,{steps:20}); for(let i=0;i<12;i++){await p.mouse.wheel(0,dy/12);await pause(65);} await pause(900); }
const link=(p,href)=>p.locator(`a[href="${href}"]`).first();
const button=(p,name)=>p.getByRole('button',{name,exact:true});
async function scene(id,role,title,subtitle,path,action) {
 if(only && !id.startsWith(only))return;
 const warm=await browser.newContext({storageState:`${OUT}/${role}-auth.json`});
 const wp=await warm.newPage(); await wp.goto(base+path); await ready(wp); await warm.close();
 const ctx=await browser.newContext({storageState:`${OUT}/${role}-auth.json`,viewport:{width:1600,height:900},recordVideo:{dir:`${OUT}/raw`,size:{width:1600,height:900}}});
 await ctx.addInitScript(()=>{
  document.addEventListener('DOMContentLoaded',()=>{
   const style=document.createElement('style');style.textContent='nextjs-portal{display:none!important} *{cursor:none!important}';document.head.append(style);
   const cursor=document.createElement('div');cursor.id='demo-pointer';cursor.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;left:1250px;top:600px;width:28px;height:36px;filter:drop-shadow(0 2px 3px #0008);';
   cursor.innerHTML='<svg width="28" height="36" viewBox="0 0 28 36"><path d="M3 2L3 28L10 21L16 33L21 30L15 19L25 18Z" fill="white" stroke="#173d4b" stroke-width="2"/></svg>';document.body.append(cursor);
   document.addEventListener('mousemove',e=>{cursor.style.left=e.clientX+'px';cursor.style.top=e.clientY+'px';});
   document.addEventListener('mousedown',e=>{const dot=document.createElement('i');dot.style.cssText=`position:fixed;z-index:2147483646;pointer-events:none;left:${e.clientX-18}px;top:${e.clientY-18}px;width:36px;height:36px;border:3px solid #0088b0;border-radius:50%;background:#0088b022;`;document.body.append(dot);dot.animate([{transform:'scale(.5)',opacity:1},{transform:'scale(1.8)',opacity:0}],{duration:650}).onfinish=()=>dot.remove();});
  });
 });
 const epoch=Date.now();const p=await ctx.newPage();p.setDefaultTimeout(12000);
 await p.goto(base+path);await ready(p);const start=(Date.now()-epoch)/1000;
 try {
  await pause(1700);await action(p);await pause(2200);
  await p.screenshot({path:`${OUT}/${id}-end.png`});
  const end=(Date.now()-epoch)/1000;const video=p.video();await ctx.close();await video.saveAs(`${OUT}/raw/${id}.webm`);
  const entry={id,role,title,subtitle,start,end,duration:end-start,file:`${OUT}/raw/${id}.webm`};
  manifest.push(entry);await fs.writeFile(`${OUT}/${id}.json`,JSON.stringify(entry,null,2));console.log('RECORDED',id,entry.duration.toFixed(1));
 } catch(e){await p.screenshot({path:`${OUT}/${id}-error.png`});console.error('FAILED',id,await p.locator('body').innerText(),e);await ctx.close();throw e;}
}

await scene('01-progress','parent','See the whole picture.','PARENTS / Attendance and subject-by-subject progress','/parent',async p=>{
 await point(p,p.getByText('97%',{exact:true}).first());await pause(800);await scroll(p,410);
 await point(p,p.getByText('Mathematics',{exact:true}));await pause(1300);
 await click(p,link(p,'/parent/child/gradesheet'));await scroll(p,260);
});
await scene('02-notices','parent','Never miss an announcement.','PARENTS / One notice board for school and class updates','/parent',async p=>{
 await click(p,link(p,'/parent/notices'));await pause(1500);
 await click(p,p.locator('a[href^="/parent/notices/"]').first());await pause(1800);await scroll(p,210);
});
await scene('03-payment','parent','Pay school fees in a few clicks.','PARENTS / Historical invoices and bKash · sandbox demonstration','/parent/fees',async p=>{
 await scroll(p,320);await pause(900);await scroll(p,-400);
 await click(p,p.getByRole('link',{name:'Pay with bKash',exact:true}));
 await click(p,p.getByRole('button',{name:/Continue to bKash/}));
 await p.getByText('SANDBOX',{exact:true}).waitFor();await pause(1600);
 await click(p,button(p,'Confirm payment'));await pause(1500);
});
await scene('04-teacher-day','teacher','Start the day with a clear plan.','TEACHERS / Classes, notices, important dates and deadlines','/teacher',async p=>{
 await point(p,p.getByText(/Today's classes/));await pause(800);await scroll(p,370);await pause(1200);
 await click(p,link(p,'/teacher/timetable'));await pause(1600);
 await click(p,link(p,'/teacher/notices'));await pause(1200);
});
await scene('05-attendance','teacher','Take attendance. Keep everyone informed.','TEACHERS / Save a real class roll call','/teacher/attendance?sectionId=6aba2d76b1ee1a490b4f808f',async p=>{
 await click(p,button(p,'Present'));await click(p,button(p,'A').first());await click(p,button(p,'L').nth(1));
 await scroll(p,1300);await click(p,button(p,'Save Roll Call'));await pause(1600);
});
await scene('06-marks','teacher','Post marks with confidence.','TEACHERS / Edit a weekly assessment and save the mark sheet','/teacher/gradesheet',async p=>{
 await click(p,p.locator('tr').filter({hasText:'Class 8 B'}).getByRole('link',{name:'Enter marks'}));
 await type(p,p.locator('input[name^="m_"]').first(),'18');await type(p,p.locator('input[name^="m_"]').nth(1),'19');
 await click(p,button(p,'Save draft'));await pause(1200);
});
await scene('07-routine','admin','Build a routine automatically.','ADMINISTRATION / Generate a section schedule from teacher assignments','/admin/academics/timetable',async p=>{
 await click(p,p.getByRole('link',{name:'Class 8 B',exact:true}));
 await click(p,button(p,'Generate routine automatically'));await p.getByText(/Routine generated with/).waitFor();await pause(1000);await scroll(p,400);
});
await scene('08-subjects','admin','Shape the academic structure.','ADMINISTRATION / Add a subject and define its marks','/admin/academics/subjects',async p=>{
 await click(p,p.locator('select[name="classId"]'));await p.keyboard.press('c');await p.keyboard.press('Enter');
 await type(p,p.locator('input[name="name"]'),'Digital Literacy');await type(p,p.locator('input[name="code"]'),'DL');
 await type(p,p.locator('input[name="fullMarks"]'),'50');await type(p,p.locator('input[name="passMarks"]'),'17');
 await click(p,button(p,'Add subject'));await pause(900);
 await click(p,link(p,'/admin/exams/grading-scale'));await point(p,p.locator('input[name="minPercent"]').first());await pause(1400);
});
await scene('09-publish','admin','Reach the right people instantly.','ADMINISTRATION / Publish a targeted portal notice','/admin/notices/new',async p=>{
 await type(p,p.locator('input[name="title"]'),'Parent–teacher meeting · 15 October');
 await type(p,p.locator('textarea[name="body"]'),'Meet your child’s teachers on 15 October at 10 AM. Review progress and plan the next steps together.');
 await click(p,p.locator('input[name="channel"][value="sms"]'));
 await click(p,p.getByRole('button',{name:'Publish',exact:true}));await p.getByRole('link',{name:'Back to notices →'}).waitFor();await pause(1000);
 await click(p,p.getByRole('link',{name:'Back to notices →'}));
});
await scene('10-access','admin','Give each person the right access.','ADMINISTRATION / Configure roles and per-user action grants','/admin/users',async p=>{
 await click(p,p.locator('tr').filter({hasText:'Md. Alamgir Hossain'}).getByRole('button',{name:'Roles',exact:true}));await scroll(p,350);
 await click(p,p.locator('input[name="permission"][value="attendance.take"]').first());
 await click(p,p.locator('input[name="permission"][value="marks.post"]').first());
 await click(p,button(p,'Save action access'));await pause(1000);
});
await scene('11-audit','admin','Know what changed—and who changed it.','ADMINISTRATION / Inspect the action audit trail','/admin/audit-log',async p=>{
 await type(p,p.getByPlaceholder('Actor or action…'),'notice');await p.keyboard.press('Enter');await pause(1500);
 await type(p,p.getByPlaceholder('Actor or action…'),'');await p.keyboard.press('Enter');await pause(800);await scroll(p,380);
});
await scene('12-monitor','admin','Follow attendance across the school.','ADMINISTRATION / Separate student and teacher attendance records','/admin/attendance',async p=>{
 await scroll(p,340);await pause(1300);await click(p,link(p,'/admin/attendance/teachers'));await pause(900);
 await point(p,p.locator('input[name="date"]'));await p.locator('input[name="date"]').fill('2026-09-27');await click(p,button(p,'Load records'));await pause(1200);
});
await scene('13-batch','accounts','Create a month of invoices at once.','FINANCE / Batch tuition billing from configured fee plans','/accounts/fees/invoices',async p=>{
 await point(p,p.locator('input[name="period"]'));await p.locator('input[name="period"]').fill('2026-10');await pause(800);
 await click(p,button(p,'Generate invoices'));await pause(1600);await scroll(p,280);
});
await scene('14-ledger','accounts','Keep every payment connected.','FINANCE / Find a student, inspect the ledger and issue a receipt','/accounts/fees',async p=>{
 const search=p.locator('input[type="search"],input[placeholder]').first();await type(p,search,'Nabila');await p.keyboard.press('Enter');await pause(900);
 await click(p,p.getByRole('link',{name:'Nabila Rahman',exact:true}));await pause(900);
 await click(p,button(p,'Record payment').first());await type(p,p.locator('input[name="reference"]'),'SCHOOL-DESK-1028');
 await click(p,button(p,'Issue receipt'));await pause(1300);
});
await scene('15-reconcile','accounts','Reconcile digital collections.','FINANCE / Match bKash transactions to invoices and receipts','/accounts',async p=>{
 await click(p,link(p,'/accounts/bkash'));await pause(1200);await scroll(p,340);
});
await scene('16-plans','accounts','Make fee management flexible.','FINANCE / Instalments, dues and reminder tools','/accounts/fees/instalments',async p=>{
 await scroll(p,280);await click(p,link(p,'/accounts/fees/reminders'));await pause(1600);await scroll(p,360);
});
await scene('17-payroll','accounts','Run payroll from the same workspace.','FINANCE / Salary structure, payroll and payslips','/accounts/payroll/structure',async p=>{
 await scroll(p,220);await click(p,link(p,'/accounts/payroll'));await pause(1000);
 await click(p,button(p,'Adjust').first());await pause(1200);await scroll(p,240);
});
await scene('18-reports','accounts','See where the money stands.','FINANCE / Collections, overdue balances and income breakdowns','/accounts',async p=>{
 await click(p,link(p,'/accounts/reports'));await point(p,p.getByText('Total collected',{exact:true}));await pause(1400);await scroll(p,420);await pause(1200);
});
await scene('19-print','parent','Prefer paying at school? Bring an invoice.','PARENTS / Preview and download a print-ready fee invoice','/parent/fees',async p=>{
 await click(p,p.getByRole('link',{name:'View / Print',exact:true}).first());await pause(1500);
 await point(p,button(p,'Print invoice'));await pause(800);
 const downloaded=p.waitForEvent('download');await click(p,p.getByRole('link',{name:'Download PDF',exact:true}));
 const file=await downloaded;await file.saveAs(`${OUT}/sample-invoice.pdf`);await pause(900);await scroll(p,180);
});
await browser.close();
console.log('Complete',manifest.length);
