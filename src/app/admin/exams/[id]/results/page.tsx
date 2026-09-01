import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, Tag } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Exam, Result, Student, Section } from "@/models";
import { ProcessButtons } from "./ProcessButtons";

export const metadata: Metadata = { title: "Results" };

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  await connectDb();
  const exam = await Exam.findById(id).lean();
  if (!exam) notFound();

  const results = await Result.find({ exam: id }).lean();
  const students = await Student.find({ _id: { $in: results.map((r) => r.student) } }).select("name studentCode").lean();
  const sMap = new Map(students.map((s) => [String(s._id), s]));
  const sections = await Section.find({ _id: { $in: results.map((r) => r.section) } }).populate("klass", "name").lean();
  const secMap = new Map(sections.map((s) => [String(s._id), s]));

  const passRate = results.length ? Math.round((results.filter((r) => !r.failed).length / results.length) * 100) : 0;
  const avgGpa = results.length ? results.reduce((s, r) => s + r.gpa, 0) / results.length : 0;
  const topper = [...results].sort((a, b) => b.totalObtained - a.totalObtained)[0];

  return (
    <div>
      <Breadcrumbs items={[{ label: "Exams", href: "/admin/exams" }, { label: exam.name, href: "/admin/exams" }, { label: "Results" }]} />
      <PageHeader
        title={`Results — ${exam.name}`}
        subtitle={exam.resultPublished ? "Published — visible to parents" : "Not published"}
        actions={<ProcessButtons examId={id} published={exam.resultPublished} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={results.length} label="Students processed" />
        <StatTile value={`${passRate}%`} label="Pass rate" tone={passRate < 80 ? "warn" : "ok"} />
        <StatTile value={avgGpa.toFixed(2)} label="Average GPA" />
        <StatTile value={topper ? sMap.get(String(topper.student))?.name?.split(" ")[0] ?? "—" : "—"} label="Top scorer" hint={topper ? `${topper.percent.toFixed(1)}%` : undefined} />
      </div>

      <Panel className="mt-4" bodyClassName="p-0" title="Result sheet">
        <Table>
          <TableHeadRow>
            <TH align="center">Class rank</TH>
            <TH>Student</TH>
            <TH>Section</TH>
            <TH align="center">Marks</TH>
            <TH align="center">GPA</TH>
            <TH align="center">Grade</TH>
            <TH align="right"></TH>
          </TableHeadRow>
          <tbody>
            {[...results].sort((a, b) => a.classRank - b.classRank || b.totalObtained - a.totalObtained).slice(0, 200).map((r) => {
              const st = sMap.get(String(r.student));
              const sec = secMap.get(String(r.section));
              const k = sec?.klass as unknown as { name: string } | undefined;
              return (
                <TR key={String(r._id)}>
                  <TD align="center" className="tabular-nums">{r.classRank || "—"}</TD>
                  <TD>
                    <Link href={`/admin/students/${r.student}`} className="font-medium hover:text-accent-700">{st?.name}</Link>
                  </TD>
                  <TD className="text-muted">{k?.name} {sec?.name}</TD>
                  <TD align="center" className="tabular-nums">{r.totalObtained}/{r.totalFull}</TD>
                  <TD align="center" className="tabular-nums">{r.gpa.toFixed(2)}</TD>
                  <TD align="center">{r.failed ? <Tag tone="danger">{r.grade}</Tag> : r.grade}</TD>
                  <TD align="right">
                    <a href={`/print/gradesheet/${r.student}?exam=${id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">PDF</a>
                  </TD>
                </TR>
              );
            })}
            {results.length === 0 && <TR><TD colSpan={7} className="text-muted">No results yet. Process the exam once marks are in.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
