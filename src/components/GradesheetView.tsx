import { Panel, StatTile, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import type { getStudentSubjectMarks } from "@/lib/students";

type Data = NonNullable<Awaited<ReturnType<typeof getStudentSubjectMarks>>>;

export function GradesheetView({
  data,
  examName,
  studentName,
  className,
  downloadHref,
}: {
  data: Data;
  examName: string;
  studentName: string;
  className?: string;
  downloadHref?: string;
}) {
  const { result, lines } = data;
  return (
    <div className="space-y-4">
      <Panel
        title={examName}
        action={
          downloadHref && (
            <a href={downloadHref} target="_blank" className="text-[12px] font-medium text-accent-700 hover:underline">
              Download PDF
            </a>
          )
        }
      >
        <p className="mb-3 text-[13px] text-muted">
          {studentName}
          {className ? ` · ${className}` : ""}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={result.gpa.toFixed(2)} label="GPA" tone={result.failed ? "danger" : "ink"} />
          <StatTile value={result.grade} label="Grade" />
          <StatTile value={`${result.percent.toFixed(1)}%`} label="Marks" hint={`${result.totalObtained}/${result.totalFull}`} />
          <StatTile value={result.sectionRank || "—"} label="Section rank" hint={`Class rank ${result.classRank || "—"}`} />
        </div>
      </Panel>

      <Panel title="Subjects" bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Subject</TH>
            <TH align="center">Marks</TH>
            <TH align="center">Full</TH>
            <TH align="center">Grade</TH>
            <TH align="center">GP</TH>
          </TableHeadRow>
          <tbody>
            {lines.map((l, i) => (
              <TR key={i}>
                <TD>{l.name}</TD>
                <TD align="center" className="tabular-nums">
                  {l.absent ? <Tag tone="danger">Absent</Tag> : l.obtained ?? "—"}
                </TD>
                <TD align="center" className="tabular-nums text-muted">{l.fullMarks}</TD>
                <TD align="center">{l.grade}</TD>
                <TD align="center" className="tabular-nums">{l.gpa.toFixed(2)}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
