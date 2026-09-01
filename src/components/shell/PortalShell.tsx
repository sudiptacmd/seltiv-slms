import Link from "next/link";
import { Bell } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "./UserMenu";
import { navForRole, PORTAL_META } from "./nav";
import { env } from "@/lib/env";
import { connectDb } from "@/lib/db";
import { Notification } from "@/models";
import type { CurrentUser } from "@/lib/session";
import type { Role } from "@/models/types";

export async function PortalShell({
  role,
  user,
  children,
}: {
  role: Role;
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const meta = PORTAL_META[role];
  await connectDb();
  const unread = await Notification.countDocuments({ user: user.id, readAt: { $exists: false } });

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar groups={navForRole(role)} portalName={meta.name} schoolCode={env.school.code} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-2 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <div className="truncate font-serif text-[14px] font-semibold text-ink">{env.school.name}</div>
            <div className="text-[11px] text-muted">{env.school.address}</div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className="relative rounded border border-line p-1.5 hover:bg-panel"
              aria-label="Notifications"
            >
              <Bell size={16} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent2 px-1 text-[10px] font-semibold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <UserMenu name={user.personName} role={role} />
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">{children}</main>

        <footer className="border-t border-line px-6 py-3 text-[11px] text-muted">
          {env.school.name} · Seltiv SLMS · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
