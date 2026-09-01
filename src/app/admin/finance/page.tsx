import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { financeOverview } from "@/lib/admin";
import { feeCollectionTrend } from "@/lib/queries";
import { BarChart } from "@/components/charts/BarChart";
import { taka } from "@/lib/utils";

export const metadata: Metadata = { title: "Finance" };

export default async function AdminFinancePage() {
  await requireRole("admin");
  const [overview, trend] = await Promise.all([financeOverview(), feeCollectionTrend(6)]);

  return (
    <div>
      <PageHeader
        title="Finance Overview"
        subtitle="High-level fee position. Day-to-day collection is in the Accounts portal."
        actions={<Link href="/accounts/fees" className="text-[13px] text-accent-700 hover:underline">Accounts portal →</Link>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={taka(overview.totalBilled)} label="Total billed (year)" />
        <StatTile value={taka(overview.totalCollected)} label="Collected" tone="ok" />
        <StatTile
          value={overview.totalBilled ? `${Math.round((overview.totalCollected / overview.totalBilled) * 100)}%` : "—"}
          label="Collection rate"
        />
        <StatTile value={taka(overview.totalDue)} label="Overdue" tone={overview.totalDue > 0 ? "warn" : "ok"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Collection rate — 6 months" className="lg:col-span-2">
          <BarChart data={trend.map((t, i) => ({ label: t.label, value: t.pct, highlight: i === trend.length - 1 }))} suffix="%" />
        </Panel>
        <Panel title="Actions">
          <div className="flex flex-col gap-2">
            <Link href="/admin/finance/structure" className="rounded border border-line px-3 py-2 text-[13px] hover:bg-panel">Fee structure & plans</Link>
            <Link href="/accounts/fees/invoices" className="rounded border border-line px-3 py-2 text-[13px] hover:bg-panel">Generate invoices</Link>
            <Link href="/accounts/fees/reminders" className="rounded border border-line px-3 py-2 text-[13px] hover:bg-panel">Send fee reminders</Link>
          </div>
        </Panel>
      </div>

      <Panel title="By class" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Class</TH>
            <TH align="right">Billed</TH>
            <TH align="right">Collected</TH>
            <TH align="right">Overdue</TH>
            <TH align="right">Rate</TH>
          </TableHeadRow>
          <tbody>
            {overview.byClass.map((c) => (
              <TR key={c.name}>
                <TD className="font-medium">{c.name}</TD>
                <TD align="right" className="tabular-nums">{taka(c.billed)}</TD>
                <TD align="right" className="tabular-nums">{taka(c.collected)}</TD>
                <TD align="right" className={`tabular-nums ${c.due > 0 ? "text-danger" : ""}`}>{taka(c.due)}</TD>
                <TD align="right" className="tabular-nums">{c.billed ? Math.round((c.collected / c.billed) * 100) : 0}%</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
