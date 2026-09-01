import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Invoice } from "@/models";
import { getCurrentYear, todayStr } from "@/lib/queries";
import { taka } from "@/lib/utils";
import { InvoiceRunForm } from "./InvoiceRunForm";

export const metadata: Metadata = { title: "Invoice Runs" };

export default async function InvoiceRunsPage() {
  await requireRole("accountant");
  await connectDb();
  const year = await getCurrentYear();

  const agg = await Invoice.aggregate<{
    _id: string;
    count: number;
    billed: number;
    collected: number;
  }>([
    { $match: { year: year._id, status: { $ne: "void" } } },
    {
      $group: {
        _id: "$period",
        count: { $sum: 1 },
        billed: { $sum: "$netPayable" },
        collected: { $sum: "$paidAmount" },
      },
    },
    { $sort: { _id: -1 } },
  ]);

  const nextMonth = (() => {
    const [y, m] = todayStr().slice(0, 7).split("-").map(Number);
    const d = new Date(y, m, 1); // m is 0-indexed here, so this is next month
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div>
      <PageHeader title="Invoice Runs" subtitle={`Academic year ${year.name}`} />
      <InvoiceRunForm defaultPeriod={nextMonth} />

      <Panel title="Runs so far" className="mt-4" bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Period</TH>
            <TH align="center">Invoices</TH>
            <TH align="right">Billed</TH>
            <TH align="right">Collected</TH>
            <TH align="right">Rate</TH>
          </TableHeadRow>
          <tbody>
            {agg.map((row) => (
              <TR key={row._id}>
                <TD>{new Date(row._id + "-01").toLocaleString("en", { month: "long", year: "numeric" })}</TD>
                <TD align="center" className="tabular-nums">{row.count}</TD>
                <TD align="right" className="tabular-nums">{taka(row.billed)}</TD>
                <TD align="right" className="tabular-nums">{taka(row.collected)}</TD>
                <TD align="right" className="tabular-nums">{row.billed ? Math.round((row.collected / row.billed) * 100) : 0}%</TD>
              </TR>
            ))}
            {agg.length === 0 && <TR><TD colSpan={5} className="text-muted">No invoices generated yet.</TD></TR>}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
