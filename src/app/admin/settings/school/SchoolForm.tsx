"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Textarea, FormRow, FormActions, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveSchoolSettings } from "@/lib/actions/school-settings";
import type { ActionState } from "@/lib/actions/_common";

type Draft = {
  schoolName?: string;
  headTeacher?: string;
  address?: string;
  eiin?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
};

export function SchoolForm({ draft }: { draft: Draft }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSchoolSettings, {});
  useActionEffect(state);
  return (
    <Panel>
      <FormMessage result={state} />
      <form action={action} className="space-y-3">
        <FormRow cols={2}>
          <Field label="School name"><Input name="schoolName" defaultValue={draft.schoolName} /></Field>
          <Field label="Head teacher"><Input name="headTeacher" defaultValue={draft.headTeacher} /></Field>
        </FormRow>
        <Field label="Address"><Textarea name="address" rows={2} defaultValue={draft.address} /></Field>
        <FormRow cols={3}>
          <Field label="EIIN"><Input name="eiin" defaultValue={draft.eiin} /></Field>
          <Field label="Phone"><Input name="phone" defaultValue={draft.phone} /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={draft.email} /></Field>
        </FormRow>
        <Field label="Logo URL"><Input name="logoUrl" defaultValue={draft.logoUrl} /></Field>
        <FormActions><SubmitButton>Save details</SubmitButton></FormActions>
      </form>
    </Panel>
  );
}
