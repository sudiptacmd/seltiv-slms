"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea, FormRow, FormActions, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveStudent } from "@/lib/actions/students";
import type { ActionState } from "@/lib/actions/_common";

type StudentDraft = {
  id?: string;
  name?: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  religion?: string;
  address?: string;
  birthCertNo?: string;
  photoUrl?: string;
  medicalNotes?: string;
};

export function StudentForm({
  draft,
  sections,
}: {
  draft?: StudentDraft;
  sections: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveStudent, {});
  useActionEffect(state);
  const isEdit = Boolean(draft?.id);

  return (
    <form action={action} className="space-y-4">
      <FormMessage result={state} />
      {draft?.id && <input type="hidden" name="id" value={draft.id} />}

      <Panel title="Student details">
        <FormRow cols={2}>
          <Field label="Full name" required>
            <Input name="name" defaultValue={draft?.name} required />
          </Field>
          <Field label="Gender" required>
            <Select name="gender" defaultValue={draft?.gender ?? ""} required>
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Date of birth"><Input name="dateOfBirth" type="date" defaultValue={draft?.dateOfBirth} /></Field>
          <Field label="Blood group"><Input name="bloodGroup" defaultValue={draft?.bloodGroup} placeholder="O+" /></Field>
          <Field label="Religion"><Input name="religion" defaultValue={draft?.religion} /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Birth certificate no."><Input name="birthCertNo" defaultValue={draft?.birthCertNo} /></Field>
          <Field label="Photo URL" hint="Upload UI comes later; paste a URL for now">
            <Input name="photoUrl" defaultValue={draft?.photoUrl} />
          </Field>
        </FormRow>
        <Field label="Address"><Textarea name="address" defaultValue={draft?.address} rows={2} /></Field>
        <Field label="Medical notes"><Textarea name="medicalNotes" defaultValue={draft?.medicalNotes} rows={2} /></Field>
      </Panel>

      {!isEdit && (
        <>
          <Panel title="Enrollment">
            <FormRow cols={2}>
              <Field label="Section" required>
                <Select name="sectionId" required>
                  <option value="">Select…</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Roll number" required>
                <Input name="rollNumber" type="number" min={1} required />
              </Field>
            </FormRow>
            <Field label="Admission date">
              <Input name="admissionDate" type="date" />
            </Field>
          </Panel>

          <Panel title="Primary guardian">
            <FormRow cols={2}>
              <Field label="Guardian name"><Input name="guardianName" /></Field>
              <Field label="Relation">
                <Select name="guardianRelation" defaultValue="father">
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                </Select>
              </Field>
            </FormRow>
            <FormRow cols={2}>
              <Field label="Phone" hint="Becomes the parent's login">
                <Input name="guardianPhone" placeholder="01700000000" />
              </Field>
              <Field label="Occupation"><Input name="guardianOccupation" /></Field>
            </FormRow>
          </Panel>
        </>
      )}

      <FormActions>
        <SubmitButton>{isEdit ? "Save changes" : "Create student"}</SubmitButton>
      </FormActions>
    </form>
  );
}
