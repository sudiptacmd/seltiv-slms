"use server";

import { connectDb } from "@/lib/db";
import { Invoice, Student, Guardian, ReminderLog, Settings } from "@/models";
import { sendSms, renderTemplate } from "@/lib/adapters/sms";
import { recordAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { taka, formatDate } from "@/lib/utils";
import { guard, revalidate, type ActionState } from "./_common";

export async function sendFeeReminders(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("accountant");
  if (deny) return deny;
  await connectDb();

  const invoiceIds = form.getAll("invoiceId").map(String);
  if (invoiceIds.length === 0) return { error: "Select at least one invoice." };

  const settings = await Settings.findOne().lean();
  const tpl = settings?.feeReminderSmsTemplate ?? "Dear Guardian, {student}'s fee of {amount} for {period} is due on {due}. Pay: {link}";

  let sent = 0;
  for (const invId of invoiceIds) {
    const inv = await Invoice.findById(invId).lean();
    if (!inv) continue;
    const student = await Student.findById(inv.student).lean();
    if (!student) continue;
    const primary = student.guardians.find((g) => g.isPrimary) ?? student.guardians[0];
    if (!primary) continue;
    const guardian = await Guardian.findById(primary.guardian).lean();
    if (!guardian?.phone) continue;

    const link = `${env.appUrl}/pay/${inv.payToken}`;
    const text = renderTemplate(tpl, {
      student: student.name,
      amount: taka(inv.netPayable - inv.paidAmount),
      period: inv.title,
      due: formatDate(inv.dueDate, "short"),
      link,
      school: env.school.code,
    });
    await sendSms(guardian.phone, text, { purpose: "fee_reminder", relatedId: invId });
    await ReminderLog.create({ invoice: inv._id, student: student._id, channel: "sms", sentBy: user!.staffId });
    sent++;
  }

  await recordAudit({ actor: user, action: "fee.reminders", entity: "ReminderLog", after: { sent } });
  revalidate("/accounts/fees/reminders");
  return { ok: true, message: `${sent} reminder SMS sent.` };
}
