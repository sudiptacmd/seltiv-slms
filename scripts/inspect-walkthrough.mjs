import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const out = 'brag-output/interactive';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({headless:true});
for (const [role, phone, path] of [['parent','01700000030','/parent'],['teacher','01700000010','/teacher'],['admin','01700000001','/admin'],['accounts','01700000020','/accounts']]) {
 const context=await browser.newContext({viewport:{width:1600,height:900}});
 const page=await context.newPage(); await page.goto('http://localhost:3000/login');
 await page.getByLabel('Phone or email').fill(phone); await page.getByLabel('Password').fill('password123');
 await page.getByRole('button',{name:'Sign in',exact:true}).click(); await page.waitForURL(u=>!u.pathname.startsWith('/login'));
 await context.storageState({path:`${out}/${role}-auth.json`});
 await page.goto(`http://localhost:3000${path}`); await page.waitForTimeout(1000);
 console.log(role, await page.locator('a').evaluateAll(a=>a.map(e=>({text:e.innerText,url:e.getAttribute('href')}))));
 await page.screenshot({path:`${out}/${role}-inspect.png`}); await context.close();
}
await browser.close();
