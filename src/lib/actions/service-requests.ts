"use server";

import { connectDb } from "@/lib/db";
import { ServiceRequest, ServiceRequestType, Student, Notification, User, nextSeq } from "@/models";
import { assertChildOfParent } from "@/lib/parent";
import { generateCertificatePdf } from "@/lib/documents";
import { sendSms } from "@/lib/adapters/sms";
import { Guardian } from "@/models";
import { recordAudit } from "@/lib/audit";
import { getCurrentUser } from "@/lib/session";
import { env } from "@/lib/env";
import { guard, revalidate, type ActionState } from "./_common";
import type { ServiceRequestStatus } from "@/models/types";

export async function raiseServiceRequest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.roles.includes("parent")) return { error: "Only guardians can raise requests." };
  await connectDb();

  const typeId = String(form.get("typeId") ?? "");
  const studentId = String(form.get("studentId") ?? "");
  const reason = String(form.get("reason") ?? "").trim();
  if (!typeId || !studentId) return { error: "Pick a request type and child." };
  if (!(await assertChildOfParent(user, studentId))) return { error: "That child is not linked to your account." };

  const type = await ServiceRequestType.findById(typeId).lean();
  if (!type || !type.active) return { error: "That request type is unavailable." };

  const seq = await nextSeq(`sr-${new Date().getFullYear()}`);
  const sr = await ServiceRequest.create({
    requestNo: `SR-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`,
    type: typeId,
    student: studentId,
    requestedBy: user.id,
    reason,
    currentStage: type.stages[0] ?? "Submitted",
    status: "submitted",
    feePaid: type.fee === 0,
    events: [{ at: new Date(), stage: type.stages[0] ?? "Submitted", status: "submitted", note: "Request submitted by guardian.", by: user.id }],
  });

  // notify admins
  const admins = await User.find({ roles: "admin" }).select("_id").lean();
  await Notification.insertMany(
    admins.map((a) => ({ user: a._id, title: `New ${type.name} request`, href: `/admin/service-requests/${sr._id}`, icon: "file" })),
  );

  await recordAudit({ actor: user, action: "service_request.create", entity: "ServiceRequest", entityId: String(sr._id), after: { type: type.name } });
  revalidate("/parent/service-requests", "/admin/service-requests");
  return { ok: true, message: `Request ${sr.requestNo} submitted.` };
}

export async function advanceServiceRequest(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { user, deny } = await guard("admin");
  if (deny) return deny;
  await connectDb();

  const id = String(form.get("id") ?? "");
  const nextStage = String(form.get("stage") ?? "").trim();
  const status = String(form.get("status") ?? "") as ServiceRequestStatus;
  const note = String(form.get("note") ?? "").trim() || undefined;

  const sr = await ServiceRequest.findById(id);
  if (!sr) return { error: "Request not found." };
  const type = await ServiceRequestType.findById(sr.type).lean();

  sr.currentStage = nextStage || sr.currentStage;
  sr.status = status || sr.status;
  sr.events.push({ at: new Date(), stage: sr.currentStage, status: sr.status, note, by: user!.id as never });

  // when it reaches "ready"/"approved", generate the document
  if ((sr.status === "ready" || sr.status === "approved") && !sr.outputUrl && type?.documentType) {
    try {
      sr.outputUrl = await generateCertificatePdf(id);
    } catch {
      /* leave without output; admin can retry */
    }
  }
  await sr.save();

  // notify the guardian
  const student = await Student.findById(sr.student).lean();
  const primary = student?.guardians.find((g) => g.isPrimary) ?? student?.guardians[0];
  if (primary) {
    const guardian = await Guardian.findById(primary.guardian).lean();
    const gUser = await User.findOne({ guardian: primary.guardian });
    if (gUser) {
      await Notification.create({
        user: gUser._id,
        title: `${type?.name ?? "Request"} ${sr.requestNo}: ${sr.status.replace(/_/g, " ")}`,
        href: `/parent/service-requests/${sr._id}`,
        icon: "file",
      });
    }
    if (guardian?.phone && (sr.status === "ready" || sr.status === "rejected")) {
      await sendSms(
        guardian.phone,
        `${env.school.code}: Your ${type?.name ?? "request"} (${sr.requestNo}) is ${sr.status === "ready" ? "ready to collect / download" : "not approved"}.`,
        { purpose: "service_request", relatedId: id },
      );
    }
  }

  await recordAudit({ actor: user, action: "service_request.advance", entity: "ServiceRequest", entityId: id, after: { stage: sr.currentStage, status: sr.status } });
  revalidate("/admin/service-requests", `/admin/service-requests/${id}`, "/parent/service-requests", `/parent/service-requests/${id}`);
  return { ok: true, message: `Moved to "${sr.currentStage}".` };
}
