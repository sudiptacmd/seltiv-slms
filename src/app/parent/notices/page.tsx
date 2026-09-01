import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { NoticeFeed } from "@/components/NoticeFeed";
import { noticesForUser } from "@/lib/notices";

export const metadata: Metadata = { title: "Notices" };

export default async function ParentNoticesPage() {
  const user = await requireRole("parent");
  const notices = await noticesForUser(user);
  return (
    <div>
      <PageHeader title="Notices" subtitle="Announcements from the school for your child's class and the whole school." />
      <NoticeFeed notices={notices} basePath="/parent/notices" />
    </div>
  );
}
