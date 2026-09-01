import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { connectDb } from "@/lib/db";
import { Staff } from "@/models";
import { staffPayslips } from "@/lib/payroll";
import { taka, monthLabel, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Profile" };

export default async function TeacherProfilePage() {
  const user = await requireRole("teacher");
  await connectDb();
  const staff = await Staff.findById(user.staffId).populate("subjects", "name").lean();
  const payslips = await staffPayslips(user.staffId!);

  return (
    <div>
      <PageHeader title="My Profile" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Details">
          <DataRow k="Name">{staff?.name}</DataRow>
          <DataRow k="Staff ID">{staff?.staffCode}</DataRow>
          <DataRow k="Designation">{staff?.designation}</DataRow>
          <DataRow k="Phone">{staff?.phone}</DataRow>
          <DataRow k="Email">{staff?.email ?? "—"}</DataRow>
          <DataRow k="Joined">{formatDate(staff?.dateOfJoining, "short")}</DataRow>
          <DataRow k="Subjects">
            {(staff?.subjects as unknown as { name: string }[] | undefined)?.map((s) => s.name).join(", ") || "—"}
          </DataRow>
        </Panel>

        <Panel title="My payslips" bodyClassName="p-0">
          <Table>
            <TableHeadRow>
              <TH>Month</TH>
              <TH align="right">Net</TH>
              <TH>Status</TH>
              <TH align="right"></TH>
            </TableHeadRow>
            <tbody>
              {payslips.map((p) => (
                <TR key={String(p._id)}>
                  <TD>{monthLabel(p.month, p.year)}</TD>
                  <TD align="right" className="tabular-nums">{taka(p.net)}</TD>
                  <TD><StatusBadge status={p.status} /></TD>
                  <TD align="right">
                    {p.status === "paid" ? (
                      <a href={`/print/payslip/${p._id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">
                        Payslip
                      </a>
                    ) : (
                      <span className="text-[12px] text-muted">Pending</span>
                    )}
                  </TD>
                </TR>
              ))}
              {payslips.length === 0 && (
                <TR><TD colSpan={4} className="text-muted">No payslips yet.</TD></TR>
              )}
            </tbody>
          </Table>
        </Panel>
      </div>
    </div>
  );
}
