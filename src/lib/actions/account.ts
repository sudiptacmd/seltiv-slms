"use server";

import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { User, Notification } from "@/models";
import { getCurrentUser } from "@/lib/session";
import { revalidate, type ActionState } from "./_common";

export async function changePassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Signed out." };
  await connectDb();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  if (next.length < 6) return { error: "New password must be at least 6 characters." };

  const doc = await User.findById(user.id);
  if (!doc) return { error: "Account not found." };
  if (!(await bcrypt.compare(current, doc.passwordHash))) return { error: "Current password is incorrect." };
  doc.passwordHash = await bcrypt.hash(next, 10);
  doc.mustChangePassword = false;
  await doc.save();
  return { ok: true, message: "Password updated." };
}

export async function updateNotificationPrefs(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Signed out." };
  await connectDb();
  await User.updateOne(
    { _id: user.id },
    {
      "notificationPrefs.sms": form.get("sms") === "on",
      "notificationPrefs.email": form.get("email") === "on",
    },
  );
  return { ok: true, message: "Preferences saved." };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Signed out." };
  await connectDb();
  await Notification.updateMany({ user: user.id, readAt: { $exists: false } }, { readAt: new Date() });
  revalidate("/notifications");
  return { ok: true };
}
