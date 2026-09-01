import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Tag, EmptyState } from "@/components/ui/primitives";
import { teacherSections, sectionRoster } from "@/lib/teacher";

export const metadata: Metadata = { title: "My Classes" };

export default async function MyClassesPage() {
  const user = await requireRole("teacher");
  const sections = await teacherSections(user.staffId!);
  const counts = await Promise.all(sections.map((s) => sectionRoster(s.id).then((r) => r.length)));

  if (sections.length === 0) {
    return (
      <div>
        <PageHeader title="My Classes" />
        <EmptyState title="No sections assigned yet" hint="The office assigns class teachers and subject teachers under Academics → Assignments." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="My Classes" subtitle="Sections you teach or are class teacher of." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s, i) => (
          <Link key={s.id} href={`/teacher/classes/${s.id}`}>
            <Panel className="h-full transition-colors hover:border-accent">
              <div className="flex items-start justify-between">
                <h3 className="font-serif text-[17px] font-semibold">{s.name}</h3>
                {s.isClassTeacher && <Tag tone="accent">Class teacher</Tag>}
              </div>
              <p className="mt-1 text-[12px] text-muted">{counts[i]} students</p>
              {s.subjects.length > 0 && (
                <p className="mt-2 text-[12px] text-muted">Teaching: {[...new Set(s.subjects)].join(", ")}</p>
              )}
            </Panel>
          </Link>
        ))}
      </div>
    </div>
  );
}
