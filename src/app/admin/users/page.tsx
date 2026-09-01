import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { User, Staff, Guardian } from "@/models";
import { formatDate } from "@/lib/utils";
import { UsersTable, InviteForm } from "./UsersClient";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  await requireRole("admin");
  await connectDb();
  const [users, staffNoLogin] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(200).lean(),
    Staff.find({ active: true }).lean(),
  ]);
  const linkedStaff = new Set(users.filter((u) => u.staff).map((u) => String(u.staff)));
  const invitable = staffNoLogin.filter((s) => !linkedStaff.has(String(s._id)));

  const staffMap = new Map((await Staff.find({ _id: { $in: users.map((u) => u.staff).filter(Boolean) } }).lean()).map((s) => [String(s._id), s.name]));
  const gMap = new Map((await Guardian.find({ _id: { $in: users.map((u) => u.guardian).filter(Boolean) } }).lean()).map((g) => [String(g._id), g.name]));

  return (
    <div>
      <PageHeader title="Users" subtitle="Login accounts, their roles and status." />
      <Panel title="Create a staff login" className="mb-4">
        <InviteForm staff={invitable.map((s) => ({ id: String(s._id), name: `${s.name} — ${s.designation}` }))} />
      </Panel>

      <Panel bodyClassName="p-0">
        <UsersTable
          users={users.map((u) => ({
            id: String(u._id),
            name: u.staff ? staffMap.get(String(u.staff)) ?? u.name : u.guardian ? gMap.get(String(u.guardian)) ?? u.name : u.name,
            phone: u.phone,
            roles: u.roles,
            isClassTeacher: Boolean(u.isClassTeacher),
            active: u.active,
            kind: u.staff ? "staff" : u.guardian ? "guardian" : "—",
            lastLogin: u.lastLoginAt ? formatDate(u.lastLoginAt, "short") : "never",
          }))}
        />
      </Panel>
    </div>
  );
}
