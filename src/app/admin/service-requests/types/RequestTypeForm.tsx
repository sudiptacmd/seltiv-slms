"use client";

import { useActionState } from "react";
import { connectAction } from "./action";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import type { ActionState } from "@/lib/actions/_common";

export function RequestTypeForm() {
  const [state, action] = useActionState<ActionState, FormData>(connectAction, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Name" required><Input name="name" placeholder="Character Certificate" required /></Field>
      <Field label="Code" required><Input name="code" placeholder="CHARACTER" required /></Field>
      <Field label="Fee (৳)"><Input name="fee" type="number" defaultValue={0} /></Field>
      <Field label="Stages" hint="Comma-separated, in order">
        <Input name="stages" defaultValue="Submitted, Verification, Head-teacher approval, Ready" />
      </Field>
      <Field label="Document template">
        <Select name="documentType" defaultValue="">
          <option value="">None (manual)</option>
          <option value="transfer_certificate">Transfer certificate</option>
          <option value="testimonial">Testimonial</option>
          <option value="bonafide">Bonafide certificate</option>
        </Select>
      </Field>
      <SubmitButton>Add type</SubmitButton>
    </form>
  );
}
