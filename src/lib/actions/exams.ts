"use server";

import { connectDb } from "@/lib/db";
import {
  Exam,
  ExamSubject,
  Term,
  ClassModel,
  Subject,
  Section,
  Mark,
  MarkSubmission,
  Result,
  Enrollment,
  GradingScale,
  Notice,
  NoticeRecipient,
  Student,
  User,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { computeResult, rankResults } from "@/lib/academic";
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

  const exam = await Exam.create({
    year: year._id,
    term: termId,
    name,
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
  const year = await getCurrentYear();
  const scale = await GradingScale.findOne({ isDefault: true }).lean();

  const [examSubjects, marks, enrollments] = await Promise.all([
    ExamSubject.find({ exam: examId }).lean(),
    Mark.find({ exam: examId }).lean(),
    Enrollment.find({ year: year._id, klass: { $in: exam.classes }, status: "active" }).lean(),
  ]);
  const esByClassSubj = new Map(examSubjects.map((es) => [`${es.klass}:${es.subject}`, es]));
  const marksByStudentSubj = new Map(marks.map((m) => [`${m.student}:${m.subject}`, m]));
  const subjectsByClass = new Map<string, string[]>();
  for (const es of examSubjects) {
    const k = String(es.klass);
    if (!subjectsByClass.has(k)) subjectsByClass.set(k, []);
    subjectsByClass.get(k)!.push(String(es.subject));
  }

  const bySection = new Map<string, { student: string; totalObtained: number; gpa: number }[]>();
  const byClass = new Map<string, { student: string; totalObtained: number; gpa: number }[]>();
  let processed = 0;

  for (const enr of enrollments) {
    const subjectIds = subjectsByClass.get(String(enr.klass)) ?? [];
    const subjectMarks = subjectIds.map((sid) => {
      const es = esByClassSubj.get(`${enr.klass}:${sid}`)!;
      const m = marksByStudentSubj.get(`${enr.student}:${sid}`);
      return {
        subjectId: sid,
        obtained: m?.obtained ?? null,
        fullMarks: es.fullMarks,
        passMarks: es.passMarks,
        absent: Boolean(m?.absent),
        exempt: Boolean(m?.exempt),
      };
    });
    if (subjectMarks.every((m) => m.obtained == null && !m.absent)) continue; // nothing entered

    const computed = computeResult(subjectMarks, scale);
    const res = await Result.findOneAndUpdate(
      { exam: examId, student: enr.student },
      {
        exam: examId,
        year: year._id,
        section: enr.section,
        klass: enr.klass,
        student: enr.student,
        subjects: computed.subjects.map((s) => ({
          subject: s.subjectId,
          obtained: s.obtained,
          fullMarks: s.fullMarks,
          grade: s.grade,
          gpa: s.gpa,
          absent: s.absent,
        })),
        totalObtained: computed.totalObtained,
        totalFull: computed.totalFull,
        percent: computed.percent,
        gpa: computed.gpa,
        grade: computed.grade,
        failed: computed.failed,
        ...(publish ? { publishedAt: new Date() } : {}),
      },
      { upsert: true, new: true },
    );
    processed++;

    const secKey = String(enr.section);
    const clsKey = String(enr.klass);
    if (!bySection.has(secKey)) bySection.set(secKey, []);
    if (!byClass.has(clsKey)) byClass.set(clsKey, []);
    bySection.get(secKey)!.push({ student: String(res!._id), totalObtained: computed.totalObtained, gpa: computed.gpa });
    byClass.get(clsKey)!.push({ student: String(res!._id), totalObtained: computed.totalObtained, gpa: computed.gpa });
  }

  for (const [, list] of bySection) {
    const ranks = rankResults(list);
    for (const [rid, rank] of ranks) await Result.updateOne({ _id: rid }, { sectionRank: rank });
  }
  for (const [, list] of byClass) {
    const ranks = rankResults(list);
    for (const [rid, rank] of ranks) await Result.updateOne({ _id: rid }, { classRank: rank });
  }

  if (publish) {
    await Exam.updateOne({ _id: examId }, { resultPublished: true });
    await Result.updateMany({ exam: examId }, { publishedAt: new Date() });
    await MarkSubmission.updateMany({ exam: examId }, { locked: true });
  }

  await recordAudit({
    actor: user,
    action: publish ? "gradesheet.publish" : "exam.process",
    entity: "Exam",
    entityId: examId,
    after: { processed, published: publish },
  });
  revalidate("/admin/exams", `/admin/exams/${examId}/results`, "/parent/child/gradesheet", "/admin");
  return {
    ok: true,
    message: publish
      ? `Results published for ${processed} students. Gradesheets are now visible to parents.`
      : `Processed ${processed} students (draft — not yet visible to parents).`,
  };
}

export async function toggleMarkLock(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const id = String(form.get("id") ?? "");
  const sub = await MarkSubmission.findById(id);
  if (!sub) return { error: "Not found." };
  sub.locked = !sub.locked;
  await sub.save();
  revalidate("/admin/exams");
  return { ok: true, message: sub.locked ? "Locked." : "Unlocked for the teacher." };
}

void Term;
void ClassModel;
void Section;
