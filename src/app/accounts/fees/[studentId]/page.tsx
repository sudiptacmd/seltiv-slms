import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { RecordPaymentButton } from "@/components/RecordPaymentDialog";
import { connectDb } from "@/lib/db";
import { Student, Enrollment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { studentFeeLedger } from "@/lib/fees-view";
import { taka, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Fee ledger" };

export default async function StudentFeeLedgerPage({ params }: { params: Promise<{ studentId: string }> }) {
  await requireRole("accountant");
  const { studentId } = await params;
  await connectDb();
  const year = await getCurrentYear();
  const student = await Student.findById(studentId).lean();
  if (!student) notFound();
  const enr = await Enrollment.findOne({ student: studentId, year: year._id }).populate("klass", "name").populate("section", "name").lean();
  const k = enr?.klass as unknown as { name: string } | undefined;
  const sec = enr?.section as unknown as { name: string } | undefined;
  const ledger = await studentFeeLedger(studentId);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Fee Collection", href: "/accounts/fees" }, { label: student.name }]} />
      <PageHeader title={student.name} subtitle={`${student.studentCode}${k ? ` · ${k.name} ${sec?.name}` : ""}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={taka(ledger.totalBilled)} label="Billed this year" />
        <StatTile value={taka(ledger.totalPaid)} label="Paid" tone="ok" />
        <StatTile value={taka(ledger.outstanding)} label="Past due" tone={ledger.outstanding > 0 ? "danger" : "ok"} />
        <StatTile value={taka(Math.max(0, ledger.balance))} label="Balance" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Invoices" className="lg:col-span-2" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Invoice</TH>
              <TH align="right">Payable</TH>
              <TH align="right">Paid</TH>
              <TH>Due</TH>
              <TH>Status</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {ledger.invoices.map((inv) => {
                const bal = inv.netPayable - inv.paidAmount;
                return (
                  <TR key={String(inv._id)}>
                    <TD>
                      <div>{inv.title}</div>
                      <div className="text-[11px] text-muted">{inv.invoiceNo}</div>
                    </TD>
                    <TD align="right" className="tabular-nums">{taka(inv.netPayable)}</TD>
                    <TD align="right" className="tabular-nums">{taka(inv.paidAmount)}</TD>
                    <TD className="text-muted">{formatDate(inv.dueDate, "short")}</TD>
                    <TD><StatusBadge status={inv.status} /></TD>
                    <TD>
                      {bal > 0.5 ? (
                        <RecordPaymentButton invoiceId={String(inv._id)} title={inv.title} remaining={bal} />
                      ) : (
                        <a href={`/print/invoice/${inv._id}`} target="_blank" className="text-[12px] text-muted hover:underline">PDF</a>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Payments" bodyClassName="p-0">
          <ul className="divide-y divide-line text-[13px]">
            {ledger.payments.map((p) => (
              <li key={String(p._id)} className="px-4 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{taka(p.amount)}</span>
                  <a href={`/print/receipt/${p._id}`} target="_blank" className="text-[11px] text-accent-700 hover:underline">Receipt</a>
                </div>
                <div className="text-[11px] text-muted capitalize">{p.method} · {formatDate(p.paidAt, "short")}{p.reference ? ` · ${p.reference}` : ""}</div>
              </li>
            ))}
            {ledger.payments.length === 0 && <li className="px-4 py-3 text-muted">No payments.</li>}
          </ul>
        </Panel>
      </div>

      {ledger.dueInvoices[0]?.instalmentPlan && ledger.dueInvoices[0].instalmentPlan.length > 1 && (
        <Panel title="Instalment plan — current invoice" className="mt-4">
          {ledger.dueInvoices[0].instalmentPlan.map((ins) => (
            <DataRow key={ins.number} k={`Instalment ${ins.number} · ${formatDate(ins.dueDate, "short")}`}>
              {taka(ins.amount)} {ins.paid ? "· paid" : ""}
            </DataRow>
          ))}
        </Panel>
      )}
    </div>
  );
}
