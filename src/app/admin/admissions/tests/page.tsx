import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { EntranceTest, AdmissionApplication, AdmissionSession } from "@/models";
import { formatDate } from "@/lib/utils";
import { ScheduleTestForm } from "./ScheduleTestForm";

export const metadata: Metadata = { title: "Entrance Tests" };

export default async function EntranceTestsPage() {
  await requireRole("admin");
  await connectDb();
  const session = await AdmissionSession.findOne().sort({ createdAt: -1 }).lean();
  const [tests, pending] = await Promise.all([
    EntranceTest.find(session ? { session: session._id } : {}).sort({ date: -1 }).lean(),
    AdmissionApplication.find(session ? { session: session._id, stage: "submitted" } : {}).populate("klass", "name").lean(),
  ]);

  return (
    <div>
      <PageHeader title="Entrance Tests" subtitle="Schedule a test slot and assign applicants who have submitted." />
      {!session ? (
        <EmptyState title="No admission session" hint="Create one under Session Settings first." />
      ) : (
        <>
          <ScheduleTestForm
            applicants={pending.map((a) => ({
              id: String(a._id),
              name: a.studentName,
              klass: (a.klass as unknown as { name: string })?.name ?? "—",
            }))}
          />

          <Panel title="Scheduled tests" className="mt-4" bodyClassName="p-0">
            <Table>
              <TableHeadRow>
                <TH>Title</TH>
                <TH>Date</TH>
                <TH>Venue</TH>
                <TH align="center">Applicants</TH>
                <TH align="center">Full marks</TH>
              </TableHeadRow>
              <tbody>
                {tests.map((t) => (
                  <TR key={String(t._id)}>
                    <TD>{t.title}</TD>
                    <TD>{formatDate(t.date, "short")}</TD>
                    <TD className="text-muted">{t.venue ?? "—"}</TD>
                    <TD align="center" className="tabular-nums">{t.applicants.length}</TD>
                    <TD align="center" className="tabular-nums">{t.fullMarks}</TD>
                  </TR>
                ))}
                {tests.length === 0 && <TR><TD colSpan={5} className="text-muted">No tests scheduled.</TD></TR>}
              </tbody>
            </Table>
          </Panel>
        </>
      )}
    </div>
  );
}
