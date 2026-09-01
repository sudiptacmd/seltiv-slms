import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { PeriodSlot, CalendarDay, Settings } from "@/models";
import { formatDate } from "@/lib/utils";
import { PeriodForm, HolidayForm, WindowForm } from "./forms";

export const metadata: Metadata = { title: "Attendance settings" };

export default async function AttendanceSettingsPage() {
  await requireRole("admin");
  await connectDb();
  const [slots, holidays, settings] = await Promise.all([
    PeriodSlot.find().sort({ order: 1 }).lean(),
    CalendarDay.find().sort({ date: 1 }).lean(),
    Settings.findOne().lean(),
  ]);

  return (
    <div>
      <PageHeader title="Attendance settings" subtitle="Periods, the school calendar and how long teachers can edit a roll call." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Periods" bodyClassName="p-0">
          <Table>
            <TableHeadRow><TH>Name</TH><TH>Time</TH><TH></TH></TableHeadRow>
            <tbody>
              {slots.map((s) => (
                <TR key={String(s._id)}>
                  <TD>{s.name}</TD>
                  <TD className="text-muted">{s.startTime}–{s.endTime}</TD>
                  <TD>{s.isBreak && <span className="text-[11px] text-muted">break</span>}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
          <div className="border-t border-line p-3"><PeriodForm /></div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Roll-call edit window">
            <WindowForm hours={settings?.attendanceEditWindowHours ?? 24} />
          </Panel>
          <Panel title="Holidays & events" bodyClassName="p-0">
            <ul className="max-h-56 divide-y divide-line overflow-y-auto text-[13px]">
              {holidays.map((h) => (
                <li key={String(h._id)} className="flex items-center justify-between px-4 py-2">
                  <span>{h.title}</span>
                  <span className="text-muted">{formatDate(h.date, "short")}</span>
                </li>
              ))}
              {holidays.length === 0 && <li className="px-4 py-3 text-muted">None added.</li>}
            </ul>
            <div className="border-t border-line p-3"><HolidayForm /></div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
