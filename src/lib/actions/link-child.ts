"use server";

import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { Student, Guardian, PasswordResetOtp, User } from "@/models";
import { getCurrentUser } from "@/lib/session";
import { sendSms } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { revalidate, type ActionState } from "./_common";

export async function requestChildLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.roles.includes("parent")) return { error: "Sign in as a guardian." };
  await connectDb();

  const code = String(form.get("studentCode") ?? "").trim();
  if (!code) return { error: "Enter the student ID." };
  const student = await Student.findOne({ studentCode: code }).lean();
  if (!student) return { message: "If that student ID exists, a code has been sent to the registered number." };

  const primary = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];
  const guardian = primary ? await Guardian.findById(primary.guardian).lean() : null;
  if (!guardian?.phone) return { error: "That student has no guardian phone on file — please contact the office." };

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  await PasswordResetOtp.deleteMany({ phone: `link:${code}:${user.id}` });
  await PasswordResetOtp.create({
    phone: `link:${code}:${user.id}`,
    otpHash: await bcrypt.hash(otp, 8),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  await sendSms(guardian.phone, `${env.school.code}: Use code ${otp} to link ${student.name} to a guardian account. Ignore if this wasn't you.`, {
    purpose: "otp",
  });
  return { ok: true, message: `A 6-digit code was sent to the number ending ${guardian.phone.slice(-3)}.` };
}

export async function confirmChildLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.roles.includes("parent") || !user.guardianId) return { error: "Sign in as a guardian." };
  await connectDb();

  const code = String(form.get("studentCode") ?? "").trim();
  const otp = String(form.get("otp") ?? "").trim();
  const rec = await PasswordResetOtp.findOne({ phone: `link:${code}:${user.id}` }).sort({ createdAt: -1 });
  if (!rec || rec.expiresAt < new Date()) return { error: "The code has expired — request a new one." };
  if (!(await bcrypt.compare(otp, rec.otpHash))) {
    rec.attempts += 1;
    await rec.save();
    return { error: "Incorrect code." };
  }

  const student = await Student.findOne({ studentCode: code });
  if (!student) return { error: "Student not found." };
  if (!student.guardians.some((g) => String(g.guardian) === user.guardianId)) {
    student.guardians.push({ guardian: user.guardianId as never, isPrimary: student.guardians.length === 0 });
    await student.save();
  }
  await PasswordResetOtp.deleteMany({ phone: `link:${code}:${user.id}` });
  await User.updateOne({ _id: user.id }, { $addToSet: { roles: "parent" } });

  await recordAudit({ actor: user, action: "parent.link_child", entity: "Student", entityId: String(student._id), after: { studentCode: code } });
  revalidate("/parent", "/parent/children");
  return { ok: true, message: `${student.name} is now linked to your account.` };
}
