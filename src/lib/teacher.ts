import "server-only";
import { connectDb } from "./db";
import {
  Section,
  SubjectAssignment,
  TimetableEntry,
  Enrollment,
  AttendanceSession,
  Exam,
  MarkSubmission,
  Student,
  PeriodSlot,
  type Weekday,
} from "@/models";
import { getCurrentYear, todayStr } from "./queries";
import { WEEKDAYS } from "@/models/types";

/** Sections a teacher teaches or is class-teacher of. */
export async function teacherSections(staffId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const [asClassTeacher, assignments] = await Promise.all([
    Section.find({ classTeacher: staffId }).populate("klass", "name numeric order").lean(),
    SubjectAssignment.find({ teacher: staffId, year: year._id })
      .populate({ path: "section", populate: { path: "klass", select: "name numeric order" } })
      .populate("subject", "name code")
      .lean(),
  ]);

  const sectionMap = new Map<string, { id: string; name: string; order: number; isClassTeacher: boolean; subjects: string[] }>();
  for (const s of asClassTeacher) {
    const k = s.klass as unknown as { name: string; order: number };
    sectionMap.set(String(s._id), { id: String(s._id), name: `${k.name} ${s.name}`, order: k.order, isClassTeacher: true, subjects: [] });
  }
  for (const a of assignments) {
    const sec = a.section as unknown as { _id: unknown; name: string; klass: { name: string; order: number } };
    if (!sec) continue;
    const key = String(sec._id);
    const subj = a.subject as unknown as { name: string };
    const entry = sectionMap.get(key) ?? {
      id: key,
      name: `${sec.klass.name} ${sec.name}`,
      order: sec.klass.order,
      isClassTeacher: false,
      subjects: [],
    };
    if (subj?.name) entry.subjects.push(subj.name);
    sectionMap.set(key, entry);
  }
  return [...sectionMap.values()].sort((a, b) => a.order - b.order);
}

export async function teacherTimetable(staffId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const [entries, slots] = await Promise.all([
    TimetableEntry.find({ teacher: staffId, year: year._id })
      .populate({ path: "section", populate: { path: "klass", select: "name" } })
      .populate("subject", "name")
      .populate("slot", "name order startTime endTime")
      .lean(),
    PeriodSlot.find().sort({ order: 1 }).lean(),
  ]);

  const byDay: Record<Weekday, { slot: string; time: string; order: number; section: string; subject: string }[]> = {
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [],
  };
  for (const e of entries) {
    const sec = e.section as unknown as { name: string; klass: { name: string } };
    const slot = e.slot as unknown as { name: string; order: number; startTime: string; endTime: string };
    const subj = e.subject as unknown as { name: string };
    byDay[e.weekday].push({
      slot: slot?.name ?? "",
      time: slot ? `${slot.startTime}–${slot.endTime}` : "",
      order: slot?.order ?? 0,
      section: sec ? `${sec.klass.name} ${sec.name}` : "",
      subject: subj?.name ?? "",
    });
  }
  for (const k of Object.keys(byDay) as Weekday[]) byDay[k].sort((a, b) => a.order - b.order);
  return { byDay, slots };
}

export async function teacherToday(staffId: string) {
  await connectDb();
  const today = todayStr();
  const weekday = WEEKDAYS[new Date().getDay()];
  const { byDay } = await teacherTimetable(staffId);
  const todayClasses = byDay[weekday] ?? [];

  const sections = await teacherSections(staffId);
  const takenToday = await AttendanceSession.find({
    section: { $in: sections.map((s) => s.id) },
    date: today,
    takenBy: staffId,
  }).lean();

  return {
    weekday,
    today,
    todayClasses,
    rollCallPending: sections.filter((s) => s.isClassTeacher && !takenToday.some((t) => String(t.section) === s.id)),
  };
}

export async function teacherPendingMarks(staffId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const assignments = await SubjectAssignment.find({ teacher: staffId, year: year._id })
    .populate("subject", "name")
    .populate({ path: "section", populate: { path: "klass", select: "name" } })
    .lean();
  const openExams = await Exam.find({ year: year._id, resultPublished: false }).lean();
  if (openExams.length === 0) return [];

  const pending: { exam: string; examId: string; section: string; sectionId: string; subject: string; subjectId: string; submitted: boolean }[] = [];
  for (const exam of openExams) {
    for (const a of assignments) {
      const sec = a.section as unknown as { _id: unknown; name: string; klass: { name: string } };
      const subj = a.subject as unknown as { _id: unknown; name: string };
      if (!sec || !subj) continue;
      const sub = await MarkSubmission.findOne({ exam: exam._id, section: sec._id, subject: subj._id }).lean();
      pending.push({
        exam: exam.name,
        examId: String(exam._id),
        section: `${sec.klass.name} ${sec.name}`,
        sectionId: String(sec._id),
        subject: subj.name,
        subjectId: String(subj._id),
        submitted: Boolean(sub?.submitted),
      });
    }
  }
  return pending;
}

export async function sectionRoster(sectionId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const enrollments = await Enrollment.find({ section: sectionId, year: year._id, status: "active" })
    .sort({ rollNumber: 1 })
    .lean();
  const students = await Student.find({ _id: { $in: enrollments.map((e) => e.student) } }).lean();
  const map = new Map(students.map((s) => [String(s._id), s]));
  return enrollments.map((e) => ({
    enrollment: e,
    student: map.get(String(e.student))!,
    roll: e.rollNumber,
  }));
}
