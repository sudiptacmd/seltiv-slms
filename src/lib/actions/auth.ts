"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User, PasswordResetOtp } from "@/models";
import { sendSms, normalizeMsisdn } from "@/lib/adapters/sms";
import { env } from "@/lib/env";

export type ActionResult = { ok?: boolean; error?: string; message?: string };

export async function requestPasswordOtp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const phone = normalizeMsisdn(String(formData.get("phone") ?? "").trim());
  const parsed = z.string().min(8).safeParse(phone);
  if (!parsed.success) return { error: "Enter a valid phone number." };

  await connectDb();
  const user = await User.findOne({ phone, active: true });
  // Always report success (don't leak which numbers exist).
  if (user) {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await PasswordResetOtp.deleteMany({ phone });
    await PasswordResetOtp.create({
      phone,
      otpHash: await bcrypt.hash(otp, 8),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await sendSms(phone, `Your ${env.school.code} SLMS password reset code is ${otp}. Valid for 10 minutes.`, {
      purpose: "otp",
    });
  }
  return { ok: true, message: "If that number is registered, a reset code has been sent by SMS." };
}

export async function resetPassword(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const schema = z.object({
    phone: z.string().min(8),
    otp: z.string().length(6),
    password: z.string().min(6, "Password must be at least 6 characters."),
  });
  const parsed = schema.safeParse({
    phone: normalizeMsisdn(String(formData.get("phone") ?? "").trim()),
    otp: String(formData.get("otp") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  await connectDb();
  const rec = await PasswordResetOtp.findOne({ phone: parsed.data.phone }).sort({ createdAt: -1 });
  if (!rec || rec.expiresAt < new Date()) return { error: "The reset code has expired. Request a new one." };
  if (rec.attempts >= 5) return { error: "Too many attempts. Request a new code." };

  const ok = await bcrypt.compare(parsed.data.otp, rec.otpHash);
  if (!ok) {
    rec.attempts += 1;
    await rec.save();
    return { error: "Incorrect code." };
  }

  const user = await User.findOne({ phone: parsed.data.phone, active: true });
  if (!user) return { error: "Account not found." };
  user.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  user.mustChangePassword = false;
  user.failedLogins = 0;
  user.lockedUntil = undefined;
  await user.save();
  await PasswordResetOtp.deleteMany({ phone: parsed.data.phone });

  return { ok: true, message: "Password updated. You can sign in now." };
}
