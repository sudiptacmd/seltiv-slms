import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, LinkButton } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { accountsDashboard } from "@/lib/accounts";
import { recentPayments } from "@/lib/queries";
import { latestPayrollRun, payrollRunDetail } from "@/lib/payroll";
import { taka, formatDate, monthLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AccountsDashboard() {
  await requireRole("accountant");
  const [stats, payments, run] = await Promise.all([accountsDashboard(), recentPayments(8), latestPayrollRun()]);
  const runDetail = run ? await payrollRunDetail(run.month, run.year) : null;
  const paidSlips = runDetail?.payslips.filter((p) => p.status === "paid").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Accounts Overview"
        actions={
          <>
            <LinkButton href="/accounts/fees/reminders" variant="secondary" size="sm">Send reminders</LinkButton>
            <LinkButton href="/accounts/fees/invoices" variant="primary" size="sm">Generate invoices</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={taka(stats.todayCollected)} label="Collected today" tone="ok" />
        <StatTile value={taka(stats.monthCollected)} label="Collected this month" hint={`Cash ${taka(stats.monthByMethod.cash)} · bKash ${taka(stats.monthByMethod.bkash)}`} />
        <StatTile value={taka(stats.outstanding)} label="Outstanding" hint={`${stats.defaulters} students`} tone={stats.outstanding > 0 ? "warn" : "ok"} />
        <StatTile value={stats.unmatchedBkash} label="bKash to reconcile" tone={stats.unmatchedBkash ? "warn" : "ok"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent payments"
          bodyClassName="p-0"
          action={<Link href="/accounts/fees" className="text-[12px] text-accent-700 hover:underline">Fee collection →</Link>}
        >
          <Table>
            <TableHeadRow>
              <TH>Receipt</TH>
              <TH>Student</TH>
              <TH>Method</TH>
              <TH align="right">Amount</TH>
            </TableHeadRow>
            <tbody>
              {payments.map((p) => (
                <TR key={String(p._id)}>
                  <TD className="tabular-nums text-muted">{p.receiptNo ?? "—"}</TD>
                  <TD>{(p.student as unknown as { name: string })?.name ?? "—"}</TD>
                  <TD className="capitalize">{p.method}</TD>
                  <TD align="right" className="tabular-nums">{taka(p.amount)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>

        <Panel
          title={run ? `Payroll — ${monthLabel(run.month, run.year)}` : "Payroll"}
          action={<Link href="/accounts/payroll" className="text-[12px] text-accent-700 hover:underline">Open →</Link>}
        >
          {runDetail ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatTile value={runDetail.payslips.length} label="Staff" />
                <StatTile value={paidSlips} label="Paid" tone="ok" />
                <StatTile value={runDetail.payslips.length - paidSlips} label="Pending" tone="warn" />
              </div>
              <p className="mt-3 text-[12px] text-muted">
                Run status: <span className="capitalize">{run.status}</span> · created {formatDate(run.createdAt, "short")}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-muted">No payroll run yet this month.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
