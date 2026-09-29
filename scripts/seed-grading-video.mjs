// Prepares "Second Term Examination 2026" (Class 8) for the admin grading walkthrough.
// Class 8 A and 8 B are filled with demo marks, except the first four Mathematics rows of 8 A and
// roll 1's remark, which are typed on camera. Roll 1 uses the figures from the school's sample card.
// Safe to re-run.
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
const NAME = 'Second Term Examination 2026';
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');
const db = mongoose.connection.db;
const klass = await db.collection('classes').findOne({ numeric: 8 });
const year = await db.collection('academicyears').findOne({ isCurrent: true });
const term = await db.collection('terms').findOne({ year: year._id });
let exam = await db.collection('exams').findOne({ name: NAME, year: year._id });
if (!exam) {
  const _id = new mongoose.Types.ObjectId();
  await db.collection('exams').insertOne({ _id, name: NAME, year: year._id, term: term._id, classes: [klass._id], resultPublished: false, routinePublished: false, createdAt: new Date(), updatedAt: new Date() });
  exam = await db.collection('exams').findOne({ _id });
}
await db.collection('exams').updateOne({ _id: exam._id }, { $set: { resultPublished: false } });
for (const c of ['gradeentries', 'examstudentrecords', 'results']) await db.collection(c).deleteMany({ exam: exam._id });

const scheme = await db.collection('reportschemes').findOne({ klass: klass._id });
if (!scheme) throw Error('Open /admin/exams/report-scheme once so Class 8 gets its report-card layout.');
const card = { ban1: [42, 22, 0, 20, 4.34, 10, 9.88, 5], ban2: [30, 13, 0, 0, 4.34, 10, 10, 5], eng1: [64, 0, 0, 19, 4.34, 6, 9.75, 5], eng2: [26, 0, 0, 0, 4.34, 7, 7.5, 5], math: [60, 22, 0, 20, 4.34, 10, 10, 5], bgs: [55, 28, 0, 20, 4.34, 10, 10, 5], sci: [66, 21, 0, 20, 4.34, 10, 9.75, 5], rel: [55, 25, 0, 20, 4.34, 10, 10, 5], ict: [21, 0, 20, 0, 4.34, 10, 10, 5], home_agri: [20, 10, 20] };
const FIELDS = { main: ['written', 'objective', 'practical', 'oral', 'attendance', 'assignment', 'ct', 'diary'], extra: ['cw', 'project', 'ct'] };
const onCamera = { math: [] };
const docs = [], records = [];
for (const secName of ['A', 'B']) {
  const section = await db.collection('sections').findOne({ klass: klass._id, name: secName });
  const enr = await db.collection('enrollments').find({ section: section._id, year: exam.year, status: 'active' }).sort({ rollNumber: 1 }).toArray();
  for (const [i, e] of enr.entries()) {
    const star = secName === 'A' && i === 0;
    for (const row of scheme.rows) {
      const values = {};
      FIELDS[row.kind].forEach((f, j) => {
        const max = row.max[f] ?? 0;
        if (!max) return;
        const frac = 0.42 + ((i * 37 + j * 11 + row.key.length * 7 + (secName === 'B' ? 13 : 0)) % 55) / 100;
        const raw = Math.min(max, max * frac);
        values[f] = star && card[row.key] ? card[row.key][j] : f === 'attendance' ? Math.round(raw * 100) / 100 : Math.round(raw);
      });
      if (secName === 'A' && row.key === 'math' && i < 4) { onCamera.math.push({ roll: e.rollNumber, values }); continue; }
      docs.push({ exam: exam._id, section: section._id, student: e.student, row: row.key, values, absent: false, createdAt: new Date(), updatedAt: new Date() });
    }
    records.push({ exam: exam._id, section: section._id, student: e.student, workingDays: 68, present: star ? 58 : 62 - (i % 7), late: star ? 0 : i % 3, remarks: star ? '' : ['Good effort. Keep it up.', 'Needs more practice in written work.', 'Very good progress this term.'][i % 3], createdAt: new Date(), updatedAt: new Date() });
  }
}
await db.collection('gradeentries').insertMany(docs);
await db.collection('examstudentrecords').insertMany(records);
const sectionA = await db.collection('sections').findOne({ klass: klass._id, name: 'A' });
await fs.mkdir('video/grading-walkthrough', { recursive: true });
await fs.writeFile('video/grading-walkthrough/context.json', JSON.stringify({ examId: String(exam._id), sectionId: String(sectionA._id), onCamera }, null, 2));
console.log(`Ready: ${docs.length} grade entries, ${records.length} attendance records; ${onCamera.math.length} Mathematics rows left for on-camera entry.`);
await mongoose.disconnect();
