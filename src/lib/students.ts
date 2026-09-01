import "server-only";
import { connectDb } from "./db";
import {
  Student,
  Enrollment,
  Result,
  Exam,
  AttendanceRecord,
  Invoice,
  Guardian,
  Subject,
  Section,
  ClassModel,
  Discount,
  type IStudent,
} from "@/models";
import { getCurrentYear } from "./queries";

export type StudentListFilter = {
  q?: string;
  classId?: string;
  sectionId?: string;
  status?: string;
  page?: number;
  perPage?: number;
};

export async function listStudents(filter: StudentListFilter) {
  await connectDb();
  const year = await getCurrentYear();
  const page = Math.max(1, filter.page ?? 1);
  const perPage = filter.perPage ?? 25;

  const enrQuery: Record<string, unknown> = { year: year._id };
  if (filter.classId) enrQuery.klass = filter.classId;
  if (filter.sectionId) enrQuery.section = filter.sectionId;

  const enrollments = await Enrollment.find(enrQuery)
    .populate("klass", "name numeric")
    .populate("section", "name")
    .lean();

  const studentQuery: Record<string, unknown> = { _id: { $in: enrollments.map((e) => e.student) } };
  if (filter.status) studentQuery.status = filter.status;
  if (filter.q) {
    studentQuery.$or = [
      { name: { $regex: filter.q, $options: "i" } },
      { studentCode: { $regex: filter.q, $options: "i" } },
    ];
  }

  const [students, total] = await Promise.all([
    Student.find(studentQuery).sort({ name: 1 }).lean(),
    Student.countDocuments(studentQuery),
  ]);

  const enrMap = new Map(enrollments.map((e) => [String(e.student), e]));
  const rows = students
    .map((s) => ({ student: s, enrollment: enrMap.get(String(s._id))! }))
    .filter((r) => r.enrollment)
    .sort((a, b) => {
      const ka = a.enrollment.klass as unknown as { numeric: number };
      const kb = b.enrollment.klass as unknown as { numeric: number };
      return ka.numeric - kb.numeric || a.enrollment.rollNumber - b.enrollment.rollNumber;
    });

  return {
    rows: rows.slice((page - 1) * perPage, page * perPage),
    total: filter.q || filter.status ? rows.length : total,
    page,
    perPage,
    pageCount: Math.max(1, Math.ceil(rows.length / perPage)),
  };
}

export type StudentProfile = Awaited<ReturnType<typeof getStudentProfile>>;

export async function getStudentProfile(studentId: string) {
  await connectDb();
  const year = await getCurrentYear();

  const student = (await Student.findById(studentId).lean()) as IStudent | null;
  if (!student) return null;

  const [enrollment, guardians, results, attendance, invoices, discounts] = await Promise.all([
    Enrollment.findOne({ student: studentId, year: year._id })
      .populate("klass", "name numeric")
      .populate("section", "name")
      .lean(),
    Guardian.find({ _id: { $in: student.guardians.map((g) => g.guardian) } }).lean(),
    Result.find({ student: studentId, year: year._id })
      .populate({ path: "exam", select: "name term resultPublished", populate: { path: "term", select: "name order" } })
      .lean(),
    AttendanceRecord.find({ student: studentId }).select("status date").lean(),
    Invoice.find({ student: studentId, year: year._id }).sort({ period: 1 }).lean(),
    Discount.find({ student: studentId, year: year._id, active: true }).populate("heads", "name").lean(),
  ]);

  const attSummary = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === "present").length,
    absent: attendance.filter((a) => a.status === "absent").length,
    late: attendance.filter((a) => a.status === "late").length,
    leave: attendance.filter((a) => a.status === "leave").length,
    get attended() {
      return this.present + this.late;
    },
    get pct() {
      return this.total ? Math.round((this.attended / this.total) * 100) : null;
    },
  };

  const termGpas = results
    .filter((r) => (r.exam as unknown as { resultPublished?: boolean })?.resultPublished)
    .map((r) => {
      const exam = r.exam as unknown as { name: string; term?: { name: string; order: number } };
      return {
        exam: exam.name,
        term: exam.term?.name ?? "—",
        order: exam.term?.order ?? 99,
        gpa: r.gpa,
        grade: r.grade,
        sectionRank: r.sectionRank,
        classRank: r.classRank,
        percent: r.percent,
        failed: r.failed,
        examId: String(r.exam && (r.exam as unknown as { _id: unknown })._id),
      };
    })
    .sort((a, b) => a.order - b.order);

  const now = new Date();
  const unpaid = invoices.filter((i) => i.netPayable - i.paidAmount > 0.5 && i.status !== "void");
  // "outstanding" = only what is actually past due
  const outstanding = unpaid
    .filter((i) => new Date(i.dueDate) <= now)
    .reduce((s, i) => s + (i.netPayable - i.paidAmount), 0);
  const upcoming = unpaid.reduce((s, i) => s + (i.netPayable - i.paidAmount), 0);
  const nextDue = unpaid.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];

  return {
    student,
    enrollment,
    guardians,
    guardianLinks: student.guardians,
    termGpas,
    attendance: attSummary,
    invoices,
    outstanding,
    upcoming,
    nextDue,
    discounts,
    year,
  };
}

export async function getStudentSubjectMarks(studentId: string, examId: string) {
  await connectDb();
  const result = await Result.findOne({ student: studentId, exam: examId }).lean();
  if (!result) return null;
  const subjects = await Subject.find({
    _id: { $in: result.subjects.map((s) => s.subject) },
  }).lean();
  const map = new Map(subjects.map((s) => [String(s._id), s]));
  return {
    result,
    lines: result.subjects.map((s) => ({
      name: map.get(String(s.subject))?.name ?? "—",
      obtained: s.obtained,
      fullMarks: s.fullMarks,
      grade: s.grade,
      gpa: s.gpa,
      absent: s.absent,
    })),
  };
}

export async function classSectionOptions() {
  await connectDb();
  const [classes, sections] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Section.find().populate("klass", "name numeric order").lean(),
  ]);
  return {
    classes: classes.map((c) => ({ id: String(c._id), name: c.name, numeric: c.numeric })),
    sections: sections
      .map((s) => {
        const k = s.klass as unknown as { name: string; order: number; _id: unknown };
        return { id: String(s._id), name: `${k.name} ${s.name}`, classId: String(k._id), order: k.order };
      })
      .sort((a, b) => a.order - b.order),
  };
}
