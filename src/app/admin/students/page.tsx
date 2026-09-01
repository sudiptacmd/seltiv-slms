import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, LinkButton, Avatar } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge, Pagination } from "@/components/ui/misc";
import { FilterBar } from "@/components/FilterBar";
import { EmptyState } from "@/components/ui/primitives";
import { listStudents, classSectionOptions } from "@/lib/students";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { classes, sections } = await classSectionOptions();
  const { rows, total, page, pageCount } = await listStudents({
    q: sp.q,
    classId: sp.classId,
    sectionId: sp.sectionId,
    status: sp.status,
    page: sp.page ? Number(sp.page) : 1,
  });

  const qs = (p: number) => {
    const u = new URLSearchParams(sp as Record<string, string>);
    u.set("page", String(p));
    return `/admin/students?${u.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Student Directory"
        subtitle={`${total} students`}
        actions={
          <>
            <LinkButton href="/admin/students/import" variant="secondary" size="sm">Import</LinkButton>
            <LinkButton href="/admin/students/new" variant="primary" size="sm">Add student</LinkButton>
          </>
        }
      />

      <FilterBar
        filters={[
          { type: "search", key: "q", placeholder: "Name or student ID…" },
          { type: "select", key: "classId", label: "All classes", options: classes.map((c) => ({ value: c.id, label: c.name })) },
          { type: "select", key: "sectionId", label: "All sections", options: sections.map((s) => ({ value: s.id, label: s.name })) },
          {
            type: "select",
            key: "status",
            label: "Any status",
            options: ["active", "transferred", "withdrawn", "graduated"].map((s) => ({ value: s, label: s })),
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="No students match" hint="Adjust the filters, or add a student." />
      ) : (
        <div className="rounded border border-line bg-surface">
          <Table>
            <TableHeadRow>
              <TH>Student</TH>
              <TH>Student ID</TH>
              <TH>Class</TH>
              <TH align="center">Roll</TH>
              <TH>Status</TH>
              <TH align="right"></TH>
            </TableHeadRow>
            <tbody>
              {rows.map(({ student, enrollment }) => {
                const k = enrollment.klass as unknown as { name: string };
                const sec = enrollment.section as unknown as { name: string };
                return (
                  <TR key={String(student._id)}>
                    <TD>
                      <Link href={`/admin/students/${student._id}`} className="flex items-center gap-2 hover:text-accent-700">
                        <Avatar name={student.name} src={student.photoUrl} size={26} />
                        <span className="font-medium">{student.name}</span>
                      </Link>
                    </TD>
                    <TD className="tabular-nums text-muted">{student.studentCode}</TD>
                    <TD>{k?.name} {sec?.name}</TD>
                    <TD align="center" className="tabular-nums">{enrollment.rollNumber}</TD>
                    <TD><StatusBadge status={student.status} /></TD>
                    <TD align="right">
                      <Link href={`/admin/students/${student._id}`} className="text-[12px] text-accent-700 hover:underline">
                        View
                      </Link>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
      <Pagination page={page} pageCount={pageCount} makeHref={qs} />
    </div>
  );
}
