import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, StatTile, Tag } from "@/components/ui/primitives";
import { teacherToday, teacherPendingMarks, teacherSections } from "@/lib/teacher";
import { connectDb } from "@/lib/db";
import { Notice, CalendarDay, Exam } from "@/models";
import { formatDate } from "@/lib/utils";
import { WEEKDAYS } from "@/models/types";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole("teacher");
  await connectDb();
  const [today, pendingMarks, sections, notices, calendar, exams] = await Promise.all([
    teacherToday(user.staffId!),
    teacherPendingMarks(user.staffId!),
    teacherSections(user.staffId!),
    Notice.find({ status: "published", "audience.kind": { $in: ["all", "all_teachers"] } })
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean(),
    CalendarDay.find({ date: { $gte: new Date().toISOString().slice(0, 10) } }).sort({ date: 1 }).limit(6).lean(),
    Exam.find({ endDate: { $gte: new Date() } }).sort({ endDate: 1 }).limit(3).lean(),
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

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Panel title="Important dates & deadlines" className="lg:col-span-3" bodyClassName="p-0">
          <ul className="divide-y divide-line">
            {calendar.map((item) => (
              <li key={String(item._id)} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <div className="w-14 rounded bg-panel px-2 py-1 text-center text-[11px] font-medium tabular-nums">{formatDate(new Date(`${item.date}T00:00:00`), "short")}</div>
                <span className="flex-1 font-medium">{item.title}</span>
                <Tag tone={item.kind === "holiday" ? "accent2" : item.kind === "exam" ? "warn" : "accent"}>{item.kind}</Tag>
              </li>
            ))}
            {calendar.length === 0 && <li className="px-4 py-3 text-[13px] text-muted">No upcoming calendar items.</li>}
          </ul>
        </Panel>
        <Panel title="Assignment deadlines" className="lg:col-span-2" bodyClassName="p-0">
          <ul className="divide-y divide-line text-[13px]">
            {exams.map((exam, i) => (
              <li key={String(exam._id)} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{`Submit ${exam.name.replace(" Examination 2026", "")} marks`}</span><Tag tone={i === 0 ? "danger" : "warn"}>{formatDate(exam.endDate, "short")}</Tag></div>
                <p className="mt-0.5 text-[11px] text-muted">Assigned sections · marks submission</p>
              </li>
            ))}
          </ul>
        </Panel>
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
