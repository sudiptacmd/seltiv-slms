import { requireRole } from "@/lib/session";
import { PortalShell } from "@/components/shell/PortalShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");
  return (
    <PortalShell role="admin" user={user}>
      {children}
    </PortalShell>
  );
}
