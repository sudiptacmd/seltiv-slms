import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../src/lib/db';
import * as M from '../src/models';
import { StaffAttendance } from '../src/models/staff-attendance';

// Additive fixtures for the local, synthetic demo database. Never drops data.
async function main() {
  await connectDb();
  if (mongoose.connection.host !== '127.0.0.1' && mongoose.connection.host !== 'localhost') throw new Error('Local demo only');
  const year = await M.AcademicYear.findOne({ isCurrent: true });
  const klass = await M.ClassModel.findOne({ numeric: 8 });
  const section = await M.Section.findOne({ klass: klass!._id, name: 'B' });
  const term = await M.Term.findOne({ year: year!._id }).sort({ order: 1 });
  const subjects = await M.Subject.find({ klass: klass!._id }).sort({ order: 1 });
  const student = await M.Student.findOne({ name: 'Nabila Rahman' });
  const weekly = await M.Exam.findOneAndUpdate({ name: 'Weekly Test · September' }, { $setOnInsert: {
    year: year!._id, term: term!._id, classes: [klass!._id], resultPublished: true,
    startDate: new Date('2026-09-20'), endDate: new Date('2026-09-20'),
  } }, { upsert: true, new: true });
  const lines = subjects.map((s, i) => ({ subject: s._id, obtained: 17 + i % 4, fullMarks: 20, grade: 'A+', gpa: 5, absent: false }));
  const total = lines.reduce((a, s) => a + s.obtained, 0);
  await M.Result.updateOne({ exam: weekly._id, student: student!._id }, { $setOnInsert: {
    year: year!._id, section: section!._id, klass: klass!._id, subjects: lines,
    totalObtained: total, totalFull: lines.length * 20, percent: total / lines.length / 20 * 100,
    gpa: 5, grade: 'A+', failed: false, sectionRank: 2, classRank: 3, publishedAt: new Date(),
  } }, { upsert: true });
  const open = await M.Exam.findOneAndUpdate({ name: 'Weekly Assessment · October' }, { $setOnInsert: {
    year: year!._id, term: term!._id, classes: [klass!._id], resultPublished: false,
    startDate: new Date('2026-10-01'), endDate: new Date('2026-10-04'),
  } }, { upsert: true, new: true });
  const math = subjects.find(s => s.code === 'MATH')!;
  await M.ExamSubject.updateOne({ exam: open._id, subject: math._id }, { $setOnInsert: { klass: klass!._id, fullMarks: 20, passMarks: 7 } }, { upsert: true });
  const roster = await M.Enrollment.find({ year: year!._id, section: section!._id }).sort({ roll: 1 });
  for (const [i, enr] of roster.entries()) await M.Mark.updateOne({ exam: open._id, subject: math._id, student: enr.student }, { $setOnInsert: { section: section!._id, obtained: 14 + i % 7 } }, { upsert: true });
  const teacher = await M.User.findOne({ phone: /01700000010$/ });
  const notice = await M.Notice.findOneAndUpdate({ title: 'October teaching plan & assessment deadlines' }, { $setOnInsert: {
    body: 'Please complete weekly assessment marks by 4 October. Science projects are due on 1 October. Parent–teacher meetings take place on 15 October. The school holiday is marked on the academic calendar.',
    audience: { kind: 'all_teachers' }, channels: ['portal'], status: 'published', publishedAt: new Date(), recipientCount: 1,
  } }, { upsert: true, new: true });
  await M.NoticeRecipient.updateOne({ notice: notice._id, user: teacher!._id }, { $setOnInsert: { notice: notice._id, user: teacher!._id } }, { upsert: true });
  const teachers = await M.Staff.find({type:'teaching',active:true});
  for (const day of ['2026-09-27','2026-09-28']) for (const [i,t] of teachers.entries()) {
    await StaffAttendance.updateOne({staff:t._id,date:day},{$setOnInsert:{status:i===2?'late':i===5?'leave':'present',checkIn:i===5?undefined:i===2?'09:12':'08:45',note:'Demo attendance record'}},{upsert:true});
  }
  console.log(JSON.stringify({ section: String(section!._id), student: String(student!._id), math: String(math._id), openExam: String(open._id) }));
  await mongoose.disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
