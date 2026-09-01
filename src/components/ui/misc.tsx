import Link from "next/link";
import { cn } from "@/lib/utils";

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {it.href ? (
            <Link href={it.href} className="hover:text-accent-700 hover:underline">{it.label}</Link>
          ) : (
            <span className="text-ink">{it.label}</span>
          )}
          {i < items.length - 1 && <span className="text-line-strong">/</span>}
        </span>
      ))}
    </nav>
  );
}

export function Pagination({
  page,
  pageCount,
  makeHref,
}: {
  page: number;
  pageCount: number;
  makeHref: (p: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-[13px]">
      <span className="text-muted">
        Page {page} of {pageCount}
      </span>
      <div className="flex gap-1">
        <Link
          href={makeHref(Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={cn(
            "rounded border border-line px-2.5 py-1",
            page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-panel",
          )}
        >
          Previous
        </Link>
        <Link
          href={makeHref(Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={cn(
            "rounded border border-line px-2.5 py-1",
            page >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-panel",
          )}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: "bg-ok-bg text-ok",
  paid: "bg-ok-bg text-ok",
  present: "bg-ok-bg text-ok",
  verified: "bg-ok-bg text-ok",
  ready: "bg-ok-bg text-ok",
  enrolled: "bg-ok-bg text-ok",
  delivered: "bg-ok-bg text-ok",
  issued: "bg-accent-50 text-accent-900",
  submitted: "bg-accent-50 text-accent-900",
  scheduled: "bg-accent-50 text-accent-900",
  published: "bg-accent-50 text-accent-900",
  partial: "bg-warn-bg text-warn",
  pending: "bg-warn-bg text-warn",
  overdue: "bg-danger-bg text-danger",
  absent: "bg-danger-bg text-danger",
  rejected: "bg-danger-bg text-danger",
  failed: "bg-danger-bg text-danger",
  void: "bg-panel text-muted",
  draft: "bg-panel text-muted",
  closed: "bg-panel text-muted",
  withdrawn: "bg-panel text-muted",
  late: "bg-warn-bg text-warn",
};

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  const tone = STATUS_TONES[key] ?? "bg-panel text-muted";
  return (
    <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium capitalize", tone)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted", className)}>
      {children}
    </h2>
  );
}
