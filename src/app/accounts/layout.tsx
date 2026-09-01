import { requireRole } from "@/lib/session";
import { PortalShell } from "@/components/shell/PortalShell";

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("accountant");
  return (
    <PortalShell role="accountant" user={user}>
      {children}
    </PortalShell>
  );
}
