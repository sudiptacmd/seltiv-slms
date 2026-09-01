import "server-only";
import { connectDb } from "./db";
import {
  AcademicYear,
  Enrollment,
  Student,
  Invoice,
  Payment,
  AttendanceRecord,
  Result,
  Exam,
  Section,
  ClassModel,
  Guardian,
  type IAcademicYear,
} from "@/models";

export async function getCurrentYear(): Promise<IAcademicYear> {
  await connectDb();
  const y =
    (await AcademicYear.findOne({ isCurrent: true }).lean()) ??
    (await AcademicYear.findOne().sort({ name: -1 }).lean());
  if (!y) throw new Error("No academic year configured — run the seed.");
  return y as IAcademicYear;
}

export async function classSectionMap() {
  await connectDb();
  const [classes, sections] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Section.find().populate("classTeacher", "name").lean(),
  ]);
  return { classes, sections };
}

/** yyyy-mm-dd for "today" in Asia/Dhaka (UTC+6). */
export function todayStr(date = new Date()): string {
  const dhaka = new Date(date.getTime() + 6 * 3600_000);
  return dhaka.toISOString().slice(0, 10);
}

export async function dashboardStats() {
  await connectDb();
  const year = await getCurrentYear();
  const today = todayStr();

  const [enrolled, todayRecords, latestExam] = await Promise.all([
    Enrollment.countDocuments({ year: year._id, status: "active" }),
    AttendanceRecord.find({ date: today }).select("status").lean(),
    Exam.findOne({ year: year._id, resultPublished: true }).sort({ createdAt: -1 }).lean(),
  ]);

  const present = todayRecords.filter((r) => r.status === "present" || r.status === "late").length;
  const attendancePct = todayRecords.length ? (present / todayRecords.length) * 100 : null;

  // fee collection across everything due so far this year
  const invoices = await Invoice.find({
    year: year._id,
    status: { $ne: "void" },
    dueDate: { $lte: new Date() },
  })
    .select("netPayable paidAmount")
    .lean();
  const billed = invoices.reduce((s, i) => s + i.netPayable, 0);
  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const feePct = billed ? (collected / billed) * 100 : null;

  let passRate: number | null = null;
  if (latestExam) {
    const results = await Result.find({ exam: latestExam._id }).select("failed").lean();
    if (results.length) passRate = (results.filter((r) => !r.failed).length / results.length) * 100;
  }

  return {
    year,
    enrolled,
    attendancePct,
    attendanceTaken: todayRecords.length > 0,
    feePct,
    billed,
    collected,
    passRate,
    latestExamName: latestExam?.name ?? null,
  };
}

/** Last 6 calendar months of fee-collection rate. */
export async function feeCollectionTrend(months = 6) {
  await connectDb();
  const year = await getCurrentYear();
  const now = new Date();
  const out: { label: string; period: string; billed: number; collected: number; pct: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const period = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const invs = await Invoice.find({ year: year._id, period }).select("netPayable paidAmount").lean();
    const billed = invs.reduce((s, x) => s + x.netPayable, 0);
    const collected = invs.reduce((s, x) => s + x.paidAmount, 0);
    out.push({
      label: dt.toLocaleString("en", { month: "short" }),
      period,
      billed,
      collected,
      pct: billed ? Math.round((collected / billed) * 100) : 0,
    });
  }
  return out;
}

export async function attendanceDriftByClass() {
  await connectDb();
  const today = todayStr();
  const rows = await AttendanceRecord.aggregate<{
    _id: string;
    total: number;
    present: number;
  }>([
    { $match: { date: today } },
    {
      $group: {
        _id: "$section",
        total: { $sum: 1 },
        present: { $sum: { $cond: [{ $in: ["$status", ["present", "late"]] }, 1, 0] } },
      },
    },
  ]);
  const sections = await Section.find({ _id: { $in: rows.map((r) => r._id) } })
    .populate("klass", "name numeric order")
    .lean();
  const map = new Map(sections.map((s) => [String(s._id), s]));
  return rows
    .map((r) => {
      const sec = map.get(String(r._id));
      const klass = sec?.klass as unknown as { name: string; order: number } | undefined;
      return {
        section: sec ? `${klass?.name ?? "?"} ${sec.name}` : "Unknown",
        order: klass?.order ?? 99,
        pct: r.total ? Math.round((r.present / r.total) * 100) : 0,
        present: r.present,
        total: r.total,
      };
    })
    .sort((a, b) => a.pct - b.pct);
}

/** Resolve the students a guardian user can see. */
export async function studentsForGuardian(guardianId: string) {
  await connectDb();
  const students = await Student.find({ "guardians.guardian": guardianId }).lean();
  const year = await getCurrentYear();
  const enrollments = await Enrollment.find({
    student: { $in: students.map((s) => s._id) },
    year: year._id,
  })
    .populate("klass", "name numeric")
    .populate("section", "name")
    .lean();
  const enrMap = new Map(enrollments.map((e) => [String(e.student), e]));
  return students.map((s) => ({ student: s, enrollment: enrMap.get(String(s._id)) ?? null }));
}

export async function guardianName(guardianId: string) {
  await connectDb();
  return (await Guardian.findById(guardianId).lean())?.name ?? "Guardian";
}

export async function recentPayments(limit = 6) {
  await connectDb();
  return Payment.find({ status: "success" })
    .sort({ paidAt: -1 })
    .limit(limit)
    .populate("student", "name studentCode")
    .lean();
}
