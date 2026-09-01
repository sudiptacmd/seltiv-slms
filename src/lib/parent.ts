import "server-only";
import { connectDb } from "./db";
import { Student, Enrollment, Invoice, Notice, Exam } from "@/models";
import { getCurrentYear } from "./queries";
import { getStudentProfile } from "./students";
import type { CurrentUser } from "./session";

export async function parentChildren(user: CurrentUser) {
  await connectDb();
  if (!user.guardianId) return [];
  const year = await getCurrentYear();
  const students = await Student.find({ "guardians.guardian": user.guardianId }).lean();
  const enrs = await Enrollment.find({ student: { $in: students.map((s) => s._id) }, year: year._id })
    .populate("klass", "name")
    .populate("section", "name")
    .lean();
  const map = new Map(enrs.map((e) => [String(e.student), e]));
  return students.map((s) => {
    const e = map.get(String(s._id));
    const k = e?.klass as unknown as { name: string } | undefined;
    const sec = e?.section as unknown as { name: string } | undefined;
    return {
      id: String(s._id),
      name: s.name,
      photoUrl: s.photoUrl,
      klass: k?.name ?? "",
      section: sec?.name ?? "",
      roll: e?.rollNumber ?? null,
    };
  });
}

export async function resolveChild(user: CurrentUser, requested?: string) {
  const children = await parentChildren(user);
  if (children.length === 0) return { child: null, children };
  const child = children.find((c) => c.id === requested) ?? children[0];
  return { child, children };
}

export async function assertChildOfParent(user: CurrentUser, studentId: string) {
  await connectDb();
  if (!user.guardianId) return false;
  const s = await Student.findOne({ _id: studentId, "guardians.guardian": user.guardianId }).select("_id").lean();
  return Boolean(s);
}

export async function parentDashboard(user: CurrentUser, childId: string) {
  await connectDb();
  const year = await getCurrentYear();
  const profile = await getStudentProfile(childId);
  if (!profile) return null;

  const now = new Date();
  const monthPeriod = now.toISOString().slice(0, 7);
  const [thisMonthInv, latestExam, unreadNotices] = await Promise.all([
    Invoice.findOne({ student: childId, period: monthPeriod }).lean(),
    Exam.findOne({ year: year._id, resultPublished: true }).sort({ createdAt: -1 }).lean(),
    Notice.countDocuments({ status: "published", "audience.kind": { $in: ["all", "all_parents"] } }),
  ]);

  // attendance this month
  const monthAtt = profile.invoices; // placeholder — recompute below
  void monthAtt;

  return {
    profile,
    nextDue: profile.nextDue,
    thisMonthInvoice: thisMonthInv,
    latestExam: latestExam ? { name: latestExam.name, id: String(latestExam._id) } : null,
    unreadNotices,
  };
}
