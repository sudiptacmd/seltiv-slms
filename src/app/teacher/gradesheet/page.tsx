import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { teacherPendingMarks } from "@/lib/teacher";

export const metadata: Metadata = { title: "Gradesheet" };

export default async function GradesheetPage() {
  const user = await requireRole("teacher");
  const items = await teacherPendingMarks(user.staffId!);

  const byExam = new Map<string, typeof items>();
  for (const it of items) {
    if (!byExam.has(it.exam)) byExam.set(it.exam, []);
    byExam.get(it.exam)!.push(it);
  }

  return (
    <div>
      <PageHeader title="Gradesheet — marks entry" subtitle="Enter marks for the exams you teach. Submitting locks the sheet for the office to process." />
      {items.length === 0 ? (
        <EmptyState title="No open exams" hint="Mark entry opens when the office schedules an exam for your class." />
      ) : (
        <div className="space-y-4">
          {[...byExam].map(([exam, rows]) => (
            <Panel key={exam} title={exam} bodyClassName="p-0">
              <Table>
                <TableHeadRow>
                  <TH>Section</TH>
                  <TH>Subject</TH>
                  <TH>Status</TH>
                  <TH align="right"></TH>
                </TableHeadRow>
                <tbody>
                  {rows.map((r, i) => (
                    <TR key={i}>
                      <TD>{r.section}</TD>
                      <TD>{r.subject}</TD>
                      <TD><StatusBadge status={r.submitted ? "submitted" : "draft"} /></TD>
                      <TD align="right">
                        <Link
                          href={`/teacher/gradesheet/${r.examId}/${r.subjectId}?section=${r.sectionId}`}
                          className="text-[12px] font-medium text-accent-700 hover:underline"
                        >
                          {r.submitted ? "View" : "Enter marks"}
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
