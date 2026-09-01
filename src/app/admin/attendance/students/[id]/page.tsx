import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumbs } from "@/components/ui/misc";
import { AttendanceCalendar } from "@/components/AttendanceCalendar";
import { connectDb } from "@/lib/db";
import { Student, AttendanceRecord } from "@/models";
import { todayStr } from "@/lib/queries";

export const metadata: Metadata = { title: "Student attendance" };

export default async function AdminStudentAttendancePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const sp = await searchParams;
  await connectDb();
  const student = await Student.findById(id).lean();
  if (!student) notFound();
  const records = await AttendanceRecord.find({ student: id }).select("date status").sort({ date: 1 }).lean();
  const months = [...new Set(records.map((r) => r.date.slice(0, 7)))].sort().reverse();
  const month = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : months[0] ?? todayStr().slice(0, 7);

  return (
    <div>
      <Breadcrumbs items={[{ label: "Attendance", href: "/admin/attendance" }, { label: student.name }]} />
      <PageHeader title={`${student.name} — attendance`} subtitle={student.studentCode} />
      <div className="mb-4 flex flex-wrap gap-2">
        {months.map((m) => (
          <a
            key={m}
            href={`/admin/attendance/students/${id}?month=${m}`}
            className={`rounded border px-3 py-1.5 text-[13px] ${m === month ? "border-accent bg-accent-50" : "border-line hover:bg-panel"}`}
          >
            {new Date(m + "-01").toLocaleString("en", { month: "short", year: "numeric" })}
          </a>
        ))}
      </div>
      <AttendanceCalendar records={records.map((r) => ({ date: r.date, status: r.status }))} month={month} />
    </div>
  );
}
