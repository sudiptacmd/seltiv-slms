import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag, EmptyState } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Exam, Section, GradingScale, Result } from "@/models";
import { sectionGradingData } from "@/lib/grading";
import { computeReport, computeRow, rankReports, rowFullMarks } from "@/lib/report-card";
import { ProcessButtons } from "../results/ProcessButtons";
import { GradeRowGrid } from "./GradeRowGrid";
import { RecordsGrid } from "./RecordsGrid";

export const metadata: Metadata = { title: "Grading" };

const fmt = (n: number | null | undefined) => (n == null ? "—" : String(Math.round(n * 100) / 100));

export default async function GradingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string; tab?: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  await connectDb();
  const exam = await Exam.findById(id).lean();
  if (!exam) notFound();

  const sections = (await Section.find({ klass: { $in: exam.classes } }).populate("klass", "name order").lean())
    .map((s) => ({ id: String(s._id), name: `${(s.klass as unknown as { name: string }).name} ${s.name}`, order: (s.klass as unknown as { order: number }).order, sec: s.name }))
    .sort((a, b) => a.order - b.order || a.sec.localeCompare(b.sec));
  const sectionId = sp.section && sections.some((s) => s.id === sp.section) ? sp.section : sections[0]?.id;
  const data = sectionId ? await sectionGradingData(id, sectionId) : null;
  const scale = await GradingScale.findOne({ isDefault: true }).lean();
  const bands = scale ? { bands: scale.bands.map((b) => ({ grade: b.grade, minPercent: b.minPercent, gpa: b.gpa })), failGrade: scale.failGrade } : null;
  const locked = exam.resultPublished;
  const href = (tab: string) => `/admin/exams/${id}/grading?section=${sectionId}&tab=${tab}`;

  const header = (
    <>
      <Breadcrumbs items={[{ label: "Exams", href: "/admin/exams" }, { label: exam.name, href: "/admin/exams" }, { label: "Grading" }]} />
      <PageHeader
        title={`Grading — ${exam.name}`}
        subtitle={locked ? "Results are published — marks are locked." : "Enter each subject's marks for the whole section. Totals, grades, GPA and positions are calculated for you."}
        actions={<ProcessButtons examId={id} published={exam.resultPublished} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {sections.map((s) => (
          <a key={s.id} href={`/admin/exams/${id}/grading?section=${s.id}&tab=${sp.tab ?? ""}`}
            className={`rounded border px-3 py-1.5 text-[13px] ${s.id === sectionId ? "border-accent bg-accent-50" : "border-line hover:bg-panel"}`}>
            {s.name}
          </a>
        ))}
        <Link href="/admin/exams/report-scheme" className="ml-auto text-[12px] text-accent-700 hover:underline">Report card layout →</Link>
      </div>
    </>
  );
  if (!data) return <div>{header}<EmptyState title="No sections" hint="This exam does not cover any sections yet." /></div>;

  const { scheme, students, entries, records } = data;
  const tab = sp.tab && (scheme.some((r) => r.key === sp.tab) || ["records", "summary"].includes(sp.tab)) ? sp.tab : scheme[0]?.key ?? "summary";
  const completeCount = (key: string) => {
    const row = scheme.find((r) => r.key === key)!;
    return students.filter((s) => {
      const e = entries.get(s.id)?.get(key);
      return e && computeRow(row, e.values, e.absent).complete;
    }).length;
  };

  return (
    <div>
      {header}
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-line">
        {scheme.map((r) => {
          const n = completeCount(r.key);
          return (
            <a key={r.key} href={href(r.key)}
              className={`-mb-px rounded-t border px-3 py-1.5 text-[12px] ${tab === r.key ? "border-line border-b-surface bg-surface font-medium" : "border-transparent text-muted hover:text-ink"}`}>
              {r.label} <span className={`ml-1 tabular-nums ${n === students.length ? "text-ok" : "text-muted"}`}>{n}/{students.length}</span>
            </a>
          );
        })}
        {[["records", "Attendance & remarks"], ["summary", "Summary"]].map(([k, label]) => (
          <a key={k} href={href(k)}
            className={`-mb-px rounded-t border px-3 py-1.5 text-[12px] ${tab === k ? "border-line border-b-surface bg-surface font-medium" : "border-transparent text-muted hover:text-ink"}`}>
            {label}
          </a>
        ))}
      </nav>

      {tab === "records" ? (
        <RecordsGrid
          key={`${sectionId}-records`}
          examId={id}
          sectionId={sectionId!}
          locked={locked}
          students={students.map((s) => {
            const r = records.get(s.id);
            return { ...s, workingDays: r?.workingDays ?? null, present: r?.present ?? null, late: r?.late ?? null, remarks: r?.remarks ?? "" };
          })}
        />
      ) : tab === "summary" ? (
        <Summary examId={id} data={data} scale={bands} />
      ) : (
        (() => {
          const row = scheme.find((r) => r.key === tab)!;
          return (
            <GradeRowGrid
              key={`${sectionId}-${row.key}`}
              examId={id}
              sectionId={sectionId!}
              row={row}
              fullMarks={rowFullMarks(row)}
              scale={bands}
              locked={locked}
              students={students.map((s) => {
                const e = entries.get(s.id)?.get(row.key);
                return { ...s, values: e?.values ?? {}, absent: e?.absent ?? false };
              })}
            />
          );
        })()
      )}
    </div>
  );
}

