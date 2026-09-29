import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { User } from "@/models";

export const metadata: Metadata = { title: "Roles" };

const CAPABILITIES: { area: string; admin: string; teacher: string; accountant: string; parent: string }[] = [
  { area: "Admissions", admin: "Full", teacher: "—", accountant: "—", parent: "Apply / track" },
  { area: "Students", admin: "Full", teacher: "Read (own sections)", accountant: "Fee ledger", parent: "Own child" },
  { area: "Attendance", admin: "Monitor all", teacher: "Take roll call", accountant: "—", parent: "Own child" },
  { area: "Exams & grades", admin: "Enter grades, process & publish", teacher: "—", accountant: "—", parent: "Published gradesheet" },
  { area: "Fees", admin: "Structure & overview", teacher: "—", accountant: "Collect, invoice, reconcile", parent: "Pay own invoices" },
  { area: "Payroll", admin: "—", teacher: "Own payslips", accountant: "Full", parent: "—" },
  { area: "Notices", admin: "Compose & send", teacher: "Read (+ class notice)", accountant: "—", parent: "Read" },
  { area: "Service requests", admin: "Process", teacher: "—", accountant: "—", parent: "Raise & track" },
  { area: "Settings & users", admin: "Full", teacher: "—", accountant: "—", parent: "—" },
];

export default async function RolesPage() {
  await requireRole("admin");
  await connectDb();
  const counts = await User.aggregate<{ _id: string; n: number }>([
    { $unwind: "$roles" },
    { $group: { _id: "$roles", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id, c.n]));

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        subtitle="What each role can do. Assign roles to individual staff on the Users page."
      />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["admin", "teacher", "accountant", "parent"] as const).map((r) => (
          <div key={r} className="rounded border border-line bg-surface p-3">
            <div className="font-serif text-[20px] font-semibold capitalize">{r}</div>
            <div className="text-[12px] text-muted">{countMap.get(r) ?? 0} accounts</div>
          </div>
        ))}
      </div>

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Area</TH>
            <TH>Admin</TH>
            <TH>Teacher</TH>
            <TH>Accountant</TH>
            <TH>Parent</TH>
          </TableHeadRow>
          <tbody>
            {CAPABILITIES.map((c) => (
              <TR key={c.area}>
                <TD className="font-medium">{c.area}</TD>
                <TD className="text-muted">{c.admin}</TD>
                <TD className="text-muted">{c.teacher}</TD>
                <TD className="text-muted">{c.accountant}</TD>
                <TD className="text-muted">{c.parent}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </Panel>
      <p className="mt-3 text-[12px] text-muted">
        Fine-grained per-action permissions are on the roadmap; today <Link href="/admin/users" className="text-accent-700 hover:underline">Users</Link> controls role membership.
      </p>
    </div>
  );
}
