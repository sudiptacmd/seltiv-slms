"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Textarea, Checkbox, FormRow, FormActions, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveAdmissionSession } from "@/lib/actions/admissions";
import type { ActionState } from "@/lib/actions/_common";

type Draft = {
  id?: string;
  name?: string;
  opensAt?: string;
  closesAt?: string;
  isOpen?: boolean;
  applicationFee?: number;
  requiredDocuments?: string;
};

export function SessionForm({ draft }: { draft?: Draft }) {
  const [state, action] = useActionState<ActionState, FormData>(saveAdmissionSession, {});
  useActionEffect(state);

  return (
    <Panel>
      <FormMessage result={state} />
      <form action={action} className="space-y-4">
        {draft?.id && <input type="hidden" name="id" value={draft.id} />}
        <Field label="Session name" required>
          <Input name="name" defaultValue={draft?.name ?? `Admission ${new Date().getFullYear() + 1}`} required />
        </Field>
        <FormRow cols={2}>
          <Field label="Opens" required><Input name="opensAt" type="date" defaultValue={draft?.opensAt} required /></Field>
          <Field label="Closes" required><Input name="closesAt" type="date" defaultValue={draft?.closesAt} required /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Application fee (৳)"><Input name="applicationFee" type="number" defaultValue={draft?.applicationFee ?? 0} /></Field>
          <div className="flex items-end pb-2">
            <Checkbox name="isOpen" defaultChecked={draft?.isOpen ?? true} label="Accept applications now" />
          </div>
        </FormRow>
        <Field label="Required documents" hint="Comma-separated — applicants upload one file per item">
          <Textarea name="requiredDocuments" rows={2} defaultValue={draft?.requiredDocuments ?? "Birth Certificate, Previous Marksheet, Passport-size Photo, Guardian NID"} />
        </Field>
        <FormActions>
          <SubmitButton>Save session</SubmitButton>
        </FormActions>
      </form>
    </Panel>
  );
}
