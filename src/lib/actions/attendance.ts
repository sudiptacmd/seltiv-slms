"use server";

import { connectDb } from "@/lib/db";
import {
  AttendanceSession,
  AttendanceRecord,
  Section,
  Student,
  Guardian,
  Settings,
  Enrollment,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { sendSms, renderTemplate } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { formatDate } from "@/lib/utils";
import { guard, revalidate, type ActionState } from "./_common";
import type { AttendanceStatus } from "@/models/types";

export async function saveRollCall(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("teacher");
  if (deny) return deny;
  await connectDb();

  const sectionId = String(form.get("sectionId") ?? "");
  const date = String(form.get("date") ?? "");
  const period = String(form.get("period") ?? "").trim() || undefined;
  if (!sectionId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a section and a valid date." };

  const section = await Section.findById(sectionId).lean();
  if (!section) return { error: "Invalid section." };
  const year = await getCurrentYear();

  // roster
  const enrollments = await Enrollment.find({ section: sectionId, year: year._id, status: "active" }).lean();
  const statusByStudent = new Map<string, AttendanceStatus>();
  for (const e of enrollments) {
    const raw = String(form.get(`s_${e.student}`) ?? "present") as AttendanceStatus;
    statusByStudent.set(String(e.student), ["present", "absent", "late", "leave"].includes(raw) ? raw : "present");
  }

  let session = await AttendanceSession.findOne({ section: sectionId, date, period: period ?? null });
  if (!session) {
    session = await AttendanceSession.create({
      year: year._id,
      section: sectionId,
      date,
      period,
      takenBy: user!.staffId,
    });
  } else if (session.locked) {
    return { error: "This roll call is locked and cannot be edited." };
  }

  const settings = await Settings.findOne().lean();
  const tpl = settings?.absenceSmsTemplate ?? "Dear Guardian, {student} was marked {status} on {date}.";
  const klassName = (await Section.findById(sectionId).populate("klass", "name").lean())?.klass as unknown as { name: string } | undefined;

  let present = 0, absent = 0, late = 0, leave = 0;
  const absentStudentIds: string[] = [];

  for (const [studentId, status] of statusByStudent) {
    const existing = await AttendanceRecord.findOne({ session: session._id, student: studentId });
    const wasAbsent = existing?.status === "absent";
    if (existing) {
      existing.status = status;
      await existing.save();
    } else {
      await AttendanceRecord.create({ session: session._id, student: studentId, section: sectionId, date, status });
    }
    if (status === "present") present++;
    else if (status === "absent") { absent++; if (!wasAbsent || !existing?.smsSent) absentStudentIds.push(studentId); }
    else if (status === "late") late++;
    else leave++;
  }

  session.presentCount = present;
  session.absentCount = absent;
  session.lateCount = late;
  session.leaveCount = leave;
  await session.save();

  // fire absence SMS to primary guardians
  let smsCount = 0;
  if (absentStudentIds.length) {
    const students = await Student.find({ _id: { $in: absentStudentIds } }).lean();
    for (const st of students) {
      const primary = st.guardians.find((g) => g.isPrimary) ?? st.guardians[0];
      if (!primary) continue;
      const guardian = await Guardian.findById(primary.guardian).lean();
      if (!guardian?.phone) continue;
      const text = renderTemplate(tpl, {
        student: st.name,
        class: klassName?.name ?? "",
        status: "absent",
        date: formatDate(date, "short"),
        school: env.school.code,
      });
      await sendSms(guardian.phone, text, { purpose: "attendance", relatedId: String(session._id) });
      await AttendanceRecord.updateOne({ session: session._id, student: st._id }, { smsSent: true });
      smsCount++;
    }
  }

  await recordAudit({
    actor: user,
    action: "attendance.rollcall",
    entity: "AttendanceSession",
    entityId: String(session._id),
    after: { date, section: sectionId, present, absent, late },
  });

  revalidate("/teacher/attendance", "/teacher/attendance/history", "/admin/attendance", "/teacher");
  return {
    ok: true,
    message: `Saved — ${present} present, ${absent} absent, ${late} late.${smsCount ? ` ${smsCount} SMS sent to absentees' guardians.` : ""}`,
  };
}
