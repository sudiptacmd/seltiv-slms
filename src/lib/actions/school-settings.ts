"use server";

import { connectDb } from "@/lib/db";
import { Settings, CalendarDay, GradingScale } from "@/models";
import { recordAudit } from "@/lib/audit";
import { guard, revalidate, fd, type ActionState } from "./_common";

export async function saveSchoolSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const data = {
    schoolName: f.opt("schoolName"),
    headTeacher: f.opt("headTeacher"),
    address: f.opt("address"),
    eiin: f.opt("eiin"),
    phone: f.opt("phone"),
    email: f.opt("email"),
    logoUrl: f.opt("logoUrl"),
  };
  await Settings.findOneAndUpdate({ key: "singleton" }, data, { upsert: true });
  await recordAudit({ actor: user, action: "settings.school", entity: "Settings", after: data });
  revalidate("/admin/settings/school");
  return { ok: true, message: "School details saved. Some values also come from environment variables in production." };
}

export async function saveNotificationTemplates(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  await Settings.findOneAndUpdate(
    { key: "singleton" },
    {
      absenceSmsTemplate: f.str("absenceSmsTemplate"),
      feeReminderSmsTemplate: f.str("feeReminderSmsTemplate"),
    },
    { upsert: true },
  );
  revalidate("/admin/settings/integrations");
  return { ok: true, message: "SMS templates saved." };
}

export async function setAttendanceWindow(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  await Settings.findOneAndUpdate({ key: "singleton" }, { attendanceEditWindowHours: f.num("hours") ?? 24 }, { upsert: true });
  revalidate("/admin/attendance/settings");
  return { ok: true, message: "Edit window updated." };
}

export async function addPeriod(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  const { addPeriodSlot } = await import("./academics");
  return addPeriodSlot(_prev, form);
}

export async function addCalendarDay(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const date = f.str("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  await CalendarDay.findOneAndUpdate(
    { date },
    { date, title: f.str("title"), kind: f.str("kind") || "holiday" },
    { upsert: true },
  );
  revalidate("/admin/attendance/settings", "/admin/settings/academic-calendar");
  return { ok: true, message: "Calendar updated." };
}

export async function saveGradingScale(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const grades = f.all("grade");
  const mins = f.all("minPercent").map(Number);
  const gpas = f.all("gpa").map(Number);
  const bands = grades.map((g, i) => ({ grade: g, minPercent: mins[i] ?? 0, gpa: gpas[i] ?? 0 }));
  const existing = await GradingScale.findOne({ isDefault: true });
  if (existing) {
    existing.bands = bands;
    existing.failGrade = f.str("failGrade") || "F";
    await existing.save();
  } else {
    await GradingScale.create({ name: "Custom", isDefault: true, bands, failGrade: f.str("failGrade") || "F" });
  }
  await recordAudit({ actor: user, action: "settings.grading_scale", entity: "GradingScale", after: { bands } });
  revalidate("/admin/exams/grading-scale");
  return { ok: true, message: "Grading scale saved. Re-process results for it to take effect." };
}
