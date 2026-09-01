"use client";

import { useActionState } from "react";
import { Field, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveNotificationTemplates } from "@/lib/actions/school-settings";
import type { ActionState } from "@/lib/actions/_common";

export function TemplatesForm({ absence, reminder }: { absence: string; reminder: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveNotificationTemplates, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Absence alert"><Textarea name="absenceSmsTemplate" rows={3} defaultValue={absence} /></Field>
      <Field label="Fee reminder"><Textarea name="feeReminderSmsTemplate" rows={3} defaultValue={reminder} /></Field>
      <SubmitButton>Save templates</SubmitButton>
    </form>
  );
}
