import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { teacherTimetable } from "@/lib/teacher";
import { WEEKDAYS } from "@/models/types";

export const metadata: Metadata = { title: "Class Schedule" };

const DAYS = WEEKDAYS.filter((d) => d !== "friday" && d !== "saturday");

export default async function TeacherTimetablePage() {
  const user = await requireRole("teacher");
  const { byDay, slots } = await teacherTimetable(user.staffId!);
  const teachingSlots = slots.filter((s) => !s.isBreak);
  const today = WEEKDAYS[new Date().getDay()];

  return (
    <div>
      <PageHeader title="Class Schedule" subtitle="Your weekly teaching timetable." />
      <div className="overflow-x-auto rounded border border-line bg-surface">
        <table className="w-full min-w-[720px] text-[13px]">
          <thead>
            <tr className="border-b border-line-strong">
              <th className="w-28 px-3 py-2 text-left text-[11px] uppercase tracking-wide text-muted">Period</th>
              {DAYS.map((d) => (
                <th
                  key={d}
                  className={`px-3 py-2 text-left text-[11px] uppercase tracking-wide ${d === today ? "text-accent-700" : "text-muted"}`}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teachingSlots.map((slot) => (
              <tr key={String(slot._id)} className="border-b border-line">
                <td className="px-3 py-2">
                  <div className="font-medium">{slot.name}</div>
                  <div className="text-[11px] text-muted">{slot.startTime}–{slot.endTime}</div>
                </td>
                {DAYS.map((d) => {
                  const cell = byDay[d].find((e) => e.slot === slot.name);
                  return (
                    <td key={d} className={`px-3 py-2 ${d === today ? "bg-accent-50/40" : ""}`}>
                      {cell ? (
                        <>
                          <div className="font-medium">{cell.section}</div>
                          <div className="text-[11px] text-muted">{cell.subject}</div>
                        </>
                      ) : (
                        <span className="text-line-strong">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.values(byDay).every((d) => d.length === 0) && (
        <Panel className="mt-4">
          <p className="text-[13px] text-muted">No timetable entries yet. The office builds the timetable under Academics → Timetable.</p>
        </Panel>
      )}
    </div>
  );
}
