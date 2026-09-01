import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDb } from "@/lib/db";
import { Notice } from "@/models";
import { noticesForUser, markNoticeRead } from "@/lib/notices";
import { Panel, Tag } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";
import type { CurrentUser } from "@/lib/session";

export async function NoticeDetail({
  id,
  user,
  backHref,
}: {
  id: string;
  user: CurrentUser;
  backHref: string;
}) {
  await connectDb();
  // audience check via the same resolver the feed uses
  const visible = await noticesForUser(user, 200);
  if (!visible.some((n) => n.id === id)) notFound();

  const notice = await Notice.findById(id).lean();
  if (!notice) notFound();
  await markNoticeRead(id, user);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={backHref} className="mb-3 inline-block text-[12px] text-accent-700 hover:underline">
        ← All notices
      </Link>
      <Panel>
        <h1 className="font-serif text-[22px] font-semibold tracking-tight">{notice.title}</h1>
        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted">
          <span>{formatDate(notice.publishedAt)}</span>
          {notice.channels.includes("sms") && <Tag tone="neutral">Also sent by SMS</Tag>}
        </div>
        {notice.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={notice.imageUrl} alt="" className="mt-3 max-h-80 rounded object-cover" />
        )}
        <div className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed">{notice.body}</div>
        {notice.attachmentUrl && (
          <a
            href={notice.attachmentUrl}
            target="_blank"
            className="mt-4 inline-flex rounded border border-line px-3 py-1.5 text-[13px] text-accent-700 hover:bg-panel"
          >
            Download attachment
          </a>
        )}
      </Panel>
    </div>
  );
}
