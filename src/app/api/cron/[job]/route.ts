import { connectDb } from "@/lib/db";
import { AttendanceSession, AttendanceRecord, Student, Guardian, User, Notification, Settings } from "@/models";
import { getCurrentYear, todayStr } from "@/lib/queries";
import { env } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Scheduled jobs. On the VPS these are hit by system cron; on the demo they can
 * be triggered manually or by Netlify Scheduled Functions.
 *   curl -H "Authorization: Bearer $CRON_SECRET" -X POST /api/cron/attendance-lock
 */
export async function POST(req: Request, { params }: { params: Promise<{ job: string }> }) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${env.cronSecret}`) return new Response("Unauthorized", { status: 401 });

  const { job } = await params;
  await connectDb();

  switch (job) {
    case "attendance-lock": {
      const cutoff = new Date();
      const settings = await Settings.findOne().lean();
      cutoff.setHours(cutoff.getHours() - (settings?.attendanceEditWindowHours ?? 24));
      const res = await AttendanceSession.updateMany(
        { locked: false, createdAt: { $lt: cutoff } },
        { locked: true },
      );
      return Response.json({ job, locked: res.modifiedCount });
    }

    case "attendance-digest": {
      const today = todayStr();
      const year = await getCurrentYear();
      const absent = await AttendanceRecord.find({ date: today, status: "absent" }).select("student").lean();
      const admins = await User.find({ roles: "admin" }).select("_id").lean();
      await Notification.insertMany(
        admins.map((a) => ({
          user: a._id,
          title: `${absent.length} students absent today`,
          href: "/admin/attendance",
          icon: "alert",
        })),
      );
      void year;
      return Response.json({ job, absentToday: absent.length, notified: admins.length });
    }

    case "fee-reminders": {
      // Delegate to the accounts action's logic via a light re-implementation:
      const { defaultersList } = await import("@/lib/accounts");
      const { sendSms, renderTemplate } = await import("@/lib/adapters/sms");
      const { taka, formatDate } = await import("@/lib/utils");
      const settings = await Settings.findOne().lean();
      const tpl = settings?.feeReminderSmsTemplate ?? "Fee of {amount} for {period} due {due}. Pay: {link}";
      const list = (await defaultersList()).filter((d) => !d.reminded).slice(0, 200);
      let sent = 0;
      for (const d of list) {
        const student = await Student.findById(d.studentId).lean();
        const primary = student?.guardians.find((g) => g.isPrimary) ?? student?.guardians[0];
        const g = primary ? await Guardian.findById(primary.guardian).lean() : null;
        if (!g?.phone) continue;
        await sendSms(
          g.phone,
          renderTemplate(tpl, {
            student: d.student,
            amount: taka(d.due),
            period: d.period,
            due: formatDate(d.dueDate, "short"),
            link: `${env.appUrl}/pay/${d.payToken}`,
            school: env.school.code,
          }),
          { purpose: "fee_reminder", relatedId: d.invoiceId },
        );
        sent++;
      }
      return Response.json({ job, remindersSent: sent });
    }

    case "invoices": {
      // Placeholder: real monthly generation is triggered from the Accounts UI
      // with an explicit period. A scheduled run would call generateInvoiceRun.
      return Response.json({ job, note: "Trigger invoice runs from /accounts/fees/invoices with a chosen month." });
    }

    default:
      return new Response("Unknown job", { status: 404 });
  }
}
