"use client";

import { useActionState } from "react";
import { Field, Input, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveAcademicYear } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/_common";

export function YearForm() {
  const [state, action] = useActionState<ActionState, FormData>(saveAcademicYear, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Year name" required><Input name="name" placeholder="2027" required /></Field>
      <Field label="Start date" required><Input name="startDate" type="date" required /></Field>
      <Field label="End date" required><Input name="endDate" type="date" required /></Field>
      <Checkbox name="isCurrent" label="Set as current year" />
      <SubmitButton>Save year</SubmitButton>
    </form>
  );
}
