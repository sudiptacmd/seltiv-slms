import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { ClassModel, Section, Subject, Staff, PeriodSlot, TimetableEntry } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { TimetableGrid } from "./TimetableGrid";

export const metadata: Metadata = { title: "Timetable" };

export default async function TimetablePage({ searchParams }: { searchParams: Promise<{ section?: string }> }) {
  await requireRole("admin");
  await connectDb();
  const sp = await searchParams;
  const year = await getCurrentYear();

  const [classes, sections, slots] = await Promise.all([
    ClassModel.find().sort({ order: 1 }).lean(),
    Section.find().populate("klass", "name order").lean(),
    PeriodSlot.find().sort({ order: 1 }).lean(),
  ]);
  const sorted = sections
    .map((s) => ({ s, k: s.klass as unknown as { name: string; order: number } }))
    .sort((a, b) => a.k.order - b.k.order || a.s.name.localeCompare(b.s.name));
  const activeSectionId = sp.section ?? String(sorted[0]?.s._id ?? "");
  const active = sorted.find((x) => String(x.s._id) === activeSectionId);

  if (!active) {
    return (
      <div>
        <PageHeader title="Timetable" />
        <EmptyState title="Create classes and sections first" />
      </div>
    );
  }

  const [subjects, teachers, entries] = await Promise.all([
    Subject.find({ klass: active.s.klass }).sort({ order: 1 }).lean(),
    Staff.find({ type: "teaching", active: true }).sort({ name: 1 }).lean(),
    TimetableEntry.find({ section: activeSectionId, year: year._id }).lean(),
  ]);

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Build the weekly schedule for each section." />
      <div className="mb-4 flex flex-wrap gap-2">
        {sorted.map(({ s, k }) => (
          <Link
            key={String(s._id)}
            href={`/admin/academics/timetable?section=${s._id}`}
            className={`rounded border px-3 py-1.5 text-[13px] ${
              String(s._id) === activeSectionId ? "border-accent bg-accent-50" : "border-line hover:bg-panel"
            }`}
          >
            {k.name} {s.name}
          </Link>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <TimetableGrid
          sectionId={activeSectionId}
          slots={slots.map((s) => ({ id: String(s._id), name: s.name, time: `${s.startTime}–${s.endTime}`, isBreak: Boolean(s.isBreak) }))}
          subjects={subjects.map((s) => ({ id: String(s._id), name: s.name }))}
          teachers={teachers.map((t) => ({ id: String(t._id), name: t.name }))}
          entries={entries.map((e) => ({
            weekday: e.weekday,
            slotId: String(e.slot),
            subjectId: String(e.subject),
            teacherId: String(e.teacher),
          }))}
        />
      </Panel>
    </div>
  );
}
