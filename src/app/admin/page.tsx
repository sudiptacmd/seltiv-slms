import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader, Panel, StatTile, LinkButton, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { BarChart } from "@/components/charts/BarChart";
import { dashboardStats, feeCollectionTrend, attendanceDriftByClass, recentPayments } from "@/lib/queries";
import { connectDb } from "@/lib/db";
import { AuditLog, AdmissionApplication } from "@/models";
import { taka, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  await connectDb();
  const [stats, trend, drift, payments, audits, pendingApps] = await Promise.all([
    dashboardStats(),
    feeCollectionTrend(6),
    attendanceDriftByClass(),
    recentPayments(6),
    AuditLog.find().sort({ createdAt: -1 }).limit(6).lean(),
    AdmissionApplication.countDocuments({ stage: { $in: ["submitted", "test_scheduled", "verified"] } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Trust Overview"
        subtitle={`Academic year ${stats.year.name} · all figures for this branch`}
        actions={
          <>
            <LinkButton href="/admin/notices/new" variant="secondary" size="sm">New notice</LinkButton>
            <LinkButton href="/admin/finance/invoices" variant="primary" size="sm">Fee run</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={stats.enrolled.toLocaleString()} label="Students enrolled" />
        <StatTile
          value={stats.attendancePct == null ? "—" : `${stats.attendancePct.toFixed(1)}%`}
          label="Attendance today"
          hint={stats.attendanceTaken ? undefined : "roll call not taken yet"}
          tone={stats.attendancePct != null && stats.attendancePct < 90 ? "warn" : "ink"}
        />
        <StatTile
          value={stats.feePct == null ? "—" : `${stats.feePct.toFixed(0)}%`}
          label="Fees collected, year to date"
          hint={`${taka(stats.collected)} of ${taka(stats.billed)}`}
        />
        <StatTile
          value={stats.passRate == null ? "—" : `${stats.passRate.toFixed(0)}%`}
          label="Pass rate, last exam"
          hint={stats.latestExamName ?? undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Fee collection rate — last six months" className="lg:col-span-2">
          <BarChart
            data={trend.map((t, i) => ({ label: t.label, value: t.pct, highlight: i === trend.length - 1 }))}
            suffix="%"
          />
        </Panel>

        <Panel title="Attendance by section, today">
          {drift.length === 0 ? (
            <p className="text-[13px] text-muted">No roll call recorded today.</p>
          ) : (
            <ul className="space-y-1.5">
              {drift.slice(0, 8).map((d) => (
                <li key={d.section} className="flex items-center justify-between text-[13px]">
                  <span>{d.section}</span>
                  <span className={d.pct < 90 ? "font-medium text-warn" : "text-muted"}>
                    {d.pct}% <span className="text-muted">({d.present}/{d.total})</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Recent fee payments"
          action={<Link href="/accounts/fees" className="text-[12px] text-accent-700 hover:underline">Fee collection →</Link>}
          bodyClassName="p-0"
        >
          <Table>
            <TableHeadRow>
              <TH>Student</TH>
              <TH>Method</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Date</TH>
            </TableHeadRow>
            <tbody>
              {payments.map((p) => {
                const s = p.student as unknown as { name: string; studentCode: string } | null;
                return (
                  <TR key={String(p._id)}>
                    <TD>{s?.name ?? "—"}</TD>
                    <TD><Tag tone={p.method === "bkash" ? "accent2" : "neutral"}>{p.method}</Tag></TD>
                    <TD align="right" className="tabular-nums">{taka(p.amount)}</TD>
                    <TD align="right" className="text-muted">{formatDate(p.paidAt, "short")}</TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </Panel>

        <div className="space-y-4">
          <Panel title="Needs attention">
            <ul className="space-y-2 text-[13px]">
              <li className="flex items-center justify-between">
                <span>Admission applications in pipeline</span>
                <Link href="/admin/admissions" className="font-medium text-accent-700">{pendingApps}</Link>
              </li>
              <li className="flex items-center justify-between">
                <span>This month&apos;s fee run</span>
                <Link href="/admin/finance/invoices" className="font-medium text-accent-700">Review</Link>
              </li>
            </ul>
          </Panel>
          <Panel title="Recent activity" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {audits.length === 0 && <li className="px-4 py-3 text-[13px] text-muted">No activity yet.</li>}
              {audits.map((a) => (
                <li key={String(a._id)} className="px-4 py-2 text-[12px]">
                  <span className="font-medium">{a.actorName}</span>{" "}
                  <span className="text-muted">{a.action.replace(/\./g, " ")} · {a.entity}</span>
                  <span className="float-right text-muted">{formatDate(a.createdAt, "short")}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
