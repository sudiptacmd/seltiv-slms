import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { GradesheetView } from "@/components/GradesheetView";
import { resolveChild } from "@/lib/parent";
import { getStudentProfile, getStudentSubjectMarks } from "@/lib/students";

export const metadata: Metadata = { title: "Gradesheet" };

export default async function ParentGradesheetPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; exam?: string }>;
}) {
  const user = await requireRole("parent");
  const sp = await searchParams;
  const { child, children } = await resolveChild(user, sp.child);
  if (!child) return <EmptyState title="No child linked" />;

  const profile = await getStudentProfile(child.id);
  const published = profile?.termGpas ?? [];
  const activeExamId = sp.exam ?? published[published.length - 1]?.examId;
  const marks = activeExamId ? await getStudentSubjectMarks(child.id, activeExamId) : null;
  const activeExam = published.find((p) => p.examId === activeExamId);

  return (
    <div>
      <PageHeader title="Gradesheet" subtitle="Results are shown once the school publishes them." />
      <ChildSwitcher children={children} activeId={child.id} />

      {published.length === 0 ? (
        <EmptyState title="No published results yet" hint="You'll be able to see and download the gradesheet here after each exam." />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {published.map((p) => (
              <a
                key={p.examId}
                href={`/parent/child/gradesheet?child=${child.id}&exam=${p.examId}`}
                className={`rounded border px-3 py-1.5 text-[13px] ${
                  p.examId === activeExamId ? "border-accent bg-accent-50" : "border-line hover:bg-panel"
                }`}
              >
                {p.exam}
              </a>
            ))}
          </div>
          {marks ? (
            <GradesheetView
              data={marks}
              examName={activeExam?.exam ?? "Result"}
              studentName={child.name}
              className={`${child.klass} ${child.section} · Roll ${child.roll}`}
              downloadHref={`/print/gradesheet/${child.id}?exam=${activeExamId}`}
            />
          ) : (
            <Panel><p className="text-[13px] text-muted">Result not available.</p></Panel>
          )}
        </>
      )}
    </div>
  );
}
