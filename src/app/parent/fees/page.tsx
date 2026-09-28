import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, EmptyState, DataRow } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { resolveChild } from "@/lib/parent";
import { studentFeeLedger } from "@/lib/fees-view";
import { taka, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Fees & Payment" };

export default async function ParentFeesPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requireRole("parent");
  const { child, children } = await resolveChild(user, (await searchParams).child);
  if (!child) return <EmptyState title="No child linked" />;

  const ledger = await studentFeeLedger(child.id);
  const nextDue = ledger.dueInvoices.sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))[0];

  return (
    <div>
      <PageHeader title="Fees & Payment" />
      <ChildSwitcher children={children} activeId={child.id} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile value={taka(ledger.outstanding)} label="Past due" tone={ledger.outstanding > 0 ? "danger" : "ok"} />
        <StatTile value={taka(Math.max(0, ledger.balance))} label="Total balance" />
        <StatTile value={taka(ledger.totalPaid)} label="Paid this year" tone="ok" />
      </div>

      {nextDue && (
        <Panel title="Current invoice" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-serif text-[16px] font-semibold">{nextDue.title}</p>
              <p className="mb-3 text-[12px] text-muted">
                {nextDue.invoiceNo} · due {formatDate(nextDue.dueDate)}
              </p>
              {nextDue.lines.map((l, i) => (
                <DataRow key={i} k={l.label}>{taka(l.amount)}</DataRow>
              ))}
              {nextDue.lateFee > 0 && <DataRow k="Late fee">{taka(nextDue.lateFee)}</DataRow>}
              <DataRow k="Total payable">{taka(nextDue.netPayable - nextDue.paidAmount)}</DataRow>
            </div>
            <div className="flex flex-col items-start justify-center gap-2">
              <Link
                href={`/parent/fees/pay/${nextDue._id}`}
                className="rounded bg-accent2 px-4 py-2.5 text-[14px] font-medium text-white hover:opacity-90"
              >
                Pay with bKash
              </Link>
              {nextDue.instalmentPlan && nextDue.instalmentPlan.length > 1 && (
                <p className="text-[12px] text-muted">
                  Or pay in {nextDue.instalmentPlan.length} instalments — {taka(nextDue.instalmentPlan[0].amount)} now.
                </p>
              )}
              <a href={`/print/invoice/${nextDue._id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">
                Download invoice
              </a>
              <Link href={`/invoice/${nextDue._id}`} className="text-[12px] text-accent-700 hover:underline">View & print invoice</Link>
            </div>
          </div>
        </Panel>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="All invoices" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Period</TH>
              <TH align="right">Payable</TH>
              <TH align="right">Paid</TH>
              <TH>Status</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {ledger.invoices.map((inv) => {
                const bal = inv.netPayable - inv.paidAmount;
                return (
                  <TR key={String(inv._id)}>
                    <TD>{inv.title}</TD>
                    <TD align="right" className="tabular-nums">{taka(inv.netPayable)}</TD>
                    <TD align="right" className="tabular-nums">{taka(inv.paidAmount)}</TD>
                    <TD><StatusBadge status={inv.status} /></TD>
                    <TD>
                      {bal > 0.5 ? (
                        <Link href={`/parent/fees/pay/${inv._id}`} className="text-[12px] font-medium text-accent-700 hover:underline">Pay</Link>
                      ) : (
                        <Link href={`/invoice/${inv._id}`} className="text-[12px] text-muted hover:underline">View / Print</Link>
                      )}
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Payment history" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Receipt</TH>
              <TH>Method</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Date</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {ledger.payments.map((p) => (
                <TR key={String(p._id)}>
                  <TD className="tabular-nums">{p.receiptNo ?? "—"}</TD>
                  <TD className="capitalize">{p.method}</TD>
                  <TD align="right" className="tabular-nums">{taka(p.amount)}</TD>
                  <TD align="right" className="text-muted">{formatDate(p.paidAt, "short")}</TD>
                  <TD>
                    <a href={`/print/receipt/${p._id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">Receipt</a>
                  </TD>
                </TR>
              ))}
              {ledger.payments.length === 0 && (
                <TR><TD colSpan={5} className="text-muted">No payments yet.</TD></TR>
              )}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
