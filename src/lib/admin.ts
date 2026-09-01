import "server-only";
import { connectDb } from "./db";
import {
  AdmissionApplication,
  AdmissionSession,
  Result,
  Exam,
  AttendanceRecord,
  Enrollment,
  Section,
  Invoice,
  Student,
} from "@/models";
import { getCurrentYear, todayStr } from "./queries";

export async function admissionsPipeline() {
  await connectDb();
  const session = await AdmissionSession.findOne().sort({ createdAt: -1 }).populate("seats.klass", "name").lean();
  const apps = await AdmissionApplication.find(session ? { session: session._id } : {}).lean();

  const byStage = (stages: string[]) => apps.filter((a) => stages.includes(a.stage)).length;
  const seatsTotal = (session?.seats ?? []).reduce((s, x) => s + x.count, 0);

  return {
    session,
    total: apps.length,
    testScheduled: byStage(["test_scheduled", "test_taken"]),
    verified: byStage(["verified", "seat_offered"]),
    enrolled: byStage(["enrolled"]),
    rejected: byStage(["rejected"]),
    seatsTotal,
  };
}

export async function attendanceMonitor(dateStr?: string) {
  await connectDb();
  const date = dateStr ?? todayStr();
  const sections = await Section.find().populate("klass", "name numeric order").populate("classTeacher", "name").lean();

  const agg = await AttendanceRecord.aggregate<{ _id: string; total: number; present: number; absent: number; late: number }>([
    { $match: { date } },
    {
      $group: {
        _id: "$section",
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
      },
    },
  ]);
  const aggMap = new Map(agg.map((a) => [String(a._id), a]));

  const rows = sections
    .map((sec) => {
      const k = sec.klass as unknown as { name: string; order: number };
      const a = aggMap.get(String(sec._id));
      const ct = sec.classTeacher as unknown as { name: string } | undefined;
      return {
        sectionId: String(sec._id),
        name: `${k?.name ?? "?"} ${sec.name}`,
        order: k?.order ?? 99,
        teacher: ct?.name ?? "—",
        taken: Boolean(a),
        total: a?.total ?? 0,
        present: (a?.present ?? 0) + (a?.late ?? 0),
        absent: a?.absent ?? 0,
        pct: a && a.total ? Math.round(((a.present + a.late) / a.total) * 100) : null,
      };
    })
    .sort((x, y) => x.order - y.order);

  return { date, rows };
}

export async function repeatAbsentees(days = 20, threshold = 3) {
  await connectDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const agg = await AttendanceRecord.aggregate<{ _id: string; absences: number }>([
    { $match: { date: { $gte: sinceStr }, status: "absent" } },
    { $group: { _id: "$student", absences: { $sum: 1 } } },
    { $match: { absences: { $gte: threshold } } },
    { $sort: { absences: -1 } },
    { $limit: 30 },
  ]);
  const students = await Student.find({ _id: { $in: agg.map((a) => a._id) } }).lean();
  const year = await getCurrentYear();
  const enrs = await Enrollment.find({ student: { $in: agg.map((a) => a._id) }, year: year._id })
    .populate("klass", "name")
    .populate("section", "name")
    .lean();
  const enrMap = new Map(enrs.map((e) => [String(e.student), e]));
  const sMap = new Map(students.map((s) => [String(s._id), s]));

  return agg.map((a) => {
    const s = sMap.get(String(a._id));
    const e = enrMap.get(String(a._id));
    const k = e?.klass as unknown as { name: string } | undefined;
    const sec = e?.section as unknown as { name: string } | undefined;
    return {
      studentId: String(a._id),
      name: s?.name ?? "—",
      klass: k ? `${k.name} ${sec?.name ?? ""}` : "—",
      absences: a.absences,
    };
  });
}

export async function financeOverview() {
  await connectDb();
  const year = await getCurrentYear();
  const now = new Date();
  const invoices = await Invoice.find({ year: year._id, status: { $ne: "void" } }).populate("klass", "name numeric order").lean();

  const byClass = new Map<string, { name: string; order: number; billed: number; collected: number; due: number }>();
  for (const inv of invoices) {
    const k = inv.klass as unknown as { name: string; order: number } | undefined;
    const key = k?.name ?? "—";
    const e = byClass.get(key) ?? { name: key, order: k?.order ?? 99, billed: 0, collected: 0, due: 0 };
    e.billed += inv.netPayable;
    e.collected += inv.paidAmount;
    if (new Date(inv.dueDate) <= now) e.due += Math.max(0, inv.netPayable - inv.paidAmount);
    byClass.set(key, e);
  }

  return {
    totalBilled: invoices.reduce((s, i) => s + i.netPayable, 0),
    totalCollected: invoices.reduce((s, i) => s + i.paidAmount, 0),
    totalDue: [...byClass.values()].reduce((s, c) => s + c.due, 0),
    byClass: [...byClass.values()].sort((a, b) => a.order - b.order),
  };
}

export async function examResultSummary(examId: string) {
  await connectDb();
  const exam = await Exam.findById(examId).lean();
  const results = await Result.find({ exam: examId }).lean();
  return {
    exam,
    count: results.length,
    published: results.filter((r) => r.publishedAt).length,
    passRate: results.length ? Math.round((results.filter((r) => !r.failed).length / results.length) * 100) : 0,
    avgGpa: results.length ? results.reduce((s, r) => s + r.gpa, 0) / results.length : 0,
  };
}
