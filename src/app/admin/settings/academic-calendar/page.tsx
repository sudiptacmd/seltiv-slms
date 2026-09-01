import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { CalendarDay, Term, Exam } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { HolidayForm } from "../../attendance/settings/forms";

export const metadata: Metadata = { title: "Academic Calendar" };

export default async function AcademicCalendarPage() {
  await requireRole("admin");
  await connectDb();
  const year = await getCurrentYear();
  const [days, terms, exams] = await Promise.all([
    CalendarDay.find().sort({ date: 1 }).lean(),
    Term.find({ year: year._id }).sort({ order: 1 }).lean(),
    Exam.find({ year: year._id }).sort({ startDate: 1 }).lean(),
  ]);

  return (
    <div>
      <PageHeader title="Academic Calendar" subtitle={`Terms, exams and holidays for ${year.name}.`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Terms">
          <ul className="space-y-1 text-[13px]">
            {terms.map((t) => (
              <li key={String(t._id)} className="flex justify-between">
                <span>{t.name}</span>
                <span className="text-muted">weight {t.weight}%</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Exams">
          <ul className="space-y-1 text-[13px]">
            {exams.map((e) => (
              <li key={String(e._id)} className="flex justify-between">
                <span>{e.name}</span>
                <span className="text-muted">{e.startDate ? formatDate(e.startDate, "short") : "—"}</span>
              </li>
            ))}
            {exams.length === 0 && <li className="text-muted">No exams scheduled.</li>}
          </ul>
        </Panel>
      </div>

      <Panel title="Holidays & events" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow><TH>Date</TH><TH>Title</TH><TH>Kind</TH></TableHeadRow>
          <tbody>
            {days.map((d) => (
              <TR key={String(d._id)}>
                <TD>{formatDate(d.date, "short")}</TD>
                <TD>{d.title}</TD>
                <TD className="capitalize text-muted">{d.kind}</TD>
              </TR>
            ))}
            {days.length === 0 && <TR><TD colSpan={3} className="text-muted">Nothing added.</TD></TR>}
          </tbody>
        </Table>
        <div className="border-t border-line p-3"><HolidayForm /></div>
      </Panel>
    </div>
  );
}
