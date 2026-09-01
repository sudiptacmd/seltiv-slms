"use server";

import { connectDb } from "@/lib/db";
import { Mark, MarkSubmission, ExamSubject, Enrollment, Exam } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, type ActionState } from "./_common";

async function loadContext(examId: string, sectionId: string, subjectId: string) {
  const year = await getCurrentYear();
  const exam = await Exam.findById(examId).lean();
  const es = await ExamSubject.findOne({ exam: examId, subject: subjectId }).lean();
  const enrollments = await Enrollment.find({ section: sectionId, year: year._id, status: "active" }).lean();
  return { exam, es, enrollments };
}

export async function saveMarks(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("teacher");
  if (deny) return deny;
  await connectDb();
  const examId = String(form.get("examId") ?? "");
  const sectionId = String(form.get("sectionId") ?? "");
  const subjectId = String(form.get("subjectId") ?? "");
  const submit = form.get("submit") === "true";

  const { exam, es, enrollments } = await loadContext(examId, sectionId, subjectId);
  if (!exam || !es) return { error: "Exam or subject not configured." };
  if (exam.resultPublished) return { error: "Results are published — marks are locked." };

  const submission = await MarkSubmission.findOne({ exam: examId, section: sectionId, subject: subjectId });
  if (submission?.locked) return { error: "This mark sheet has been locked by the office." };

  const full = es.fullMarks;
  let entered = 0;
  const before: Record<string, number | null> = {};

  for (const enr of enrollments) {
    const sid = String(enr.student);
    const raw = form.get(`m_${sid}`);
    const absent = form.get(`a_${sid}`) === "on";
    let obtained: number | null = null;
    if (!absent && raw != null && String(raw).trim() !== "") {
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0 || n > full) return { error: `Mark for one student is outside 0–${full}.` };
      obtained = Math.round(n * 100) / 100;
    }
    const existing = await Mark.findOne({ exam: examId, subject: subjectId, student: sid });
    before[sid] = existing?.obtained ?? null;
    if (existing) {
      existing.obtained = obtained;
      existing.absent = absent;
      existing.enteredBy = user!.staffId as never;
      await existing.save();
    } else {
      await Mark.create({ exam: examId, section: sectionId, subject: subjectId, student: sid, obtained, absent, enteredBy: user!.staffId });
    }
    if (obtained != null || absent) entered++;
  }

  await MarkSubmission.findOneAndUpdate(
    { exam: examId, section: sectionId, subject: subjectId },
    {
      submitted: submit,
      ...(submit ? { submittedBy: user!.staffId, submittedAt: new Date() } : {}),
    },
    { upsert: true },
  );

  await recordAudit({
    actor: user,
    action: submit ? "grade.submit" : "grade.save",
    entity: "Mark",
    entityId: `${examId}:${sectionId}:${subjectId}`,
    meta: { entered, of: enrollments.length },
  });

  revalidate("/teacher/gradesheet", `/teacher/gradesheet/${examId}/${subjectId}`, "/admin/exams");
  return {
    ok: true,
    message: submit
      ? `Submitted — ${entered} of ${enrollments.length} students. The mark sheet is now read-only until the office unlocks it.`
      : `Saved ${entered} of ${enrollments.length} marks as a draft.`,
  };
}
