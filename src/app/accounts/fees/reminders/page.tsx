import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { defaultersList } from "@/lib/accounts";
import { RemindersForm } from "./RemindersForm";

export const metadata: Metadata = { title: "Dues & Reminders" };

export default async function RemindersPage() {
  await requireRole("accountant");
  const rows = await defaultersList();
  return (
    <div>
      <PageHeader title="Dues & Reminders" subtitle="Select overdue invoices and send guardians an SMS with a pay-by-link." />
      <RemindersForm
        rows={rows.map((r) => ({
          invoiceId: r.invoiceId,
          invoiceNo: r.invoiceNo,
          student: r.student,
          period: r.period,
          due: r.due,
          dueDate: r.dueDate.toISOString(),
          reminded: r.reminded,
        }))}
      />
    </div>
  );
}
