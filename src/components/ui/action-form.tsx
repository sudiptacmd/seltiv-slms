"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button } from "./primitives";
import type { ActionState } from "@/lib/actions/_common";

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  disabled,
  onClick,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending || disabled}
      onClick={onClick}
      name={name}
      value={value}
    >
      {pending ? "Working…" : children}
    </Button>
  );
}

/** Navigate when a server action returns `{ redirect }`; refresh on `{ ok }`. */
export function useActionEffect(state: ActionState | undefined, opts: { onOk?: () => void } = {}) {
  const router = useRouter();
  useEffect(() => {
    if (!state) return;
    if (state.redirect) {
      router.push(state.redirect);
      router.refresh();
    } else if (state.ok) {
      opts.onOk?.();
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
}
