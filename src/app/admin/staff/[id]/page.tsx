import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, DataRow, Avatar } from "@/components/ui/primitives";
import { Breadcrumbs, StatusBadge } from "@/components/ui/misc";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { connectDb } from "@/lib/db";
import { Staff, SalaryStructure, Payslip, User, SubjectAssignment } from "@/models";
import { getCurrentYear } from "@/lib/queries";
import { taka, monthLabel, formatDate } from "@/lib/utils";
import { StaffForm } from "../StaffForm";

export const metadata: Metadata = { title: "Staff profile" };

export default async function StaffProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const { edit } = await searchParams;
  await connectDb();
  const year = await getCurrentYear();
  const [staff, structure, payslips, account, assignments] = await Promise.all([
    Staff.findById(id).populate("subjects", "name").lean(),
    SalaryStructure.findOne({ staff: id, active: true }).lean(),
    Payslip.find({ staff: id }).sort({ year: -1, month: -1 }).lean(),
    User.findOne({ staff: id }).lean(),
    SubjectAssignment.find({ teacher: id, year: year._id })
      .populate("subject", "name")
      .populate({ path: "section", populate: { path: "klass", select: "name" } })
      .lean(),
  ]);
  if (!staff) notFound();

  if (edit) {
    return (
      <div className="max-w-3xl">
        <Breadcrumbs items={[{ label: "Staff", href: "/admin/staff" }, { label: staff.name, href: `/admin/staff/${id}` }, { label: "Edit" }]} />
        <PageHeader title={`Edit — ${staff.name}`} />
        <StaffForm
          draft={{
            id,
            name: staff.name,
            designation: staff.designation,
            type: staff.type,
            phone: staff.phone,
            email: staff.email,
            gender: staff.gender,
            dateOfBirth: staff.dateOfBirth ? formatDate(staff.dateOfBirth, "iso") : undefined,
            dateOfJoining: staff.dateOfJoining ? formatDate(staff.dateOfJoining, "iso") : undefined,
            qualifications: staff.qualifications,
            address: staff.address,
            nid: staff.nid,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Breadcrumbs items={[{ label: "Staff", href: "/admin/staff" }, { label: staff.name }]} />
        <Link href={`/admin/staff/${id}?edit=1`} className="rounded border border-line-strong bg-surface px-3 py-1.5 text-[13px] hover:bg-panel">Edit</Link>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={staff.name} src={staff.photoUrl} size={48} />
        <div>
          <h1 className="font-serif text-[22px] font-semibold">{staff.name}</h1>
          <p className="text-[13px] text-muted">{staff.staffCode} · {staff.designation}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Panel title="Employment">
            <DataRow k="Type">{staff.type.replace("_", "-")}</DataRow>
            <DataRow k="Phone">{staff.phone}</DataRow>
            <DataRow k="Email">{staff.email ?? "—"}</DataRow>
            <DataRow k="Joined">{formatDate(staff.dateOfJoining, "short")}</DataRow>
            <DataRow k="Qualifications">{staff.qualifications ?? "—"}</DataRow>
            <DataRow k="Login">{account ? (account.active ? account.roles.join(", ") : "disabled") : "none"}</DataRow>
          </Panel>
          {structure && (
            <Panel title="Salary">
              <DataRow k="Basic">{taka(structure.basic)}</DataRow>
              {structure.components.map((c, i) => (
                <DataRow key={i} k={c.label}>{c.kind === "deduction" ? "− " : ""}{taka(c.amount)}</DataRow>
              ))}
              <DataRow k="PF">{structure.providentFundPercent}%</DataRow>
            </Panel>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Panel title="Teaching assignments">
            {assignments.length === 0 ? (
              <p className="text-[13px] text-muted">No assignments this year.</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-[13px]">
                {assignments.map((a, i) => {
                  const sec = a.section as unknown as { name: string; klass: { name: string } };
                  return (
                    <li key={i} className="rounded border border-line px-2.5 py-1">
                      {sec?.klass?.name} {sec?.name} · {(a.subject as unknown as { name: string })?.name}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Payslips" bodyClassName="p-0">
            <Table>
              <TableHeadRow><TH>Month</TH><TH align="right">Net</TH><TH>Status</TH><TH></TH></TableHeadRow>
              <tbody>
                {payslips.map((p) => (
                  <TR key={String(p._id)}>
                    <TD>{monthLabel(p.month, p.year)}</TD>
                    <TD align="right" className="tabular-nums">{taka(p.net)}</TD>
                    <TD><StatusBadge status={p.status} /></TD>
                    <TD>{p.status === "paid" && <a href={`/print/payslip/${p._id}`} target="_blank" className="text-[12px] text-accent-700 hover:underline">PDF</a>}</TD>
                  </TR>
                ))}
                {payslips.length === 0 && <TR><TD colSpan={4} className="text-muted">No payslips.</TD></TR>}
              </tbody>
            </Table>
          </Panel>
        </div>
      </div>
    </div>
  );
}
