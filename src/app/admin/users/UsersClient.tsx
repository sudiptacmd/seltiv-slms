"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, Select, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { Table, TableHeadRow, TH, TR, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/misc";
import { inviteUser, setUserActive, setUserRoles, setUserPermissions, resetUserPassword } from "@/lib/actions/staff";
import { ROLES } from "@/models/types";
import type { ActionState } from "@/lib/actions/_common";

export function InviteForm({ staff }: { staff: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(inviteUser, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <FormMessage result={state} />
      <Field label="Staff member" className="min-w-[240px] flex-1">
        <Select name="staffId" required defaultValue="">
          <option value="" disabled>Select…</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <div className="flex gap-3 pb-2">
        {["admin", "teacher", "accountant"].map((r) => (
          <Checkbox key={r} name="role" value={r} label={r} defaultChecked={r === "teacher"} />
        ))}
      </div>
      <SubmitButton size="sm">Create login</SubmitButton>
    </form>
  );
}

type Row = {
  id: string;
  name: string;
  phone: string;
  roles: string[];
  permissions: string[];
  isClassTeacher: boolean;
  active: boolean;
  kind: string;
  lastLogin: string;
};

export function UsersTable({ users }: { users: Row[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <Table>
      <TableHeadRow>
        <TH>Name</TH>
        <TH>Phone</TH>
        <TH>Roles</TH>
        <TH>Type</TH>
        <TH>Last login</TH>
        <TH>Status</TH>
        <TH align="right"></TH>
      </TableHeadRow>
      <tbody>
        {users.map((u) => (
          <FragmentRow key={u.id} u={u} editing={editing === u.id} onEdit={() => setEditing(editing === u.id ? null : u.id)} />
        ))}
      </tbody>
    </Table>
  );
}

function FragmentRow({ u, editing, onEdit }: { u: Row; editing: boolean; onEdit: () => void }) {
  const [activeState, activeAction] = useActionState<ActionState, FormData>(setUserActive, {});
  const [roleState, roleAction] = useActionState<ActionState, FormData>(setUserRoles, {});
  const [pwState, pwAction] = useActionState<ActionState, FormData>(resetUserPassword, {});
  const [permissionState, permissionAction] = useActionState<ActionState, FormData>(setUserPermissions, {});
  useActionEffect(activeState);
  useActionEffect(roleState);
  useActionEffect(pwState);
  useActionEffect(permissionState);

  return (
    <>
      <TR>
        <TD className="font-medium">{u.name}</TD>
        <TD className="text-muted">{u.phone}</TD>
        <TD className="capitalize">{u.roles.join(", ")}</TD>
        <TD className="capitalize text-muted">{u.kind}</TD>
        <TD className="text-muted">{u.lastLogin}</TD>
        <TD><StatusBadge status={u.active ? "active" : "disabled"} /></TD>
        <TD align="right">
          <div className="flex justify-end gap-2">
            {u.kind === "staff" && (
              <button onClick={onEdit} className="text-[12px] text-accent-700 hover:underline">Roles</button>
            )}
            <form action={pwAction}><input type="hidden" name="id" value={u.id} /><SubmitButton size="sm" variant="ghost">Reset pw</SubmitButton></form>
            <form action={activeAction}>
              <input type="hidden" name="id" value={u.id} />
              <input type="hidden" name="active" value={u.active ? "" : "on"} />
              <SubmitButton size="sm" variant="ghost">{u.active ? "Disable" : "Enable"}</SubmitButton>
            </form>
          </div>
        </TD>
      </TR>
      {(activeState.message || roleState.message || pwState.message || permissionState.message) && (
        <TR><TD colSpan={7} className="bg-panel text-[12px] text-ok">
          {permissionState.message || pwState.message || roleState.message || activeState.message}
        </TD></TR>
      )}
      {editing && (
        <TR>
          <TD colSpan={7} className="bg-panel">
            <form action={roleAction} className="flex flex-wrap items-center gap-3 border-b border-line py-3">
              <input type="hidden" name="id" value={u.id} />
              {ROLES.filter((r) => r !== "parent").map((r) => (
                <Checkbox key={r} name="role" value={r} defaultChecked={u.roles.includes(r)} label={r} />
              ))}
              <Checkbox name="isClassTeacher" defaultChecked={u.isClassTeacher} label="class teacher" />
              <SubmitButton size="sm">Save roles</SubmitButton>
              <Button type="button" size="sm" variant="ghost" onClick={onEdit}>Cancel</Button>
            </form>
            <form action={permissionAction} className="py-3">
              <input type="hidden" name="id" value={u.id} />
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[.06em] text-muted">Per-action access</div>
              <p className="mb-3 text-xs text-muted">Leave all unchecked for role defaults. Selected actions narrow staff access within their role. Administrators retain full access.</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["attendance.take", "Take attendance"],
                  ["marks.post", "Post marks"],
                  ["notice.send", "Send notices"],
                  ["invoice.batch", "Batch invoices"],
                  ["payment.collect", "Collect payment"],
                  ["report.view", "View reports"],
                  ["user.manage", "Manage users"],
                  ["audit.view", "View audit log"],
                ].map(([value, label]) => (
                  <Checkbox key={value} name="permission" value={value} defaultChecked={u.permissions.includes(value)} label={label} />
                ))}
              </div>
              <div className="mt-3"><SubmitButton size="sm">Save action access</SubmitButton></div>
            </form>
          </TD>
        </TR>
      )}
    </>
  );
}
