import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, LinkButton, Avatar, Tag } from "@/components/ui/primitives";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { FilterBar } from "@/components/FilterBar";
import { connectDb } from "@/lib/db";
import { Staff, User } from "@/models";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRole("admin");
  const sp = await searchParams;
  await connectDb();
  const q: Record<string, unknown> = {};
  if (sp.type) q.type = sp.type;
  if (sp.q) q.name = { $regex: sp.q, $options: "i" };
  const staff = await Staff.find(q).sort({ name: 1 }).lean();
  const users = await User.find({ staff: { $in: staff.map((s) => s._id) } }).select("staff roles active").lean();
  const userMap = new Map(users.map((u) => [String(u.staff), u]));

  return (
    <div>
      <PageHeader
        title="Staff"
        subtitle={`${staff.length} staff members`}
        actions={
          <>
            <Link href="/admin/staff/import" className="rounded border border-line-strong bg-surface px-3 py-1.5 text-[13px] hover:bg-panel">Import</Link>
            <LinkButton href="/admin/staff/new" variant="primary" size="sm">Add staff</LinkButton>
          </>
        }
      />
      <FilterBar
        filters={[
          { type: "search", key: "q", placeholder: "Name…" },
          { type: "select", key: "type", label: "All types", options: [{ value: "teaching", label: "Teaching" }, { value: "non_teaching", label: "Non-teaching" }] },
        ]}
      />
      <Panel bodyClassName="p-0">
        <Table>
          <TableHeadRow>
            <TH>Name</TH>
            <TH>Staff ID</TH>
            <TH>Designation</TH>
            <TH>Phone</TH>
            <TH>Login</TH>
            <TH></TH>
          </TableHeadRow>
          <tbody>
            {staff.map((s) => {
              const u = userMap.get(String(s._id));
              return (
                <TR key={String(s._id)}>
                  <TD>
                    <Link href={`/admin/staff/${s._id}`} className="flex items-center gap-2 hover:text-accent-700">
                      <Avatar name={s.name} src={s.photoUrl} size={24} />
                      <span className="font-medium">{s.name}</span>
                    </Link>
                  </TD>
                  <TD className="tabular-nums text-muted">{s.staffCode}</TD>
                  <TD>{s.designation}</TD>
                  <TD className="text-muted">{s.phone}</TD>
                  <TD>
                    {u ? (
                      u.active ? <Tag tone="ok">{u.roles.join(", ")}</Tag> : <Tag tone="neutral">disabled</Tag>
                    ) : (
                      <span className="text-[11px] text-muted">none</span>
                    )}
                  </TD>
                  <TD>
                    <Link href={`/admin/staff/${s._id}`} className="text-[12px] text-accent-700 hover:underline">View</Link>
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
