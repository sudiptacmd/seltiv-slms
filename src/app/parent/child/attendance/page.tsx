import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { resolveChild } from "@/lib/parent";
import { connectDb } from "@/lib/db";
import { AttendanceRecord } from "@/models";
import { todayStr } from "@/lib/queries";

export const metadata: Metadata = { title: "Attendance" };

export default async function ParentAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string; month?: string }>;
}) {
  const user = await requireRole("parent");
  const sp = await searchParams;
  const { child, children } = await resolveChild(user, sp.child);
  if (!child) return <EmptyState title="No child linked" />;

  await connectDb();
  const records = await AttendanceRecord.find({ student: child.id }).select("date status").sort({ date: 1 }).lean();
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : todayStr().slice(0, 7);

  const months = [...new Set(records.map((r) => r.date.slice(0, 7)))].sort().reverse();

  return (
    <div>
      <PageHeader title="Attendance" />
      <ChildSwitcher children={children} activeId={child.id} />

      {records.length === 0 ? (
        <EmptyState title="No attendance recorded yet" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {months.map((m) => (
              <a
                key={m}
                href={`/parent/child/attendance?child=${child.id}&month=${m}`}
                className={`rounded border px-3 py-1.5 text-[13px] ${
                  m === month ? "border-accent bg-accent-50" : "border-line hover:bg-panel"
                }`}
              >
                {new Date(m + "-01").toLocaleString("en", { month: "short", year: "numeric" })}
              </a>
            ))}
          </div>
          <AttendanceCalendar records={records.map((r) => ({ date: r.date, status: r.status }))} month={month} />
        </>
      )}
    </div>
  );
}
