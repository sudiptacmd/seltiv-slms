"use client";

import { useActionState } from "react";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { createPayrollRun } from "@/lib/actions/payroll";
import type { ActionState } from "@/lib/actions/_common";

export function CreateRunForm() {
  const [state, action] = useActionState<ActionState, FormData>(createPayrollRun, {});
  useActionEffect(state);
  const now = new Date();

  return (
    <div className="rounded border border-line bg-surface p-3">
      <FormMessage result={state} />
      <form action={action} className="flex flex-wrap items-end gap-3">
        <Field label="Month" className="w-32">
          <Input name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} required />
        </Field>
        <Field label="Year" className="w-28">
          <Input name="year" type="number" defaultValue={now.getFullYear()} required />
        </Field>
        <Field label="Working days" className="w-32">
          <Input name="workingDays" type="number" min={1} max={31} defaultValue={26} />
        </Field>
        <SubmitButton>Create / refresh run</SubmitButton>
      </form>
    </div>
  );
}
