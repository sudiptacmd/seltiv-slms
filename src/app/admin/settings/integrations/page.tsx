import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { Settings, SmsMessage } from "@/models";
import { storageStatus } from "@/lib/adapters/storage";
import { emailStatus } from "@/lib/adapters/email";
import { paymentStatus } from "@/lib/adapters/payment";
import { env } from "@/lib/env";
import { TemplatesForm } from "./TemplatesForm";

export const metadata: Metadata = { title: "Integrations" };

export default async function IntegrationsPage() {
  await requireRole("admin");
  await connectDb();
  const [settings, smsCount] = await Promise.all([Settings.findOne().lean(), SmsMessage.countDocuments()]);
  const st = storageStatus();

  const rows = [
    { name: "Images (student & staff photos)", provider: st.images, live: st.images === "cloudinary", note: "Cloudinary in production; local disk otherwise." },
    { name: "PDF storage (report cards, receipts, payslips)", provider: st.pdfs, live: st.pdfs === "supabase", note: "Supabase Storage in production; local disk otherwise." },
    { name: "Email", provider: emailStatus(), live: emailStatus() === "smtp", note: "nodemailer — SMTP in production; dev writes .eml files." },
    { name: "SMS", provider: env.sms.provider, live: false, note: `Placeholder — ${smsCount} messages recorded so far. No real gateway yet.` },
    { name: "Payment", provider: paymentStatus(), live: false, note: "Mock bKash checkout. Swap for the real tokenised integration later." },
  ];

  return (
    <div className="max-w-2xl">
      <PageHeader title="Integrations" subtitle="Which adapter each external service is using. Configure with environment variables." />
      <Panel bodyClassName="p-0" className="mb-4">
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.name} className="flex items-start justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-[13px] font-medium">{r.name}</div>
                <div className="text-[12px] text-muted">{r.note}</div>
              </div>
              <Tag tone={r.live ? "ok" : "warn"}>{r.provider}</Tag>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="SMS templates">
        <p className="mb-3 text-[12px] text-muted">
          Placeholders: <code className="rounded bg-panel px-1">{"{student}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{class}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{status}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{date}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{amount}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{period}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{due}"}</code>{" "}
          <code className="rounded bg-panel px-1">{"{link}"}</code>
        </p>
        <TemplatesForm
          absence={settings?.absenceSmsTemplate ?? ""}
          reminder={settings?.feeReminderSmsTemplate ?? ""}
        />
      </Panel>
    </div>
  );
}
