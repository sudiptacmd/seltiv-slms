import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Section, Enrollment, Result } from "@/models";
import { getCurrentYear } from "@/lib/queries";

export const metadata: Metadata = { title: "Report Cards" };

export default async function ReportCardsPage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireRole("admin");
  await connectDb();
  const sp = await searchParams;
  const year = await getCurrentYear();
  const sections = await Section.find().populate("klass", "name order").lean();
  const sorted = sections
    .map((s) => ({ s, k: s.klass as unknown as { name: string; order: number } }))
    .sort((a, b) => a.k.order - b.k.order || a.s.name.localeCompare(b.s.name));
  const activeId = sp.section ?? String(sorted[0]?.s._id ?? "");

  const enrollments = activeId
    ? await Enrollment.find({ section: activeId, year: year._id, status: "active" })
        .sort({ rollNumber: 1 })
        .populate("student", "name studentCode")
        .lean()
    : [];
  const publishedCount = await Result.countDocuments({
    student: { $in: enrollments.map((e) => e.student) },
    publishedAt: { $exists: true },
  });

  return (
    <div>
      <PageHeader title="Report Cards" subtitle="Consolidated term report per student — pulls every published exam for the year." />
      <div className="mb-4 flex flex-wrap gap-2">
        {sorted.map(({ s, k }) => (
          <a
            key={String(s._id)}
            href={`/admin/exams/report-cards?section=${s._id}`}
            className={`rounded border px-3 py-1.5 text-[13px] ${String(s._id) === activeId ? "border-accent bg-accent-50" : "border-line hover:bg-panel"}`}
          >
            {k.name} {s.name}
          </a>
        ))}
      </div>

      <Panel
        title={`${enrollments.length} students · ${publishedCount} with published results`}
        bodyClassName="p-0"
      >
        <Table>
          <TableHeadRow>
            <TH align="center">Roll</TH>
            <TH>Student</TH>
            <TH align="right"></TH>
          </TableHeadRow>
          <tbody>
            {enrollments.map((e) => {
              const st = e.student as unknown as { _id: unknown; name: string; studentCode: string };
              return (
                <TR key={String(e._id)}>
                  <TD align="center" className="tabular-nums">{e.rollNumber}</TD>
                  <TD>{st.name} <span className="text-[11px] text-muted">{st.studentCode}</span></TD>
                  <TD align="right">
                    <a href={`/print/report_card/${st._id}`} target="_blank" className="text-[12px] font-medium text-accent-700 hover:underline">
                      Report card PDF
                    </a>
                  </TD>
                </TR>
              );
            })}
            {enrollments.length === 0 && <TR><TD colSpan={3} className="text-muted">Pick a section.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
