import Link from "next/link";
import { Panel, StatTile, Avatar, Tag, DataRow } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { taka, formatDate } from "@/lib/utils";
import type { StudentProfile } from "@/lib/students";

export function StudentProfileView({
  profile,
  variant = "admin",
}: {
  profile: NonNullable<StudentProfile>;
  variant?: "admin" | "parent";
}) {
  const { student, enrollment, guardians, guardianLinks, termGpas, attendance, invoices, outstanding, upcoming, nextDue, discounts } = profile;
  const k = enrollment?.klass as unknown as { name: string } | undefined;
  const sec = enrollment?.section as unknown as { name: string } | undefined;
  const latest = termGpas[termGpas.length - 1];
  const gradesheetHref = variant === "parent" ? "/parent/child/gradesheet" : `/admin/students/${student._id}`;

  return (
    <div className="space-y-4">
      {/* identity */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar name={student.name} src={student.photoUrl} size={52} />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-[22px] font-semibold tracking-tight">{student.name}</h1>
              <StatusBadge status={student.status} />
            </div>
            <p className="text-[13px] text-muted">
              {k ? `${k.name} ${sec?.name}` : "Not enrolled"}
              {enrollment ? ` · Roll ${enrollment.rollNumber}` : ""} · {student.studentCode}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          value={latest ? latest.gpa.toFixed(2) : "—"}
          label={latest ? `GPA · ${latest.term}` : "No published result"}
          tone={latest?.failed ? "danger" : "ink"}
        />
        <StatTile
          value={latest ? `${latest.sectionRank || "—"}` : "—"}
          label="Section rank"
          hint={latest ? `Class rank ${latest.classRank || "—"}` : undefined}
        />
        <StatTile
          value={attendance.pct == null ? "—" : `${attendance.pct}%`}
          label="Attendance"
          hint={`${attendance.attended}/${attendance.total} days`}
          tone={attendance.pct != null && attendance.pct < 85 ? "warn" : "ink"}
        />
        <StatTile
          value={outstanding > 0 ? taka(outstanding) : "৳0"}
          label="Outstanding fees"
          hint={
            outstanding > 0
              ? "past due"
              : nextDue
                ? `${taka(upcoming)} due ${formatDate(nextDue.dueDate, "short")}`
                : "All clear"
          }
          tone={outstanding > 0 ? "danger" : upcoming > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Academic progress" bodyClassName="p-0">
          {termGpas.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">No results have been published yet.</p>
          ) : (
            <Table>
              <TableHeadRow>
                <TH>Exam</TH>
                <TH align="center">GPA</TH>
                <TH align="center">Grade</TH>
                <TH align="center">Section</TH>
                <TH align="center">Class</TH>
              </TableHeadRow>
              <tbody>
                {termGpas.map((t) => (
                  <TR key={t.exam}>
                    <TD>
                      <Link href={`${gradesheetHref}${variant === "admin" ? `?exam=${t.examId}` : `?exam=${t.examId}`}`} className="hover:text-accent-700">
                        {t.exam}
                      </Link>
                    </TD>
                    <TD align="center" className="font-medium tabular-nums">{t.gpa.toFixed(2)}</TD>
                    <TD align="center">{t.grade}</TD>
                    <TD align="center" className="tabular-nums">{t.sectionRank || "—"}</TD>
                    <TD align="center" className="tabular-nums">{t.classRank || "—"}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Panel>

        <Panel title="Attendance & fees">
          <DataRow k="Present">{attendance.present} of {attendance.total} days</DataRow>
          <DataRow k="Absent · Late">{attendance.absent} · {attendance.late}</DataRow>
          <DataRow k="Fees">
            {outstanding > 0 ? (
              <Tag tone="danger">{taka(outstanding)} past due</Tag>
            ) : upcoming > 0 ? (
              <Tag tone="warn">{taka(upcoming)} due soon</Tag>
            ) : (
              <Tag tone="ok">Paid up to date</Tag>
            )}
          </DataRow>
          <DataRow k="Next fee due">{nextDue ? `${nextDue.title} · ${formatDate(nextDue.dueDate, "short")}` : "—"}</DataRow>
          {discounts.length > 0 && (
            <DataRow k="Discounts">
              {discounts.map((d) => (
                <Tag key={String(d._id)} tone="accent" className="ml-1">
                  {d.label}
                </Tag>
              ))}
            </DataRow>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Guardians">
          <ul className="space-y-3">
            {guardians.map((g) => {
              const link = guardianLinks.find((l) => String(l.guardian) === String(g._id));
              return (
                <li key={String(g._id)} className="flex items-start justify-between gap-3 text-[13px]">
                  <div>
                    <div className="font-medium">
                      {g.name} {link?.isPrimary && <Tag tone="accent" className="ml-1">Primary</Tag>}
                    </div>
                    <div className="text-muted capitalize">{g.relation} · {g.phone}</div>
                    {g.occupation && <div className="text-muted">{g.occupation}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Recent fee invoices" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Period</TH>
              <TH align="right">Payable</TH>
              <TH align="right">Paid</TH>
              <TH>Status</TH>
            </TableHeadRow>
            <tbody>
              {invoices.slice(-5).reverse().map((inv) => (
                <TR key={String(inv._id)}>
                  <TD>{inv.title}</TD>
                  <TD align="right" className="tabular-nums">{taka(inv.netPayable)}</TD>
                  <TD align="right" className="tabular-nums">{taka(inv.paidAmount)}</TD>
                  <TD><StatusBadge status={inv.status} /></TD>
                </TR>
              ))}
              {invoices.length === 0 && (
                <TR><TD colSpan={4} className="text-muted">No invoices.</TD></TR>
              )}
            </tbody>
          </Table>
        </Panel>
      </div>

      {student.documents && student.documents.length > 0 && (
        <Panel title="Documents">
          <ul className="flex flex-wrap gap-2">
            {student.documents.map((d, i) => (
              <li key={i}>
                <a href={d.url} target="_blank" className="rounded border border-line px-2.5 py-1 text-[12px] text-accent-700 hover:bg-panel">
                  {d.label}
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
