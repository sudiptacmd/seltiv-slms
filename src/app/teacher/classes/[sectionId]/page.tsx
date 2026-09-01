import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Avatar } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { teacherSections, sectionRoster } from "@/lib/teacher";
import { connectDb } from "@/lib/db";
import { Result, AttendanceRecord } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Class roster" };

export default async function ClassRosterPage({ params }: { params: Promise<{ sectionId: string }> }) {
  const user = await requireRole("teacher");
  const { sectionId } = await params;
  const sections = await teacherSections(user.staffId!);
  const section = sections.find((s) => s.id === sectionId);
  if (!section && !user.roles.includes("admin")) notFound();

  await connectDb();
  const year = await getCurrentYear();
  const roster = await sectionRoster(sectionId);
  const studentIds = roster.map((r) => String(r.student._id));

  const [latestResults, attendance] = await Promise.all([
    Result.find({ student: { $in: studentIds }, year: year._id })
      .populate({ path: "exam", select: "term resultPublished createdAt", populate: { path: "term", select: "order" } })
      .lean(),
    AttendanceRecord.find({ student: { $in: studentIds } }).select("student status").lean(),
  ]);

  const gpaByStudent = new Map<string, { gpa: number; order: number }>();
  for (const r of latestResults) {
    if (!(r.exam as unknown as { resultPublished?: boolean })?.resultPublished) continue;
    const order = (r.exam as unknown as { term?: { order: number } })?.term?.order ?? 0;
    const cur = gpaByStudent.get(String(r.student));
    if (!cur || order > cur.order) gpaByStudent.set(String(r.student), { gpa: r.gpa, order });
  }
  const attByStudent = new Map<string, { total: number; present: number }>();
  for (const a of attendance) {
    const e = attByStudent.get(String(a.student)) ?? { total: 0, present: 0 };
    e.total++;
    if (a.status === "present" || a.status === "late") e.present++;
    attByStudent.set(String(a.student), e);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "My Classes", href: "/teacher/classes" }, { label: section?.name ?? "Section" }]} />
      <PageHeader title={section?.name ?? "Section"} subtitle={`${roster.length} students`} />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH align="center">Roll</TH>
            <TH>Student</TH>
            <TH align="center">Latest GPA</TH>
            <TH align="center">Attendance</TH>
          </TableHeadRow>
          <tbody>
            {roster.map((r) => {
              const gpa = gpaByStudent.get(String(r.student._id));
              const att = attByStudent.get(String(r.student._id));
              return (
                <TR key={String(r.student._id)}>
                  <TD align="center" className="tabular-nums">{r.roll}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Avatar name={r.student.name} src={r.student.photoUrl} size={24} />
                      <span>{r.student.name}</span>
                    </div>
                    <span className="text-[11px] text-muted">{r.student.studentCode} · b. {formatDate(r.student.dateOfBirth, "short")}</span>
                  </TD>
                  <TD align="center" className="tabular-nums">{gpa ? gpa.gpa.toFixed(2) : "—"}</TD>
                  <TD align="center" className="tabular-nums">
                    {att ? `${Math.round((att.present / att.total) * 100)}%` : "—"}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
