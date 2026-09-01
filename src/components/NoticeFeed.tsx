import Link from "next/link";
import { Panel, Tag, EmptyState } from "@/components/ui/primitives";
import { formatDate } from "@/lib/utils";

type Notice = {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  attachmentUrl?: string;
  publishedAt?: Date;
  channels: string[];
  audienceKind: string;
  read: boolean;
};

export function NoticeFeed({ notices, basePath }: { notices: Notice[]; basePath: string }) {
  if (notices.length === 0) {
    return <EmptyState title="No notices yet" hint="School announcements will show up here." />;
  }
  return (
    <div className="space-y-3">
      {notices.map((n) => (
        <Panel key={n.id} className={n.read ? "" : "border-l-2 border-l-accent"}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`${basePath}/${n.id}`} className="font-serif text-[16px] font-semibold hover:text-accent-700">
                {n.title}
              </Link>
              <p className="mt-1 line-clamp-2 text-[13px] text-muted">{n.body}</p>
            </div>
            {!n.read && <Tag tone="accent">New</Tag>}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            <span>{formatDate(n.publishedAt, "short")}</span>
            {n.channels.includes("sms") && <Tag tone="neutral">SMS</Tag>}
            {n.attachmentUrl && (
              <a href={n.attachmentUrl} target="_blank" className="text-accent-700 hover:underline">
                Attachment
              </a>
            )}
          </div>
        </Panel>
      ))}
    </div>
  );
}
