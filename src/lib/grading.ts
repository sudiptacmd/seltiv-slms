import "server-only";
import { connectDb } from "./db";
import { ReportScheme, Subject, Exam, Section, Enrollment, GradeEntry, ExamStudentRecord, type IReportScheme } from "@/models";
import { defaultSchemeRows, type SchemeRow, type RowValues } from "./report-card";

const plain = (m: unknown): Record<string, number> =>
  m instanceof Map ? Object.fromEntries(m) : { ...(m as Record<string, number> | undefined) };

export function toSchemeRows(rows: IReportScheme["rows"]): SchemeRow[] {
  return rows.map((r) => ({
    key: r.key,
    label: r.label,
    subject: r.subject ? String(r.subject) : undefined,
    kind: r.kind,
    max: plain(r.max),
    summativePct: r.summativePct,
    continuousPct: r.continuousPct,
  }));
}

/** The class's report-card layout; created from its subjects the first time it is needed. */
export async function getReportScheme(klassId: string): Promise<SchemeRow[]> {
  await connectDb();
  let scheme = await ReportScheme.findOne({ klass: klassId }).lean();
  if (!scheme) {
    const subjects = await Subject.find({ klass: klassId }).sort({ order: 1 }).lean();
    await ReportScheme.updateOne({ klass: klassId }, { $setOnInsert: { klass: klassId, rows: defaultSchemeRows(subjects) } }, { upsert: true });
    scheme = await ReportScheme.findOne({ klass: klassId }).lean();
  }
  return toSchemeRows(scheme!.rows);
}

export async function sectionGradingData(examId: string, sectionId: string) {
  await connectDb();
  const [exam, section] = await Promise.all([
    Exam.findById(examId).lean(),
    Section.findById(sectionId).populate("klass", "name").populate("classTeacher", "name").lean(),
  ]);
  if (!exam || !section) return null;
  const klass = section.klass as unknown as { _id: unknown; name: string };
  if (!exam.classes.some((c) => String(c) === String(klass._id))) return null;
  const [scheme, enrollments, entries, records] = await Promise.all([
    getReportScheme(String(klass._id)),
    Enrollment.find({ section: sectionId, year: exam.year, status: "active" }).sort({ rollNumber: 1 }).populate("student", "name studentCode").lean(),
    GradeEntry.find({ exam: examId, section: sectionId }).lean(),
    ExamStudentRecord.find({ exam: examId, section: sectionId }).lean(),
  ]);
  const entryMap = new Map<string, Map<string, { values: RowValues; absent: boolean }>>();
  for (const e of entries) {
    const sid = String(e.student);
    if (!entryMap.has(sid)) entryMap.set(sid, new Map());
    entryMap.get(sid)!.set(e.row, { values: plain(e.values), absent: e.absent });
  }
  return {
    exam,
    section,
    klass,
    classTeacher: (section.classTeacher as unknown as { name?: string } | undefined)?.name,
    scheme,
    students: enrollments.map((e) => {
      const st = e.student as unknown as { _id: unknown; name: string; studentCode: string };
      return { id: String(st._id), name: st.name, code: st.studentCode, roll: e.rollNumber };
    }),
    entries: entryMap,
    records: new Map(records.map((r) => [String(r.student), r])),
  };
}
