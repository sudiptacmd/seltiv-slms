import { requireRole } from "@/lib/session";
import { PortalShell } from "@/components/shell/PortalShell";

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("parent");
  return (
    <PortalShell role="parent" user={user}>
      {children}
    </PortalShell>
  );
}
