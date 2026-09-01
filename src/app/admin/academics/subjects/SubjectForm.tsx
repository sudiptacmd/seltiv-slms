"use client";

import { useActionState } from "react";
import { Field, Input, Select, FormRow, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveSubject } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/_common";

export function SubjectForm({ classes }: { classes: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSubject, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Class" required>
        <Select name="classId" required defaultValue="">
          <option value="" disabled>Select…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <FormRow cols={2}>
        <Field label="Subject name" required><Input name="name" required /></Field>
        <Field label="Code" required><Input name="code" placeholder="MATH" required /></Field>
      </FormRow>
      <FormRow cols={2}>
        <Field label="Full marks"><Input name="fullMarks" type="number" defaultValue={100} /></Field>
        <Field label="Pass marks"><Input name="passMarks" type="number" defaultValue={33} /></Field>
      </FormRow>
      <SubmitButton>Add subject</SubmitButton>
    </form>
  );
}
