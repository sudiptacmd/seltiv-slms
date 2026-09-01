import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Invoice, Guardian } from "@/models";
import { assertChildOfParent } from "@/lib/parent";
import { startBkashPayment } from "@/lib/actions/payments";
import { taka, formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Pay fees" };

export default async function PayInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const user = await requireRole("parent");
  const { invoiceId } = await params;
  await connectDb();
  const invoice = await Invoice.findById(invoiceId).lean();
  if (!invoice) notFound();
  if (!(await assertChildOfParent(user, String(invoice.student)))) notFound();

  const remaining = invoice.netPayable - invoice.paidAmount;
  const guardian = user.guardianId ? await Guardian.findById(user.guardianId).lean() : null;

  async function pay() {
    "use server";
    const url = await startBkashPayment(
      invoiceId,
      guardian?.phone ?? user.id,
      `/parent/fees/pay/${invoiceId}/done`,
    );
    redirect(url);
  }

  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumbs items={[{ label: "Fees", href: "/parent/fees" }, { label: "Pay" }]} />
      <PageHeader title="Pay fees" />
      <Panel>
        <p className="font-serif text-[16px] font-semibold">{invoice.title}</p>
        <p className="mb-3 text-[12px] text-muted">{invoice.invoiceNo} · due {formatDate(invoice.dueDate)}</p>
        {invoice.lines.map((l, i) => (
          <DataRow key={i} k={l.label}>{taka(l.amount)}</DataRow>
        ))}
        {invoice.lateFee > 0 && <DataRow k="Late fee">{taka(invoice.lateFee)}</DataRow>}
        {invoice.paidAmount > 0 && <DataRow k="Already paid">− {taka(invoice.paidAmount)}</DataRow>}
        <DataRow k="Amount to pay">{taka(remaining)}</DataRow>

        {remaining <= 0 ? (
          <p className="mt-4 rounded bg-ok-bg px-3 py-2 text-[13px] text-ok">This invoice is fully paid.</p>
        ) : (
          <form action={pay} className="mt-5">
            <button className="w-full rounded bg-accent2 px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90">
              Continue to bKash — {taka(remaining)}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              You&apos;ll be taken to a bKash checkout. This is a sandbox — no real money moves.
            </p>
          </form>
        )}
      </Panel>
    </div>
  );
}
