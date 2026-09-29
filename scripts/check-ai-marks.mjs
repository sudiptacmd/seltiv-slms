import { chromium, expect } from '@playwright/test';
import mongoose from 'mongoose';
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');const db=mongoose.connection.db;
const klass=await db.collection('classes').findOne({numeric:8});const subject=await db.collection('subjects').findOne({klass:klass._id,name:'Science'});const section=await db.collection('sections').findOne({klass:klass._id,name:'B'});const year=await db.collection('academicyears').findOne({isCurrent:true});
const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:3000/login');await page.getByLabel('Phone or email').fill('01700000001');await page.getByLabel('Password').fill('password123');await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/admin');
const name=`AI marking verification ${Date.now()}`;await page.goto('http://localhost:3000/admin/exams');
await page.locator('input[name="name"]').fill(name);const term=await db.collection('terms').findOne({year:year._id});await page.locator('select[name="termId"]').selectOption(String(term._id));await page.locator('select[name="markingPeriod"]').selectOption('pretest');await page.locator(`input[name="classId"][value="${klass._id}"]`).check();
await page.getByRole('button',{name:'Create exam',exact:true}).click();await expect(page.getByText(`${name} created.`,{exact:true})).toBeVisible();
const exam=await db.collection('exams').findOne({name});if(!exam||exam.markingPeriod!=='pretest')throw Error('Exam assessment type was not saved');
const url=`http://localhost:3000/teacher/gradesheet/${exam._id}/${subject._id}?section=${section._id}`;
try {
await page.goto(url);await page.getByText('Total calculated automatically',{exact:false}).waitFor();
const rows=page.locator('tbody tr');const first=rows.first();
const inputs=first.locator('input[type="number"]');await expect(inputs).toHaveCount(4);
for(const [i,value] of ['5','9','23','55'].entries())await inputs.nth(i).fill(value);
await expect(first.getByText('92',{exact:true})).toBeVisible();
await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText(/Saved 1 of .* marks as a draft/)).toBeVisible();
await page.reload();await expect(inputs.nth(0)).toHaveValue('5');await expect(inputs.nth(3)).toHaveValue('55');await expect(first.getByText('92',{exact:true})).toBeVisible();
const saved=await db.collection('marks').findOne({exam:exam._id,subject:subject._id,obtained:92});if(!saved||saved.componentMarks.weekly_test!==23)throw Error('Component marks were not persisted');
const es=await db.collection('examsubjects').findOne({exam:exam._id,subject:subject._id});if(es.markingComponents.length!==4||es.markingVersion!==(await db.collection('markingstructures').findOne({subject:subject._id})).version)throw Error('Mark sheet allocation was not frozen');
await page.screenshot({path:'video/ai-live/teacher-components.png'});
// Draft result processing consumes the saved component total.
await page.goto(`http://localhost:3000/admin/exams/${exam._id}/results`);await page.getByRole('button',{name:'Process (draft)',exact:true}).click();await expect(page.getByText(/Processed 1 students/)).toBeVisible();
const result=await db.collection('results').findOne({exam:exam._id,student:saved.student});const scienceResult=result?.subjects.find(s=>String(s.subject)===String(subject._id));if(scienceResult?.obtained!==92||scienceResult.fullMarks!==100)throw Error('Result processing did not use component total');
await page.goto(url);
// Drafts retain partial components without inventing a total.
await inputs.nth(3).fill('');await page.getByRole('button',{name:'Save draft',exact:true}).click();await expect(page.getByText(/Saved 0 of .* marks as a draft/)).toBeVisible();
const partial=await db.collection('marks').findOne({_id:saved._id});if(partial.obtained!==null||partial.componentMarks.diary!==5)throw Error('Partial draft was not preserved correctly');
await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByText('Complete every component, or mark the student absent, before submitting.')).toBeVisible();
if(errors.length)throw Error(errors.join('\n'));
console.log('PASS: actual exam creation, approved component columns, automatic total 92, save/reload, frozen allocation, partial drafts, incomplete submission rejected.');
} finally {
// Remove only this test-created exam and its children.
for(const collection of ['marks','marksubmissions','examsubjects','results'])await db.collection(collection).deleteMany({exam:exam._id});await db.collection('exams').deleteOne({_id:exam._id});await browser.close();await mongoose.disconnect();
}
