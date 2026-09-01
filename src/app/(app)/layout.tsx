import { requireUser } from "@/lib/session";
import { PortalShell } from "@/components/shell/PortalShell";

/** Shared shell for cross-role pages (/profile, /settings, /notifications). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <PortalShell role={user.primaryRole} user={user}>
      {children}
    </PortalShell>
  );
}
