"use server";

import { connectDb } from "@/lib/db";
import {
  Notice,
  NoticeRecipient,
  Student,
  Guardian,
  Staff,
  User,
  Enrollment,
  Notification,
} from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { sendBulkSms } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { guard, revalidate, fd, type ActionState } from "./_common";
import type { IAudience } from "@/models/notice";

async function resolveRecipients(audience: IAudience) {
  await connectDb();
  const year = await getCurrentYear();
  const targets: { userId?: string; guardianId?: string; studentId?: string; phone?: string }[] = [];

  const addGuardiansOf = async (studentIds: unknown[]) => {
    const students = await Student.find({ _id: { $in: studentIds } }).select("guardians").lean();
    for (const s of students) {
      const primary = s.guardians.find((g) => g.isPrimary) ?? s.guardians[0];
      if (!primary) continue;
      const g = await Guardian.findById(primary.guardian).lean();
      const u = await User.findOne({ guardian: primary.guardian }).select("_id").lean();
      targets.push({ userId: u ? String(u._id) : undefined, guardianId: String(primary.guardian), studentId: String(s._id), phone: g?.phone });
    }
  };

  switch (audience.kind) {
    case "all":
    case "all_parents": {
      const students = await Enrollment.find({ year: year._id, status: "active" }).select("student").lean();
      await addGuardiansOf(students.map((e) => e.student));
      if (audience.kind === "all") {
        const staff = await Staff.find({ active: true }).lean();
        for (const st of staff) {
          const u = await User.findOne({ staff: st._id }).select("_id").lean();
          targets.push({ userId: u ? String(u._id) : undefined, phone: st.phone });
        }
      }
      break;
    }
    case "all_teachers": {
      const staff = await Staff.find({ type: "teaching", active: true }).lean();
      for (const st of staff) {
        const u = await User.findOne({ staff: st._id }).select("_id").lean();
        targets.push({ userId: u ? String(u._id) : undefined, phone: st.phone });
      }
      break;
    }
    case "class": {
      const enrs = await Enrollment.find({ year: year._id, klass: audience.klass, status: "active" }).select("student").lean();
      await addGuardiansOf(enrs.map((e) => e.student));
      break;
    }
    case "section": {
      const enrs = await Enrollment.find({ year: year._id, section: audience.section, status: "active" }).select("student").lean();
      await addGuardiansOf(enrs.map((e) => e.student));
      break;
    }
    case "individuals": {
      await addGuardiansOf(audience.studentIds ?? []);
      break;
    }
  }
  return targets;
}

export async function publishNotice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);

  const title = f.str("title");
  const body = f.str("body");
  if (!title || !body) return { error: "Title and body are required." };

  const audience: IAudience = {
    kind: (f.str("audienceKind") as IAudience["kind"]) || "all_parents",
    klass: f.opt("klass"),
    section: f.opt("section"),
    studentIds: f.all("studentId"),
  };
  const channels = f.all("channel").length ? (f.all("channel") as ("portal" | "sms")[]) : ["portal" as const];
  const scheduled = f.date("scheduledFor");
  const asDraft = f.str("mode") === "draft";

  const notice = await Notice.create({
    title,
    body,
    imageUrl: f.opt("imageUrl"),
    attachmentUrl: f.opt("attachmentUrl"),
    audience,
    channels,
    status: asDraft ? "draft" : scheduled && scheduled > new Date() ? "scheduled" : "published",
    scheduledFor: scheduled,
    publishedAt: asDraft || (scheduled && scheduled > new Date()) ? undefined : new Date(),
    createdBy: user!.id,
  });

  if (notice.status !== "published") {
    revalidate("/admin/notices");
    return { ok: true, message: asDraft ? "Saved as draft." : "Scheduled." };
  }

  const targets = await resolveRecipients(audience);
  const seen = new Set<string>();
  const recips = [];
  const smsMsgs: { to: string; text: string }[] = [];
  for (const t of targets) {
    const key = t.userId ?? t.guardianId ?? t.phone ?? Math.random().toString();
    if (seen.has(key)) continue;
    seen.add(key);
    recips.push({ notice: notice._id, user: t.userId, guardian: t.guardianId, student: t.studentId });
    if (channels.includes("sms") && t.phone) {
      const smsBody = `${env.school.code}: ${title}. ${body.slice(0, 240)}`;
      smsMsgs.push({ to: t.phone, text: smsBody });
    }
  }
  await NoticeRecipient.insertMany(recips);

  let smsSent = 0;
  if (smsMsgs.length) {
    const res = await sendBulkSms(smsMsgs, "notice");
    smsSent = res.sent;
  }

  // in-app notifications
  await Notification.insertMany(
    recips.filter((r) => r.user).map((r) => ({ user: r.user, title: `Notice: ${title}`, href: "/parent/notices", icon: "bell" })),
  );

  await Notice.updateOne(
    { _id: notice._id },
    { recipientCount: recips.length, smsSent, smsDelivered: smsSent, smsFailed: smsMsgs.length - smsSent },
  );

  await recordAudit({ actor: user, action: "notice.publish", entity: "Notice", entityId: String(notice._id), after: { title, recipients: recips.length, smsSent } });
  revalidate("/admin/notices", "/parent/notices", "/teacher/notices");
  return { ok: true, message: `Published to ${recips.length} recipients${smsSent ? `, ${smsSent} SMS sent` : ""}.` };
}

export async function saveNoticeTemplate(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  await Notice.create({
    title: f.str("title"),
    body: f.str("body"),
    audience: { kind: "all_parents" },
    channels: ["portal", "sms"],
    status: "draft",
  });
  revalidate("/admin/notices/templates", "/admin/notices");
  return { ok: true, message: "Template saved as a draft you can reuse." };
}
