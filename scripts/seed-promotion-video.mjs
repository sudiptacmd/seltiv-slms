// Prepares the year-end promotion demo: Class 6 (2026) -> Class 7 (2027), plus five new admissions to Class 7.
// Resets any earlier run (2027 year, 2027 enrollments, demo admissions, section 7-C). Safe to re-run.
import mongoose from 'mongoose';
import fs from 'node:fs/promises';
await mongoose.connect('mongodb://127.0.0.1:27017/seltiv_slms');
const db = mongoose.connection.db;
const now = () => new Date();

const year26 = await db.collection('academicyears').findOne({ name: '2026' });
const c6 = await db.collection('classes').findOne({ numeric: 6 });
const c7 = await db.collection('classes').findOne({ numeric: 7 });
const session = await db.collection('admissionsessions').findOne({});

// ── reset ──
const y27 = await db.collection('academicyears').findOne({ name: '2027' });
if (y27) { await db.collection('enrollments').deleteMany({ year: y27._id }); await db.collection('academicyears').deleteOne({ _id: y27._id }); }
const demoApps = await db.collection('admissionapplications').find({ demoPromotion: true }).toArray();
const demoStudents = await db.collection('students').find({ fromApplication: { $in: demoApps.map((a) => a._id) } }).toArray();
await db.collection('enrollments').deleteMany({ student: { $in: demoStudents.map((s) => s._id) } });
await db.collection('students').deleteMany({ _id: { $in: demoStudents.map((s) => s._id) } });
await db.collection('users').deleteMany({ phone: { $regex: '^\\+8801911500' } });
await db.collection('guardians').deleteMany({ phone: { $regex: '^\\+8801911500' } });
await db.collection('admissionapplications').deleteMany({ demoPromotion: true });
await db.collection('sections').deleteMany({ klass: c7._id, name: { $nin: ['A', 'B'] } });
await db.collection('sections').updateMany({ klass: { $in: [c6._id, c7._id] } }, { $set: { capacity: 40 } });
await db.collection('enrollments').updateMany({ year: year26._id, klass: c6._id }, { $set: { status: 'active' } });

// ── five new admissions for Class 7, seat offered ──
const people = [
  ['Tahmid Rahman', 'male', 'Kamal Rahman'], ['Nusrat Jahan', 'female', 'Abdul Karim'], ['Rafiq Ahmed', 'male', 'Shafiq Ahmed'],
  ['Sadia Islam', 'female', 'Nurul Islam'], ['Mahir Chowdhury', 'male', 'Jamal Chowdhury'],
];
const docs = ['Birth Certificate', 'Previous Marksheet', 'Passport-size Photo'].map((label) => ({ label, url: '', status: 'verified', uploadedAt: now() }));
await db.collection('admissionapplications').insertMany(people.map(([studentName, gender, guardianName], i) => ({
  applicationNo: `APP-2027-P${String(i + 1).padStart(3, '0')}`, session: session._id, klass: c7._id, stage: 'seat_offered', studentName, gender,
  dateOfBirth: new Date(`2013-0${i + 2}-1${i}`), guardianName, guardianRelation: 'father', guardianPhone: `+8801911500${String(i).padStart(3, '0')}`,
  previousSchool: 'Kaliganj Model School', previousClass: 'Class 6', previousResult: 'GPA 4.5', documents: docs, testScore: 78 - i * 3,
  applicationFeePaid: true, demoPromotion: true, createdAt: now(), updatedAt: now(),
})));

// ── who is unticked on camera ──
const secB = await db.collection('sections').findOne({ klass: c6._id, name: 'B' });
const enr = await db.collection('enrollments').find({ section: secB._id, year: year26._id }).sort({ rollNumber: 1 }).toArray();
const results = await db.collection('results').find({ klass: c6._id }).toArray();
const failedIds = new Set(results.filter((r) => r.failed).map((r) => String(r.student)));
const held = enr.find((e) => e.rollNumber === 5 && !failedIds.has(String(e.student)));
const heldStudent = await db.collection('students').findOne({ _id: held.student });
const failed = await db.collection('students').find({ _id: { $in: [...failedIds].map((s) => new mongoose.Types.ObjectId(s)) } }).toArray();
const ctx = { held: heldStudent.name, failed: failed.map((s) => s.name) };
await fs.mkdir('video/promotion', { recursive: true });
await fs.writeFile('video/promotion/context.json', JSON.stringify(ctx, null, 2));
console.log('Ready.', ctx, 'Class 6 students:', await db.collection('enrollments').countDocuments({ year: year26._id, klass: c6._id, status: 'active' }));
await mongoose.disconnect();
