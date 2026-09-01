"use client";

import { useActionState } from "react";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { toggleMarkLock } from "@/lib/actions/exams";
import type { ActionState } from "@/lib/actions/_common";

export function LockButton({ id, locked }: { id: string; locked: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(toggleMarkLock, {});
  useActionEffect(state);
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton size="sm" variant="ghost">{locked ? "Unlock" : "Lock"}</SubmitButton>
    </form>
  );
}
