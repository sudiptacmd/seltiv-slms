import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, Tag } from "@/components/ui/primitives";
import { teacherToday, teacherPendingMarks, teacherSections } from "@/lib/teacher";
import { connectDb } from "@/lib/db";
import { Notice } from "@/models";
import { formatDate } from "@/lib/utils";
import { WEEKDAYS } from "@/models/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole("teacher");
  await connectDb();
  const [today, pendingMarks, sections, notices] = await Promise.all([
    teacherToday(user.staffId!),
    teacherPendingMarks(user.staffId!),
    teacherSections(user.staffId!),
    Notice.find({ status: "published", "audience.kind": { $in: ["all", "all_teachers"] } })
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean(),
  ]);
  const pendingUnsub = pendingMarks.filter((m) => !m.submitted);
  const dayName = WEEKDAYS[new Date().getDay()];

  return (
    <div>
      <PageHeader title={`Good day, ${user.personName.split(" ")[0]}`} subtitle={`${dayName[0].toUpperCase() + dayName.slice(1)} · ${formatDate(new Date())}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile value={sections.length} label="My sections" />
        <StatTile value={today.todayClasses.length} label="Classes today" />
        <StatTile value={today.rollCallPending.length} label="Roll call pending" tone={today.rollCallPending.length ? "warn" : "ok"} />
        <StatTile value={pendingUnsub.length} label="Mark sheets to submit" tone={pendingUnsub.length ? "warn" : "ok"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title={`Today's classes — ${dayName}`}
          bodyClassName="p-0"
          action={<Link href="/teacher/timetable" className="text-[12px] text-accent-700 hover:underline">Full schedule →</Link>}
        >
          {today.todayClasses.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">No classes scheduled today.</p>
          ) : (
            <ul className="divide-y divide-line">
              {today.todayClasses.map((c, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2 text-[13px]">
                  <span>
                    <span className="tabular-nums text-muted">{c.time}</span> · {c.section}
                  </span>
                  <span className="text-muted">{c.subject}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Pending tasks">
            {today.rollCallPending.length === 0 && pendingUnsub.length === 0 ? (
              <p className="text-[13px] text-muted">Nothing pending — nicely done.</p>
            ) : (
              <ul className="space-y-2 text-[13px]">
                {today.rollCallPending.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <span>Roll call — {s.name}</span>
                    <Link href={`/teacher/attendance?sectionId=${s.id}`} className="font-medium text-accent-700">Take now</Link>
                  </li>
                ))}
                {pendingUnsub.slice(0, 6).map((m, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <span>Marks — {m.section} · {m.subject}</span>
                    <Link href={`/teacher/gradesheet/${m.examId}/${m.subjectId}?section=${m.sectionId}`} className="font-medium text-accent-700">
                      Enter
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Notices" bodyClassName="p-0">
            <ul className="divide-y divide-line">
              {notices.length === 0 && <li className="px-4 py-3 text-[13px] text-muted">No notices for teachers.</li>}
              {notices.map((n) => (
                <li key={String(n._id)} className="px-4 py-2 text-[13px]">
                  <Link href="/teacher/notices" className="font-medium hover:text-accent-700">{n.title}</Link>
                  <span className="float-right text-[11px] text-muted">{formatDate(n.publishedAt, "short")}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <Panel title="My sections" className="mt-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/classes/${s.id}`}
              className="rounded border border-line px-3 py-1.5 text-[13px] hover:bg-panel"
            >
              {s.name}
              {s.isClassTeacher && <Tag tone="accent" className="ml-2">Class teacher</Tag>}
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
