import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { teacherSections } from "@/lib/teacher";
import { connectDb } from "@/lib/db";
import { AttendanceSession, Section } from "@/models";
import { formatDate, pct } from "@/lib/utils";

export const metadata: Metadata = { title: "Attendance history" };

export default async function AttendanceHistoryPage() {
  const user = await requireRole("teacher");
  const sections = await teacherSections(user.staffId!);
  await connectDb();
  const sessions = await AttendanceSession.find({ section: { $in: sections.map((s) => s.id) } })
    .sort({ date: -1 })
    .limit(60)
    .lean();
  const secs = await Section.find({ _id: { $in: sessions.map((s) => s.section) } }).populate("klass", "name").lean();
  const secMap = new Map(secs.map((s) => [String(s._id), s]));

  return (
    <div>
      <PageHeader
        title="Attendance history"
        subtitle="Roll calls recorded for your sections."
        actions={<Link href="/teacher/attendance" className="rounded bg-accent px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-600">Take roll call</Link>}
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Date</TH>
            <TH>Section</TH>
            <TH>Period</TH>
            <TH align="center">Present</TH>
            <TH align="center">Absent</TH>
            <TH align="center">Late</TH>
            <TH align="center">%</TH>
            <TH></TH>
          </TableHeadRow>
          <tbody>
            {sessions.map((s) => {
              const sec = secMap.get(String(s.section));
              const k = sec?.klass as unknown as { name: string } | undefined;
              const total = s.presentCount + s.absentCount + s.lateCount + s.leaveCount;
              return (
                <TR key={String(s._id)}>
                  <TD>{formatDate(s.date, "short")}</TD>
                  <TD>{k?.name} {sec?.name}</TD>
                  <TD className="text-muted">{s.period ?? "—"}</TD>
                  <TD align="center" className="tabular-nums">{s.presentCount}</TD>
                  <TD align="center" className="tabular-nums">{s.absentCount}</TD>
                  <TD align="center" className="tabular-nums">{s.lateCount}</TD>
                  <TD align="center" className="tabular-nums">{pct(s.presentCount + s.lateCount, total)}</TD>
                  <TD>
                    {s.locked ? (
                      <Tag tone="neutral">Locked</Tag>
                    ) : (
                      <Link
                        href={`/teacher/attendance?sectionId=${s.section}&date=${s.date}${s.period ? `&period=${encodeURIComponent(s.period)}` : ""}`}
                        className="text-[12px] text-accent-700 hover:underline"
                      >
                        Edit
                      </Link>
                    )}
                  </TD>
                </TR>
              );
            })}
            {sessions.length === 0 && (
              <TR><TD colSpan={8} className="text-muted">No roll calls recorded yet.</TD></TR>
            )}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
