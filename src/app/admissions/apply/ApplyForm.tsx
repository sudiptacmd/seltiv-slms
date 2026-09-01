"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea, FormRow, FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/action-form";
import { submitApplication } from "@/lib/actions/admissions";
import type { ActionState } from "@/lib/actions/_common";

export function ApplyForm({
  classes,
  requiredDocs,
}: {
  classes: { id: string; name: string }[];
  requiredDocs: string[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(submitApplication, {});

  if (state.ok) {
    return (
      <Panel>
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg text-2xl text-ok">✓</div>
          <h2 className="font-serif text-[18px] font-semibold">Application received</h2>
          <p className="mt-1 text-[13px] text-muted">{state.message}</p>
          <p className="mt-1 text-[12px] text-muted">A confirmation SMS has been sent to your number.</p>
          <Link href="/admissions/status" className="mt-4 inline-block rounded bg-accent px-3.5 py-2 text-[13px] font-medium text-white hover:bg-accent-600">
            Track application
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage result={state} />
      <Panel title="Student details">
        <FormRow cols={2}>
          <Field label="Student's full name" required><Input name="studentName" required /></Field>
          <Field label="Applying for class" required>
            <Select name="klass" required defaultValue="">
              <option value="" disabled>Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Gender">
            <Select name="gender" defaultValue="male"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
          </Field>
          <Field label="Date of birth"><Input name="dateOfBirth" type="date" /></Field>
          <Field label="Religion"><Input name="religion" /></Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Birth certificate no."><Input name="birthCertNo" /></Field>
          <Field label="Address"><Input name="address" /></Field>
        </FormRow>
      </Panel>

      <Panel title="Guardian details">
        <FormRow cols={2}>
          <Field label="Guardian's name" required><Input name="guardianName" required /></Field>
          <Field label="Relation">
            <Select name="guardianRelation" defaultValue="father"><option value="father">Father</option><option value="mother">Mother</option><option value="guardian">Guardian</option></Select>
          </Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Phone" required hint="Used for updates and, on enrolment, your login"><Input name="guardianPhone" placeholder="01700000000" required /></Field>
          <Field label="Email"><Input name="guardianEmail" type="email" /></Field>
        </FormRow>
        <Field label="Occupation"><Input name="guardianOccupation" /></Field>
      </Panel>

      <Panel title="Previous school (if any)">
        <FormRow cols={3}>
          <Field label="School name"><Input name="previousSchool" /></Field>
          <Field label="Last class"><Input name="previousClass" /></Field>
          <Field label="Last result / GPA"><Input name="previousResult" /></Field>
        </FormRow>
      </Panel>

      {requiredDocs.length > 0 && (
        <Panel title="Documents to bring">
          <p className="text-[13px] text-muted">
            Please bring the following to the school office after submitting: {requiredDocs.join(", ")}. Online document upload will be
            enabled shortly.
          </p>
        </Panel>
      )}

      <div className="flex justify-end">
        <SubmitButton>Submit application</SubmitButton>
      </div>
    </form>
  );
}