async function Summary({
  examId,
  data,
  scale,
}: {
  examId: string;
  data: NonNullable<Awaited<ReturnType<typeof sectionGradingData>>>;
  scale: Parameters<typeof computeReport>[2];
}) {
  const { scheme, students, entries } = data;
  const reports = students.map((s) => ({ s, rep: entries.has(s.id) ? computeReport(scheme, entries.get(s.id)!, scale) : null }));
  const ranks = rankReports(reports.filter((r) => r.rep).map((r) => ({ id: r.s.id, gpa: r.rep!.gpa, grandTotal: r.rep!.grandTotal, failed: r.rep!.failed })));
  const processed = new Set((await Result.find({ exam: examId, student: { $in: students.map((s) => s.id) } }).select("student").lean()).map((r) => String(r.student)));
  return (
    <Panel title={`${data.klass.name} ${data.section.name} · ${students.length} students`} bodyClassName="p-0"
      action={<span className="text-[12px] text-muted">Position is live for this section. Process results to update class positions and report cards.</span>}>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="bg-panel">
            <tr className="border-b border-line-strong text-[10px] uppercase tracking-wide text-muted">
              <th className="px-2 py-2 text-left">Roll</th>
              <th className="px-2 py-2 text-left">Student</th>
              {scheme.map((r) => <th key={r.key} className="px-2 py-2 text-center">{r.label}<br /><span className="normal-case">/{rowFullMarks(r)}</span></th>)}
              <th className="px-2 py-2 text-center">Grand total</th>
              <th className="px-2 py-2 text-center">GPA</th>
              <th className="px-2 py-2 text-center">Grade</th>
              <th className="px-2 py-2 text-center">Position</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {reports.map(({ s, rep }) => (
              <tr key={s.id} className="border-b border-line">
                <td className="px-2 py-1.5 tabular-nums text-muted">{s.roll}</td>
                <td className="px-2 py-1.5 whitespace-nowrap">{s.name}</td>
                {scheme.map((row) => {
                  const r = rep?.rows.find((x) => x.key === row.key);
                  return (
                    <td key={row.key} className={`px-2 py-1.5 text-center tabular-nums ${r?.failed ? "text-danger" : ""}`}>
                      {r?.absent ? "Abs" : fmt(r?.total)}
                      {r?.grade && !r.absent && <span className="ml-1 text-[10px] text-muted">{r.grade}</span>}
                      {r && !r.complete && r.total != null && <span title="Some columns are still empty" className="ml-0.5 text-warn">•</span>}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center font-medium tabular-nums">{rep ? fmt(rep.grandTotal) : "—"}</td>
                <td className="px-2 py-1.5 text-center tabular-nums">{rep ? rep.gpa.toFixed(2) : "—"}</td>
                <td className="px-2 py-1.5 text-center">{rep ? (rep.failed ? <Tag tone="danger">{rep.grade}</Tag> : rep.grade) : "—"}</td>
                <td className="px-2 py-1.5 text-center tabular-nums">{ranks.get(s.id) ?? "—"}</td>
                <td className="px-2 py-1.5 text-right whitespace-nowrap">
                  {processed.has(s.id)
                    ? <a href={`/print/gradesheet/${s.id}?exam=${examId}`} target="_blank" className="text-accent-700 hover:underline">Report card</a>
                    : <span className="text-muted">not processed</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
