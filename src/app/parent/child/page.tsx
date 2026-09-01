import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { ChildSwitcher } from "@/components/ChildSwitcher";
import { StudentProfileView } from "@/components/StudentProfileView";
import { resolveChild } from "@/lib/parent";
import { getStudentProfile } from "@/lib/students";

export const metadata: Metadata = { title: "My Child" };

export default async function MyChildPage({ searchParams }: { searchParams: Promise<{ child?: string }> }) {
  const user = await requireRole("parent");
  const { child, children } = await resolveChild(user, (await searchParams).child);
  if (!child) return <EmptyState title="No child linked" />;
  const profile = await getStudentProfile(child.id);
  if (!profile) return <EmptyState title="Record not found" />;

  return (
    <div>
      <PageHeader title="My Child" />
      <ChildSwitcher children={children} activeId={child.id} />
      <StudentProfileView profile={profile} variant="parent" />
    </div>
  );
}
