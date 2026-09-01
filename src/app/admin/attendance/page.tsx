import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { attendanceMonitor, repeatAbsentees } from "@/lib/admin";
import { todayStr } from "@/lib/queries";

export const metadata: Metadata = { title: "Attendance Monitor" };

export default async function AttendanceMonitorPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireRole("admin");
  const sp = await searchParams;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayStr();
  const [{ rows }, absentees] = await Promise.all([attendanceMonitor(date), repeatAbsentees()]);

  const taken = rows.filter((r) => r.taken);
  const overall = taken.reduce((s, r) => s + r.present, 0);
  const overallTotal = taken.reduce((s, r) => s + r.total, 0);
  const drifting = taken.filter((r) => r.pct != null && r.pct < 90);

  return (
    <div>
      <PageHeader
        title="Attendance Monitor"
        subtitle="Live roll-call status across every section."
        actions={
          <form>
            <input type="date" name="date" defaultValue={date} max={todayStr()} className="h-9 rounded border border-line-strong px-2 text-[13px]" />
          </form>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={`${taken.length}/${rows.length}`} label="Sections marked" tone={taken.length < rows.length ? "warn" : "ok"} />
        <StatTile value={overallTotal ? `${Math.round((overall / overallTotal) * 100)}%` : "—"} label="Overall present" />
        <StatTile value={drifting.length} label="Sections below 90%" tone={drifting.length ? "warn" : "ok"} />
        <StatTile value={absentees.length} label="Repeat absentees" tone={absentees.length ? "danger" : "ok"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="By section" className="lg:col-span-2" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Section</TH>
              <TH>Class teacher</TH>
              <TH align="center">Present</TH>
              <TH align="center">Absent</TH>
              <TH align="center">%</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {rows.map((r) => (
                <TR key={r.sectionId}>
                  <TD className="font-medium">{r.name}</TD>
                  <TD className="text-muted">{r.teacher}</TD>
                  <TD align="center" className="tabular-nums">{r.taken ? r.present : "—"}</TD>
                  <TD align="center" className="tabular-nums">{r.taken ? r.absent : "—"}</TD>
                  <TD align="center" className={`tabular-nums ${r.pct != null && r.pct < 90 ? "font-medium text-warn" : ""}`}>
                    {r.pct == null ? <Tag tone="neutral">not taken</Tag> : `${r.pct}%`}
                  </TD>
                  <TD></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Panel>

        <Panel title="Repeat absentees — last 20 days" bodyClassName="p-0">
          <ul className="divide-y divide-line text-[13px]">
            {absentees.map((a) => (
              <li key={a.studentId} className="flex items-center justify-between px-4 py-2">
                <Link href={`/admin/attendance/students/${a.studentId}`} className="hover:text-accent-700">
                  {a.name} <span className="text-muted">· {a.klass}</span>
                </Link>
                <span className="font-medium text-danger">{a.absences}</span>
              </li>
            ))}
            {absentees.length === 0 && <li className="px-4 py-3 text-muted">No student has 3+ absences in the window.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
