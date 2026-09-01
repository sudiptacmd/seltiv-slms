"use client";

import { useActionState } from "react";
import { Field, Input, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveNoticeTemplate } from "@/lib/actions/notices";
import type { ActionState } from "@/lib/actions/_common";

export function TemplateForm() {
  const [state, action] = useActionState<ActionState, FormData>(saveNoticeTemplate, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Title" required><Input name="title" placeholder="Fee reminder" required /></Field>
      <Field label="Body" required><Textarea name="body" rows={4} required /></Field>
      <SubmitButton>Save template</SubmitButton>
    </form>
  );
}
