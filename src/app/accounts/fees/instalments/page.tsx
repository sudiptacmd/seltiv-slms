import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Invoice, Student } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { taka, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Instalment Plans" };

export default async function InstalmentsPage() {
  await requireRole("accountant");
  await connectDb();
  const year = await getCurrentYear();
  const invoices = await Invoice.find({
    year: year._id,
    "instalmentPlan.1": { $exists: true },
    status: { $in: ["issued", "overdue", "partial"] },
  })
    .sort({ dueDate: 1 })
    .limit(80)
    .lean();
  const students = await Student.find({ _id: { $in: invoices.map((i) => i.student) } }).select("name studentCode").lean();
  const sMap = new Map(students.map((s) => [String(s._id), s]));

  return (
    <div>
      <PageHeader
        title="Instalment Plans"
        subtitle="Invoices set up to be paid in parts. Plans come from each class's fee plan (default: 2 instalments) and can be tuned there."
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Student</TH>
            <TH>Invoice</TH>
            <TH>Plan</TH>
            <TH align="right">Paid</TH>
            <TH align="right">Remaining</TH>
            <TH></TH>
          </TableHeadRow>
          <tbody>
            {invoices.map((inv) => {
              const s = sMap.get(String(inv.student));
              const plan = inv.instalmentPlan ?? [];
              return (
                <TR key={String(inv._id)}>
                  <TD>{s?.name}</TD>
                  <TD className="text-muted">{inv.title}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {plan.map((ins) => (
                        <span
                          key={ins.number}
                          className={`rounded-sm px-1.5 py-0.5 text-[11px] ${
                            ins.paid ? "bg-ok-bg text-ok" : "bg-panel text-muted"
                          }`}
                        >
                          {taka(ins.amount)} · {formatDate(ins.dueDate, "short")}
                        </span>
                      ))}
                    </div>
                  </TD>
                  <TD align="right" className="tabular-nums">{taka(inv.paidAmount)}</TD>
                  <TD align="right" className="tabular-nums">{taka(inv.netPayable - inv.paidAmount)}</TD>
                  <TD>
                    <Link href={`/accounts/fees/${inv.student}`} className="text-[12px] text-accent-700 hover:underline">Ledger</Link>
                  </TD>
                </TR>
              );
            })}
            {invoices.length === 0 && <TR><TD colSpan={6} className="text-muted">No active instalment plans.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
