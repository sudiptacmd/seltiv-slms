import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { ClassModel, Subject } from "@/models";
import { SubjectForm } from "./SubjectForm";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  await requireRole("admin");
  await connectDb();
  const [classes, subjects] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Subject.find().sort({ order: 1 }).lean(),
  ]);
  const byClass = new Map<string, typeof subjects>();
  for (const s of subjects) {
    const k = String(s.klass);
    if (!byClass.has(k)) byClass.set(k, []);
    byClass.get(k)!.push(s);
  }

  return (
    <div>
      <PageHeader title="Subjects" subtitle="Subjects per class, with full and pass marks used across exams." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Add a subject" className="lg:col-span-1">
          <SubjectForm classes={classes.map((c) => ({ id: String(c._id), name: c.name }))} />
        </Panel>
        <div className="space-y-4 lg:col-span-2">
          {classes.map((c) => (
            <Panel key={String(c._id)} title={c.name} bodyClassName="p-0">
              <Table>
                <TableHeadRow>
                  <TH>Subject</TH>
                  <TH>Code</TH>
                  <TH align="center">Full</TH>
                  <TH align="center">Pass</TH>
                </TableHeadRow>
                <tbody>
                  {(byClass.get(String(c._id)) ?? []).map((s) => (
                    <TR key={String(s._id)}>
                      <TD>{s.name}</TD>
                      <TD className="text-muted">{s.code}</TD>
                      <TD align="center" className="tabular-nums">{s.fullMarks}</TD>
                      <TD align="center" className="tabular-nums">{s.passMarks}</TD>
                    </TR>
                  ))}
                  {!byClass.get(String(c._id)) && <TR><TD colSpan={4} className="text-muted">No subjects.</TD></TR>}
                </tbody>
              </Table>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  );
}
