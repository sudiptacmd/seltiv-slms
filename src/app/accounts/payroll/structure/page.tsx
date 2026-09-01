import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Staff, SalaryStructure } from "@/models";
import { taka } from "@/lib/utils";

export const metadata: Metadata = { title: "Salary Structure" };

export default async function SalaryStructurePage() {
  await requireRole("accountant");
  await connectDb();
  const staff = await Staff.find({ active: true }).sort({ name: 1 }).lean();
  const structures = await SalaryStructure.find({ active: true }).lean();
  const sMap = new Map(structures.map((s) => [String(s.staff), s]));

  return (
    <div>
      <PageHeader title="Salary Structure" subtitle="Basic pay, allowances, deductions and provident fund per staff member." />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Staff</TH>
            <TH>Designation</TH>
            <TH align="right">Basic</TH>
            <TH align="right">Allowances</TH>
            <TH align="right">Gross</TH>
            <TH align="right">PF</TH>
            <TH></TH>
          </TableHeadRow>
          <tbody>
            {staff.map((st) => {
              const struct = sMap.get(String(st._id));
              const allow = struct?.components.filter((c) => c.kind === "allowance").reduce((s, c) => s + c.amount, 0) ?? 0;
              const gross = (struct?.basic ?? 0) + allow;
              return (
                <TR key={String(st._id)}>
                  <TD className="font-medium">{st.name}</TD>
                  <TD className="text-muted">{st.designation}</TD>
                  <TD align="right" className="tabular-nums">{struct ? taka(struct.basic) : "—"}</TD>
                  <TD align="right" className="tabular-nums">{struct ? taka(allow) : "—"}</TD>
                  <TD align="right" className="tabular-nums font-medium">{struct ? taka(gross) : "—"}</TD>
                  <TD align="right" className="tabular-nums text-muted">{struct ? `${struct.providentFundPercent}%` : "—"}</TD>
                  <TD>
                    <Link href={`/accounts/payroll/${st._id}`} className="text-[12px] text-accent-700 hover:underline">Details</Link>
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Panel>
    </div>
  );
}
