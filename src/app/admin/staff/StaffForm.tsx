"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea, FormRow, FormActions, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveStaff } from "@/lib/actions/staff";
import type { ActionState } from "@/lib/actions/_common";

type Draft = {
  id?: string;
  name?: string;
  designation?: string;
  type?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  qualifications?: string;
  address?: string;
  nid?: string;
};

export function StaffForm({ draft }: { draft?: Draft }) {
  const [state, action] = useActionState<ActionState, FormData>(saveStaff, {});
  useActionEffect(state);
  const isEdit = Boolean(draft?.id);

  return (
    <form action={action} className="space-y-4">
      <FormMessage result={state} />
      {draft?.id && <input type="hidden" name="id" value={draft.id} />}
      <Panel title="Details">
        <FormRow cols={2}>
          <Field label="Full name" required><Input name="name" defaultValue={draft?.name} required /></Field>
          <Field label="Designation" required><Input name="designation" defaultValue={draft?.designation} placeholder="Assistant Teacher" required /></Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Type">
            <Select name="type" defaultValue={draft?.type ?? "teaching"}>
              <option value="teaching">Teaching</option>
              <option value="non_teaching">Non-teaching</option>
            </Select>
          </Field>
          <Field label="Phone" required><Input name="phone" defaultValue={draft?.phone} placeholder="01800000000" required /></Field>
          <Field label="Email"><Input name="email" type="email" defaultValue={draft?.email} /></Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Gender">
            <Select name="gender" defaultValue={draft?.gender ?? ""}>
              <option value="">—</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Date of birth"><Input name="dateOfBirth" type="date" defaultValue={draft?.dateOfBirth} /></Field>
          <Field label="Date of joining"><Input name="dateOfJoining" type="date" defaultValue={draft?.dateOfJoining} /></Field>
        </FormRow>
        <Field label="Qualifications"><Input name="qualifications" defaultValue={draft?.qualifications} placeholder="B.Sc, B.Ed" /></Field>
        <FormRow cols={2}>
          <Field label="NID"><Input name="nid" defaultValue={draft?.nid} /></Field>
          <Field label="Address"><Input name="address" defaultValue={draft?.address} /></Field>
        </FormRow>
      </Panel>

      {!isEdit && (
        <Panel title="Salary structure (optional)">
          <FormRow cols={2}>
            <Field label="Basic pay"><Input name="basic" type="number" /></Field>
            <Field label="Provident fund %"><Input name="pf" type="number" defaultValue={5} /></Field>
          </FormRow>
          <FormRow cols={2}>
            <Field label="House rent"><Input name="houseRent" type="number" /></Field>
            <Field label="Medical allowance"><Input name="medical" type="number" /></Field>
          </FormRow>
        </Panel>
      )}

      <FormActions>
        <SubmitButton>{isEdit ? "Save changes" : "Add staff"}</SubmitButton>
      </FormActions>
    </form>
  );
}
