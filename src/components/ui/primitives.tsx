import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ───────────────────────────── Button ───────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const btnBase =
  "inline-flex items-center justify-center gap-1.5 rounded font-medium whitespace-nowrap transition-colors disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2";
const btnVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-600 active:bg-accent-700",
  secondary: "border border-line-strong bg-surface text-ink hover:bg-panel",
  ghost: "text-accent-700 hover:bg-accent-50",
  danger: "bg-danger text-white hover:opacity-90",
};
const btnSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-[13px]",
  md: "h-9 px-3.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />;
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={cn(btnBase, btnVariants[variant], btnSizes[size], className)} {...props} />;
}

/* ───────────────────────────── Card / Panel ───────────────────────────── */

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded border border-line bg-surface shadow-card", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{title}</h3>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ───────────────────────────── Stat tile ───────────────────────────── */

export function StatTile({
  value,
  label,
  hint,
  tone = "ink",
}: {
  value: React.ReactNode;
  label: string;
  hint?: string;
  tone?: "ink" | "accent" | "ok" | "warn" | "danger";
}) {
  const toneClass = {
    ink: "text-ink",
    accent: "text-accent-700",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded border border-line bg-surface px-4 py-3 shadow-card">
      <div className={cn("font-serif text-[28px] leading-none tracking-tight", toneClass)}>{value}</div>
      <div className="mt-1.5 text-[12px] text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted/80">{hint}</div>}
    </div>
  );
}

/* ───────────────────────────── Tag ───────────────────────────── */

type TagTone = "accent" | "accent2" | "neutral" | "ok" | "warn" | "danger";
const tagTones: Record<TagTone, string> = {
  accent: "bg-accent-50 text-accent-900",
  accent2: "bg-accent2-50 text-accent2-900",
  neutral: "bg-panel text-muted",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-bg text-danger",
};

export function Tag({ tone = "neutral", children, className }: { tone?: TagTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium leading-4",
        tagTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ───────────────────────────── Page header ───────────────────────────── */

export function PageHeader({
  title,
  subtitle,
  actions,
  children,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-[26px] leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-[13px] text-muted">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────────── Empty state ───────────────────────────── */

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
      <p className="font-serif text-[15px] text-ink">{title}</p>
      {hint && <p className="max-w-sm text-[12px] text-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ───────────────────────────── Avatar ───────────────────────────── */

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const inits = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    src ? (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    ) : (
      <span
        className="inline-flex items-center justify-center rounded-full bg-accent-50 font-serif text-accent-900"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {inits}
      </span>
    )
  );
}

/* ───────────────────────────── Key/value rows (like .ui-row) ───────────────────────────── */

export function DataRow({ k, children }: { k: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 text-[13px] last:border-0">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{children}</span>
    </div>
  );
}
