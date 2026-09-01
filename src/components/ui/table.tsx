import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full text-[13px]", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead>{children}</thead>;
}

export function TR({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-line last:border-0", className)} {...props}>
      {children}
    </tr>
  );
}

export function TH({ children, className, align }: { children?: React.ReactNode; className?: string; align?: "right" | "center" }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TD({
  children,
  className,
  align,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-3 py-2 align-middle text-ink",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export function TableHeadRow({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line-strong">
      <tr>{children}</tr>
    </thead>
  );
}
