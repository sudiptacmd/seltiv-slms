"use server";

import { PERIODS } from "@/lib/ai/grading";
import { connectDb } from "@/lib/db";
import {
  Exam,
  ExamSubject,
  Term,
  ClassModel,
  Subject,
  Section,
  Result,
  Enrollment,
  GradeEntry,
  ExamStudentRecord,
  GradingScale,
  Notice,
  NoticeRecipient,
  Student,
  User,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { getReportScheme } from "@/lib/grading";
import { computeReport, rankReports, type RowValues } from "@/lib/report-card";
import { recordAudit } from "@/lib/audit";
import { sendBulkSms } from "@/lib/adapters/sms";
import { env } from "@/lib/env";
import { guard, revalidate, fd, type ActionState } from "./_common";

export async function createExam(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const year = await getCurrentYear();

  const termId = f.str("termId");
  const name = f.str("name");
  const classIds = f.all("classId");
  if (!termId || !name || classIds.length === 0) return { error: "Name, term and at least one class are required." };

  const markingPeriod = f.str("markingPeriod");
  if (markingPeriod && !PERIODS.includes(markingPeriod as typeof PERIODS[number])) return { error: "Invalid assessment type." };
  if (!await Term.exists({ _id: termId, year: year._id })) return { error: "Select a term in the current academic year." };

  const exam = await Exam.create({
    year: year._id,
    term: termId,
    name,
    markingPeriod: markingPeriod || undefined,
    classes: classIds,
    startDate: f.date("startDate"),
    endDate: f.date("endDate"),
  });

  // seed ExamSubject rows from each class's subjects
  for (const classId of classIds) {
    const subs = await Subject.find({ klass: classId }).lean();
    for (const s of subs) {
      await ExamSubject.create({
        exam: exam._id,
        klass: classId,
        subject: s._id,
        fullMarks: s.fullMarks,
        passMarks: s.passMarks,
      });
    }
  }
  await recordAudit({ actor: user, action: "exam.create", entity: "Exam", entityId: String(exam._id), after: { name } });
  revalidate("/admin/exams");
  return { ok: true, message: `${name} created.` };
}

export async function publishExamRoutine(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const examId = String(form.get("examId") ?? "");
  const exam = await Exam.findById(examId);
  if (!exam) return { error: "Exam not found." };
  exam.routinePublished = true;
  await exam.save();

  const notice = await Notice.create({
    title: `${exam.name} — routine published`,
    body: `The routine for ${exam.name} is now available on the portal.`,
    audience: { kind: "all_parents" },
    channels: ["portal", "sms"],
    status: "published",
    publishedAt: new Date(),
    createdBy: user!.id,
  });

  // SMS to guardians
  const students = await Student.find({ status: "active" }).select("name guardians").lean();
  const { Guardian } = await import("@/models");
  const msgs: { to: string; text: string }[] = [];
  const recipients: { notice: unknown; user?: unknown; guardian: unknown; student: unknown }[] = [];
  for (const s of students) {
    const primary = s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];
    if (!primary) continue;
    const g = await Guardian.findById(primary.guardian).lean();
    const gUser = await User.findOne({ guardian: primary.guardian }).select("_id").lean();
    recipients.push({ notice: notice._id, user: gUser?._id, guardian: primary.guardian, student: s._id });
    if (g?.phone) msgs.push({ to: g.phone, text: `${env.school.code}: ${exam.name} routine published. See the portal.` });
  }
  await NoticeRecipient.insertMany(recipients);
  const res = await sendBulkSms(msgs, "notice");
  await Notice.updateOne({ _id: notice._id }, { recipientCount: recipients.length, smsSent: res.sent, smsDelivered: res.sent });

  await recordAudit({ actor: user, action: "exam.routine_publish", entity: "Exam", entityId: examId });
  revalidate("/admin/exams", `/admin/exams/${examId}`);
  return { ok: true, message: `Routine published — notice sent to ${recipients.length} guardians.` };
}

