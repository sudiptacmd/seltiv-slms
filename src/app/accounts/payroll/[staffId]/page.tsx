import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Staff, SalaryStructure, Payslip } from "@/models";
import { taka, monthLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Staff salary" };

export default async function StaffSalaryPage({ params }: { params: Promise<{ staffId: string }> }) {
  await requireRole("accountant");
  const { staffId } = await params;
  await connectDb();
  const [staff, structure, payslips] = await Promise.all([
    Staff.findById(staffId).lean(),
    SalaryStructure.findOne({ staff: staffId, active: true }).lean(),
    Payslip.find({ staff: staffId }).sort({ year: -1, month: -1 }).lean(),
  ]);
  if (!staff) notFound();

  return (
    <div>
      <Breadcrumbs items={[{ label: "Payroll", href: "/accounts/payroll" }, { label: staff.name }]} />
      <PageHeader title={staff.name} subtitle={`${staff.staffCode} · ${staff.designation}`} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Salary structure">
          {structure ? (
            <>
              <DataRow k="Basic">{taka(structure.basic)}</DataRow>
              {structure.components.map((c, i) => (
                <DataRow key={i} k={`${c.label} (${c.kind})`}>{c.kind === "deduction" ? "− " : ""}{taka(c.amount)}</DataRow>
              ))}
              <DataRow k="Provident fund">{structure.providentFundPercent}% of basic</DataRow>
              <DataRow k="Effective from">{formatDate(structure.effectiveFrom, "short")}</DataRow>
            </>
          ) : (
            <p className="text-[13px] text-muted">No salary structure set. Add one under Salary Structure.</p>
          )}
        </Panel>

        <Panel title="Payslip history" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Month</TH>
              <TH align="right">Net</TH>
              <TH>Status</TH>
              <TH></TH>
            </TableHeadRow>
            <tbody>
              {payslips.map((p) => (
                <TR key={String(p._id)}>
                  <TD>{monthLabel(p.month, p.year)}</TD>
                  <TD align="right" className="tabular-nums">{taka(p.net)}</TD>
                  <TD><StatusBadge status={p.status} /></TD>
                  <TD>
                    {p.status === "paid" && (
                      <a href={`/print/payslip/${p._id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">PDF</a>
                    )}
                  </TD>
                </TR>
              ))}
              {payslips.length === 0 && <TR><TD colSpan={4} className="text-muted">No payslips.</TD></TR>}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
