"use client";

import { useActionState } from "react";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/form";
import { matchBkashTxn } from "@/lib/actions/payments";
import type { ActionState } from "@/lib/actions/_common";

export function MatchButton({ paymentID }: { paymentID: string }) {
  const [state, action] = useActionState<ActionState, FormData>(matchBkashTxn, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="paymentID" value={paymentID} />
      <SubmitButton size="sm" variant="secondary">Match &amp; receipt</SubmitButton>
      <FormMessage result={state} />
    </form>
  );
}
