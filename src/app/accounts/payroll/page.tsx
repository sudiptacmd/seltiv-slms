import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { PayrollRun, Staff } from "@/models";
import { payrollRunDetail } from "@/lib/payroll";
import { monthLabel } from "@/lib/utils";
import { PayrollTable } from "./PayrollTable";
import { CreateRunForm } from "./CreateRunForm";

export const metadata: Metadata = { title: "Payroll" };

export default async function PayrollPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  await requireRole("accountant");
  await connectDb();
  const sp = await searchParams;

  const runs = await PayrollRun.find().sort({ year: -1, month: -1 }).limit(12).lean();
  const staffCount = await Staff.countDocuments({ active: true });
  const selected = sp.run
    ? runs.find((r) => String(r._id) === sp.run)
    : runs[0];
  const detail = selected ? await payrollRunDetail(selected.month, selected.year) : null;

  return (
    <div>
      <PageHeader title="Payroll" subtitle={`${staffCount} staff · staff salary processing and payslip generation`} />

      <CreateRunForm />

      {runs.length > 1 && (
        <div className="my-4 flex flex-wrap gap-2">
          {runs.map((r) => (
            <Link
              key={String(r._id)}
              href={`/accounts/payroll?run=${r._id}`}
              className={`rounded border px-3 py-1.5 text-[13px] ${
                String(r._id) === String(selected?._id) ? "border-accent bg-accent-50" : "border-line hover:bg-panel"
              }`}
            >
              {monthLabel(r.month, r.year)}
            </Link>
          ))}
        </div>
      )}

      {detail ? (
        <PayrollTable
          runId={String(detail.run._id)}
          month={monthLabel(detail.run.month, detail.run.year)}
          status={detail.run.status}
          slips={detail.payslips.map((p) => {
            const st = p.staff as unknown as { name: string; designation: string };
            return {
              id: String(p._id),
              staff: st?.name ?? "—",
              designation: st?.designation ?? "—",
              gross: p.gross,
              net: p.net,
              lopDays: p.lopDays,
              status: p.status,
            };
          })}
        />
      ) : (
        <Panel className="mt-4">
          <EmptyState title="No payroll run yet" hint="Create a run for the current month to generate draft payslips." />
        </Panel>
      )}
    </div>
  );
}
