import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { NoticeFeed } from "@/components/NoticeFeed";
import { noticesForUser } from "@/lib/notices";

export const metadata: Metadata = { title: "Notices" };

export default async function TeacherNoticesPage() {
  const user = await requireRole("teacher");
  const notices = await noticesForUser(user);
  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements for staff and the whole school." />
      <NoticeFeed notices={notices} basePath="/teacher/notices" />
    </div>
  );
}
