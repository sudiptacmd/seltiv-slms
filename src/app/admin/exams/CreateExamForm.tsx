"use client";

import { useActionState } from "react";
import { Field, Input, Select, Checkbox, FormRow, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { createExam } from "@/lib/actions/exams";
import type { ActionState } from "@/lib/actions/_common";

export function CreateExamForm({
  terms,
  classes,
}: {
  terms: { id: string; name: string }[];
  classes: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createExam, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <Field label="Exam name" required><Input name="name" placeholder="Annual Examination 2027" required /></Field>
      <Field label="Term" required>
        <Select name="termId" required defaultValue="">
          <option value="" disabled>Select…</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
      </Field>
      <Field label="Assessment type">
        <Select name="markingPeriod" defaultValue="">
          <option value="">Standard (single total)</option><option value="pretest">Pretest</option><option value="test">Test</option><option value="final_term">Final term</option>
        </Select>
        <p className="mt-1 text-[11px] text-muted">Uses the approved marking structure for each subject.</p>
      </Field>
      <FormRow cols={2}>
        <Field label="Start"><Input name="startDate" type="date" /></Field>
        <Field label="End"><Input name="endDate" type="date" /></Field>
      </FormRow>
      <div>
        <p className="mb-1 text-[12px] font-medium text-muted">Classes</p>
        <div className="grid grid-cols-2 gap-1">
          {classes.map((c) => (
            <Checkbox key={c.id} name="classId" value={c.id} label={c.name} />
          ))}
        </div>
      </div>
      <SubmitButton>Create exam</SubmitButton>
    </form>
  );
}
