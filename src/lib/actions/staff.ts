"use server";

import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { Staff, User, SalaryStructure, nextSeq } from "@/models";
import { normalizeMsisdn } from "@/lib/sms-util";
import { recordAudit, diff } from "@/lib/audit";
import { env } from "@/lib/env";
import { guard, revalidate, fd, type ActionState } from "./_common";
import type { Role } from "@/models/types";

export async function saveStaff(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.opt("id");

  const data = {
    name: f.str("name"),
    designation: f.str("designation"),
    type: (f.str("type") === "non_teaching" ? "non_teaching" : "teaching") as "teaching",
    phone: normalizeMsisdn(f.str("phone")),
    email: f.opt("email"),
    gender: f.opt("gender") as "male" | undefined,
    dateOfBirth: f.date("dateOfBirth"),
    dateOfJoining: f.date("dateOfJoining"),
    qualifications: f.opt("qualifications"),
    address: f.opt("address"),
    nid: f.opt("nid"),
  };
  if (!data.name || !data.designation || !data.phone) return { error: "Name, designation and phone are required." };

  if (id) {
    const before = await Staff.findById(id).lean();
    await Staff.findByIdAndUpdate(id, data);
    await recordAudit({ actor: user, action: "staff.update", entity: "Staff", entityId: id, ...diff(before as Record<string, unknown>, data) });
    revalidate("/admin/staff", `/admin/staff/${id}`);
    return { ok: true, message: "Staff updated." };
  }

  const seq = await nextSeq("staff");
  const staff = await Staff.create({ ...data, staffCode: `${env.school.code}-T${String(seq).padStart(3, "0")}`, active: true });

  // optional salary structure
  const basic = f.num("basic");
  if (basic) {
    await SalaryStructure.create({
      staff: staff._id,
      basic,
      components: [
        ...(f.num("houseRent") ? [{ label: "House Rent", kind: "allowance" as const, amount: f.num("houseRent")! }] : []),
        ...(f.num("medical") ? [{ label: "Medical", kind: "allowance" as const, amount: f.num("medical")! }] : []),
      ],
      providentFundPercent: f.num("pf") ?? 0,
      active: true,
    });
  }

  await recordAudit({ actor: user, action: "staff.create", entity: "Staff", entityId: String(staff._id), after: { name: data.name } });
  revalidate("/admin/staff");
  return { ok: true, message: `${staff.name} added (${staff.staffCode}).` };
}

export async function inviteUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const staffId = f.str("staffId");
  const roles = f.all("role") as Role[];
  if (!staffId || roles.length === 0) return { error: "Pick a staff member and at least one role." };

  const staff = await Staff.findById(staffId).lean();
  if (!staff) return { error: "Staff not found." };
  const existing = await User.findOne({ phone: staff.phone });
  if (existing) {
    existing.roles = Array.from(new Set([...existing.roles, ...roles]));
    existing.staff = staff._id;
    await existing.save();
  } else {
    await User.create({
      name: staff.name,
      phone: staff.phone,
      email: staff.email,
      passwordHash: await bcrypt.hash("changeme123", 10),
      roles,
      staff: staff._id,
      mustChangePassword: true,
    });
  }
  await recordAudit({ actor: user, action: "user.invite", entity: "User", entityId: staff.phone, after: { roles } });
  revalidate("/admin/users");
  return { ok: true, message: `Login created for ${staff.name}. Temporary password: changeme123` };
}

export async function setUserActive(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.str("id");
  const active = f.bool("active");
  if (id === user!.id) return { error: "You cannot deactivate your own account." };
  await User.findByIdAndUpdate(id, { active });
  await recordAudit({ actor: user, action: "user.active", entity: "User", entityId: id, after: { active } });
  revalidate("/admin/users");
  return { ok: true, message: active ? "Account activated." : "Account deactivated." };
}

export async function setUserRoles(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const f = fd(form);
  const id = f.str("id");
  const roles = f.all("role") as Role[];
  const before = await User.findById(id).lean();
  await User.findByIdAndUpdate(id, { roles, isClassTeacher: f.bool("isClassTeacher") });
  await recordAudit({
    actor: user,
    action: "user.permission",
    entity: "User",
    entityId: id,
    before: { roles: before?.roles },
    after: { roles },
  });
  revalidate("/admin/users", "/admin/roles");
  return { ok: true, message: "Roles updated." };
}

export async function resetUserPassword(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();
  const id = String(form.get("id") ?? "");
  const temp = "reset" + Math.floor(1000 + Math.random() * 9000);
  await User.findByIdAndUpdate(id, { passwordHash: await bcrypt.hash(temp, 10), mustChangePassword: true, failedLogins: 0, lockedUntil: undefined });
  await recordAudit({ actor: user, action: "user.password_reset", entity: "User", entityId: id });
  revalidate("/admin/users");
  return { ok: true, message: `Temporary password: ${temp} — share it with the user; they must change it on sign-in.` };
}
