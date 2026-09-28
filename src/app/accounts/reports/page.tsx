import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Invoice, Payment, Payslip, FeeHead } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { taka } from "@/lib/utils";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireRole("accountant");
  if (!user.roles.includes('admin') && user.permissions?.length && !user.permissions.includes('report.view')) redirect('/accounts');
  await connectDb();
  const year = await getCurrentYear();

  const [invoices, payments, payslips, heads] = await Promise.all([
    Invoice.find({ year: year._id, status: { $ne: "void" } }).lean(),
    Payment.find({ status: "success" }).lean(),
    Payslip.find().lean(),
    FeeHead.find().lean(),
  ]);

  const billed = invoices.reduce((s, i) => s + i.netPayable, 0);
  const collected = invoices.reduce((s, i) => s + i.paidAmount, 0);
  const now = new Date();

  // outstanding aging buckets
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const i of invoices) {
    const bal = i.netPayable - i.paidAmount;
    if (bal <= 0.5) continue;
    const days = Math.floor((now.getTime() - new Date(i.dueDate).getTime()) / 86400000);
    if (days <= 0) buckets.current += bal;
    else if (days <= 30) buckets.d30 += bal;
    else if (days <= 60) buckets.d60 += bal;
    else buckets.d90 += bal;
  }

  // income by fee head
  const headTotals = new Map<string, number>();
  for (const inv of invoices) {
    const paidRatio = inv.netPayable ? inv.paidAmount / inv.netPayable : 0;
    for (const l of inv.lines) {
      const name = l.label;
      headTotals.set(name, (headTotals.get(name) ?? 0) + l.amount * paidRatio);
    }
  }

  const payrollTotal = payslips.filter((p) => p.status === "paid").reduce((s, p) => s + p.net, 0);
  void heads;

  return (
    <div>
      <PageHeader title="Financial Reports" subtitle={`Academic year ${year.name}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={taka(billed)} label="Total billed" />
        <StatTile value={taka(collected)} label="Total collected" tone="ok" />
        <StatTile value={taka(billed - collected)} label="Outstanding" tone="warn" />
        <StatTile value={taka(payrollTotal)} label="Salary paid" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Outstanding — aging">
          <Table>
            <TableHeadRow><TH>Bucket</TH><TH align="right">Amount</TH></TableHeadRow>
            <tbody>
              <TR><TD>Not yet due</TD><TD align="right" className="tabular-nums">{taka(buckets.current)}</TD></TR>
              <TR><TD>1–30 days overdue</TD><TD align="right" className="tabular-nums">{taka(buckets.d30)}</TD></TR>
              <TR><TD>31–60 days overdue</TD><TD align="right" className="tabular-nums">{taka(buckets.d60)}</TD></TR>
              <TR><TD>60+ days overdue</TD><TD align="right" className="tabular-nums text-danger">{taka(buckets.d90)}</TD></TR>
            </tbody>
          </Table>
        </Panel>

        <Panel title="Income by fee head (collected)">
          <Table>
            <TableHeadRow><TH>Fee head</TH><TH align="right">Collected</TH></TableHeadRow>
            <tbody>
              {[...headTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                <TR key={name}><TD>{name}</TD><TD align="right" className="tabular-nums">{taka(amt)}</TD></TR>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>

      <Panel title="Collection by method" className="mt-4">
        <div className="grid grid-cols-3 gap-3">
          <StatTile value={taka(payments.filter((p) => p.method === "cash").reduce((s, p) => s + p.amount, 0))} label="Cash" />
          <StatTile value={taka(payments.filter((p) => p.method === "bkash").reduce((s, p) => s + p.amount, 0))} label="bKash" />
          <StatTile value={taka(payments.filter((p) => !["cash", "bkash"].includes(p.method)).reduce((s, p) => s + p.amount, 0))} label="Other" />
        </div>
        <p className="mt-3 text-[12px] text-muted">Export to Excel / PDF — coming with the reporting module.</p>
      </Panel>
    </div>
  );
}
