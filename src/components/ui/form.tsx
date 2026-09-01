import * as React from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && (
        <span className="mb-1 block text-[12px] font-medium text-muted">
          {label}
          {required && <span className="text-danger"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-danger">{error}</span>}
    </label>
  );
}

const controlBase =
  "w-full rounded border border-line-strong bg-surface px-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus-visible:outline-none disabled:bg-panel disabled:opacity-70";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(controlBase, "h-9", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(controlBase, "min-h-[84px] py-2 leading-relaxed", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(controlBase, "h-9 pr-8", className)} {...props}>
        {children}
      </select>
    );
  },
);

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: React.ReactNode }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-[13px] text-ink", className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded-[2px] border-line-strong text-accent accent-accent focus-visible:outline-2"
        {...props}
      />
      {label}
    </label>
  );
}

export function FormRow({ children, cols = 2 }: { children: React.ReactNode; cols?: 1 | 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-3",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-3",
      )}
    >
      {children}
    </div>
  );
}

export function FormActions({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">{children}</div>;
}

/** Server-action result banner. */
export function FormMessage({ result }: { result?: { ok?: boolean; error?: string; message?: string } | null }) {
  if (!result || (!result.error && !result.message)) return null;
  return (
    <div
      className={cn(
        "mb-3 rounded border px-3 py-2 text-[13px]",
        result.error
          ? "border-danger/30 bg-danger-bg text-danger"
          : "border-ok/30 bg-ok-bg text-ok",
      )}
    >
      {result.error ?? result.message}
    </div>
  );
}