export async function processExamResults(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const examId = String(form.get("examId") ?? "");
  const publish = form.get("publish") === "true";

  const exam = await Exam.findById(examId).lean();
  if (!exam) return { error: "Exam not found." };
  const scale = await GradingScale.findOne({ isDefault: true }).lean();
  const [enrollments, entries, records] = await Promise.all([
    Enrollment.find({ year: exam.year, klass: { $in: exam.classes }, status: "active" }).lean(),
    GradeEntry.find({ exam: examId }).lean(),
    ExamStudentRecord.find({ exam: examId }).lean(),
  ]);
  const entriesByStudent = new Map<string, Map<string, { values: RowValues; absent: boolean }>>();
  for (const e of entries) {
    const sid = String(e.student);
    if (!entriesByStudent.has(sid)) entriesByStudent.set(sid, new Map());
    entriesByStudent.get(sid)!.set(e.row, { values: e.values instanceof Map ? Object.fromEntries(e.values) : { ...e.values }, absent: e.absent });
  }
  const recordByStudent = new Map(records.map((r) => [String(r.student), r]));

  let processed = 0;
  for (const klassId of exam.classes.map(String)) {
    const scheme = await getReportScheme(klassId);
    const computed = enrollments
      .filter((enr) => String(enr.klass) === klassId && entriesByStudent.has(String(enr.student)))
      .map((enr) => ({ enr, id: String(enr.student), report: computeReport(scheme, entriesByStudent.get(String(enr.student))!, scale) }));
    if (!computed.length) continue;

    const highest = new Map(scheme.map((row) => {
      const totals = computed.map((c) => c.report.rows.find((r) => r.key === row.key)?.total).filter((t): t is number => t != null);
      return [row.key, totals.length ? Math.max(...totals) : null];
    }));
    const flat = computed.map((c) => ({ id: c.id, section: String(c.enr.section), gpa: c.report.gpa, grandTotal: c.report.grandTotal, failed: c.report.failed }));
    const classRanks = rankReports(flat);
    const sectionRanks = new Map<string, number>(), sectionCounts = new Map<string, number>();
    for (const sec of new Set(flat.map((f) => f.section))) {
      const list = flat.filter((f) => f.section === sec);
      sectionCounts.set(sec, list.length);
      for (const [id, rank] of rankReports(list)) sectionRanks.set(id, rank);
    }

    for (const { enr, id, report } of computed) {
      const rec = recordByStudent.get(id);
      const byKey = new Map(scheme.map((r) => [r.key, r]));
      await Result.findOneAndUpdate(
        { exam: examId, student: enr.student },
        {
          exam: examId,
          year: exam.year,
          section: enr.section,
          klass: enr.klass,
          student: enr.student,
          rows: report.rows.map((r) => {
            const row = byKey.get(r.key)!;
            return {
              key: r.key, label: r.label, kind: r.kind, values: r.values, max: row.max,
              summativePct: row.summativePct, continuousPct: row.continuousPct,
              summativeConverted: r.summativeConverted, continuousConverted: r.continuousConverted,
              total: r.total, fullMarks: r.fullMarks, grade: r.grade, gp: r.gp, highest: highest.get(r.key) ?? null, absent: r.absent,
            };
          }),
          subjects: report.rows.filter((r) => r.kind === "main").map((r) => ({
            subject: r.subject, label: r.label, obtained: r.absent ? null : r.total, fullMarks: r.fullMarks, grade: r.grade, gpa: r.gp, absent: r.absent,
          })),
          totalObtained: report.grandTotal,
          totalFull: report.totalFull,
          percent: report.percent,
          gpa: report.gpa,
          grade: report.grade,
          failed: report.failed,
          sectionRank: sectionRanks.get(id),
          classRank: classRanks.get(id),
          sectionCount: sectionCounts.get(String(enr.section)),
          classCount: computed.length,
          attendance: {
            workingDays: rec?.workingDays,
            present: rec?.present,
            absent: rec?.workingDays != null && rec?.present != null ? rec.workingDays - rec.present : undefined,
            late: rec?.late,
          },
          remarks: rec?.remarks || undefined,
          ...(publish ? { publishedAt: new Date() } : {}),
        },
        { upsert: true },
      );
      processed++;
    }
  }

  if (publish) {
    await Exam.updateOne({ _id: examId }, { resultPublished: true });
    await Result.updateMany({ exam: examId }, { publishedAt: new Date() });
  }

  await recordAudit({
    actor: user,
    action: publish ? "gradesheet.publish" : "exam.process",
    entity: "Exam",
    entityId: examId,
    after: { processed, published: publish },
  });
  revalidate("/admin/exams", `/admin/exams/${examId}/results`, `/admin/exams/${examId}/grading`, "/parent/child/gradesheet", "/admin");
  return {
    ok: true,
    message: publish
      ? `Results published for ${processed} students. Report cards are now visible to parents.`
      : `Processed ${processed} students (draft — not yet visible to parents).`,
  };
}

void Term;
void ClassModel;
void Section;
