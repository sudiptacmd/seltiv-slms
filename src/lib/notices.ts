import "server-only";
import { connectDb } from "./db";
import { Notice, NoticeRecipient, Enrollment, Student } from "@/models";
import { getCurrentYear } from "./queries";
import type { CurrentUser } from "./session";

/** Notices visible to a given user (audience match), newest first. */
export async function noticesForUser(user: CurrentUser, limit = 30) {
  await connectDb();
  const year = await getCurrentYear();

  const or: Record<string, unknown>[] = [{ "audience.kind": "all" }];

  if (user.roles.includes("teacher") || user.roles.includes("admin")) {
    or.push({ "audience.kind": "all_teachers" });
  }

  let studentIds: string[] = [];
  let sectionIds: string[] = [];
  let classIds: string[] = [];
  if (user.guardianId) {
    const students = await Student.find({ "guardians.guardian": user.guardianId }).select("_id").lean();
    studentIds = students.map((s) => String(s._id));
    const enrs = await Enrollment.find({ student: { $in: studentIds }, year: year._id }).select("section klass").lean();
    sectionIds = enrs.map((e) => String(e.section));
    classIds = enrs.map((e) => String(e.klass));
    or.push({ "audience.kind": "all_parents" });
    if (sectionIds.length) or.push({ "audience.kind": "section", "audience.section": { $in: sectionIds } });
    if (classIds.length) or.push({ "audience.kind": "class", "audience.klass": { $in: classIds } });
    or.push({ "audience.kind": "individuals", "audience.studentIds": { $in: studentIds } });
  }

  const notices = await Notice.find({ status: "published", $or: or })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .lean();

  const reads = await NoticeRecipient.find({
    notice: { $in: notices.map((n) => n._id) },
    user: user.id,
  })
    .select("notice readAt")
    .lean();
  const readMap = new Map(reads.map((r) => [String(r.notice), r.readAt]));

  return notices.map((n) => ({
    id: String(n._id),
    title: n.title,
    body: n.body,
    imageUrl: n.imageUrl,
    attachmentUrl: n.attachmentUrl,
    publishedAt: n.publishedAt,
    channels: n.channels,
    audienceKind: n.audience.kind,
    read: readMap.has(String(n._id)) ? Boolean(readMap.get(String(n._id))) : false,
  }));
}

export async function markNoticeRead(noticeId: string, user: CurrentUser) {
  await connectDb();
  await NoticeRecipient.findOneAndUpdate(
    { notice: noticeId, user: user.id },
    { $setOnInsert: { notice: noticeId, user: user.id }, readAt: new Date() },
    { upsert: true },
  );
}

export async function unreadNoticeCount(user: CurrentUser) {
  const list = await noticesForUser(user, 50);
  return list.filter((n) => !n.read).length;
}
