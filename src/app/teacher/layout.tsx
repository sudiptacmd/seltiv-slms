import { requireRole } from "@/lib/session";
import { PortalShell } from "@/components/shell/PortalShell";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("teacher");
  return (
    <PortalShell role="teacher" user={user}>
      {children}
    </PortalShell>
  );
}
