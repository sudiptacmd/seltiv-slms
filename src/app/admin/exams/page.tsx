import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag, StatTile } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Exam, Term, ClassModel, Result } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { CreateExamForm } from "./CreateExamForm";
import { RoutineButton } from "./RoutineButton";

export const metadata: Metadata = { title: "Exams" };

export default async function ExamsPage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [exams, terms, classes] = await Promise.all([
    Exam.find({ year: year._id }).populate("term", "name order").sort({ createdAt: -1 }).lean(),
    Term.find({ year: year._id }).sort({ order: 1 }).lean(),
    ClassModel.find().sort({ order: 1 }).lean(),
  ]);

  const resultCounts = await Result.aggregate<{ _id: string; n: number; pass: number }>([
    { $match: { exam: { $in: exams.map((e) => e._id) } } },
    { $group: { _id: "$exam", n: { $sum: 1 }, pass: { $sum: { $cond: ["$failed", 0, 1] } } } },
  ]);
  const rcMap = new Map(resultCounts.map((r) => [String(r._id), r]));

  return (
    <div>
      <PageHeader title="Exams" subtitle={`Academic year ${year.name}`} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Schedule an exam" className="lg:col-span-1">
          <CreateExamForm
            terms={terms.map((t) => ({ id: String(t._id), name: t.name }))}
            classes={classes.map((c) => ({ id: String(c._id), name: c.name }))}
          />
        </Panel>

        <div className="space-y-3 lg:col-span-2">
          {exams.map((e) => {
            const rc = rcMap.get(String(e._id));
            return (
              <Panel
                key={String(e._id)}
                title={e.name}
                action={
                  <div className="flex items-center gap-2">
                    {e.routinePublished ? <Tag tone="ok">Routine published</Tag> : <RoutineButton examId={String(e._id)} />}
                    {e.resultPublished && <Tag tone="ok">Result published</Tag>}
                  </div>
                }
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-muted">
                    {(e.term as unknown as { name: string })?.name} ·{" "}
                    {e.startDate ? `${formatDate(e.startDate, "short")} – ${formatDate(e.endDate, "short")}` : "dates not set"}
                  </span>
                  <div className="flex gap-3">
                    <Link href={`/admin/exams/${e._id}/grading`} className="text-accent-700 hover:underline">Enter grades</Link>
                    <Link href={`/admin/exams/${e._id}/results`} className="text-accent-700 hover:underline">Results</Link>
                  </div>
                </div>
                {rc && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <StatTile value={rc.n} label="Processed" />
                    <StatTile value={`${Math.round((rc.pass / rc.n) * 100)}%`} label="Pass rate" />
                    <StatTile value={e.resultPublished ? "Yes" : "No"} label="Visible to parents" />
                  </div>
                )}
              </Panel>
            );
          })}
          {exams.length === 0 && <Panel><p className="text-[13px] text-muted">No exams scheduled yet.</p></Panel>}
        </div>
      </div>
    </div>
  );
}
