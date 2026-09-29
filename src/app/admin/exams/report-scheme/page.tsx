import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { ClassModel, Subject } from "@/models";
import { getReportScheme } from "@/lib/grading";
import { SchemeEditor } from "./SchemeEditor";

export const metadata: Metadata = { title: "Report card layout" };

export default async function ReportSchemePage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  await requireRole("admin");
  await connectDb();
  const sp = await searchParams;
  const classes = await ClassModel.find().sort({ order: 1 }).lean();
  const klassId = sp.class && classes.some((c) => String(c._id) === sp.class) ? sp.class : String(classes[0]?._id ?? "");
  const [rows, subjects] = klassId ? await Promise.all([getReportScheme(klassId), Subject.find({ klass: klassId }).sort({ order: 1 }).lean()]) : [[], []];

  return (
    <div>
      <PageHeader title="Report card layout" subtitle="The subjects, papers and mark columns printed on each class's report card. The office enters marks against this layout." />
      <div className="mb-4 flex flex-wrap gap-2">
        {classes.map((c) => (
          <a key={String(c._id)} href={`/admin/exams/report-scheme?class=${c._id}`}
            className={`rounded border px-3 py-1.5 text-[13px] ${String(c._id) === klassId ? "border-accent bg-accent-50" : "border-line hover:bg-panel"}`}>
            {c.name}
          </a>
        ))}
      </div>
      {klassId && <SchemeEditor key={klassId} klassId={klassId} initial={rows} subjects={subjects.map((s) => ({ id: String(s._id), name: s.name }))} />}
    </div>
  );
}
