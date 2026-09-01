import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { teacherSections, sectionRoster } from "@/lib/teacher";
import { todayStr } from "@/lib/queries";
import { connectDb } from "@/lib/db";
import { AttendanceSession, AttendanceRecord, PeriodSlot } from "@/models";
import { RollCall } from "./RollCall";

export const metadata: Metadata = { title: "Attendance" };

export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireRole("teacher");
  const sp = await searchParams;
  const sections = await teacherSections(user.staffId!);
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayStr();
  const sectionId = sp.sectionId ?? sections[0]?.id;
  const period = sp.period || "Period 1";

  await connectDb();
  const slots = await PeriodSlot.find({ isBreak: { $ne: true } }).sort({ order: 1 }).lean();

  if (!sectionId) {
    return (
      <div>
        <PageHeader title="Take roll call" />
        <EmptyState title="You are not assigned to any section" hint="Ask the office to set you as a class teacher or subject teacher." />
      </div>
    );
  }

  const section = sections.find((s) => s.id === sectionId);
  const roster = await sectionRoster(sectionId);
  const session = await AttendanceSession.findOne({ section: sectionId, date, period }).lean();
  const existing = session
    ? await AttendanceRecord.find({ session: session._id }).lean()
    : [];
  const currentByStudent = new Map(existing.map((r) => [String(r.student), r.status]));

  return (
    <div>
      <PageHeader title="Take roll call" subtitle="Marks reach the dashboard and the parents the same minute." />

      <form className="mb-4 flex flex-wrap items-end gap-3 rounded border border-line bg-surface p-3 text-[13px]">
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">Section</span>
          <select name="sectionId" defaultValue={sectionId} className="h-9 rounded border border-line-strong bg-surface px-2">
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.isClassTeacher ? " (class teacher)" : ""}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">Date</span>
          <input type="date" name="date" defaultValue={date} max={todayStr()} className="h-9 rounded border border-line-strong bg-surface px-2" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">Period</span>
          <select name="period" defaultValue={period} className="h-9 rounded border border-line-strong bg-surface px-2">
            {slots.map((s) => (
              <option key={String(s._id)} value={s.name}>{s.name}</option>
            ))}
          </select>
        </label>
        <button className="h-9 rounded bg-accent px-3.5 font-medium text-white hover:bg-accent-600">Load</button>
        <Link href="/teacher/attendance/history" className="ml-auto text-[12px] text-accent-700 hover:underline">
          Attendance history →
        </Link>
      </form>

      {roster.length === 0 ? (
        <Panel><EmptyState title="No students enrolled in this section" /></Panel>
      ) : (
        <RollCall
          sectionId={sectionId}
          sectionName={section?.name ?? "Section"}
          date={date}
          period={period}
          locked={Boolean(session?.locked)}
          roster={roster.map((r) => ({
            studentId: String(r.student._id),
            name: r.student.name,
            roll: r.roll,
            current: currentByStudent.get(String(r.student._id)),
          }))}
        />
      )}
    </div>
  );
}
