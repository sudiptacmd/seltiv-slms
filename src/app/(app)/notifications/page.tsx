import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { PageHeader, Panel, EmptyState } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { Notification } from "@/models";
import { markAllNotificationsRead } from "@/lib/actions/account";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  await connectDb();
  const items = await Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(50).lean();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        actions={
          items.some((i) => !i.readAt) ? (
            <form action={markAllNotificationsRead}>
              <button className="text-[12px] text-accent-700 hover:underline">Mark all read</button>
            </form>
          ) : null
        }
      />
      <Panel bodyClassName="p-0">
        {items.length === 0 ? (
          <div className="p-4"><EmptyState title="Nothing here yet" /></div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={String(n._id)} className={`px-4 py-3 ${n.readAt ? "" : "bg-accent-50/40"}`}>
                {n.href ? (
                  <Link href={n.href} className="text-[13px] font-medium hover:text-accent-700">{n.title}</Link>
                ) : (
                  <span className="text-[13px] font-medium">{n.title}</span>
                )}
                {n.body && <p className="text-[12px] text-muted">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted">{formatDate(n.createdAt, "short")}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
