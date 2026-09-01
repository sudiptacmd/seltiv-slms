"use client";

import { useActionState } from "react";
import { Field, Select, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { advanceServiceRequest } from "@/lib/actions/service-requests";
import { SR_STATUS } from "@/models/types";
import type { ActionState } from "@/lib/actions/_common";

export function ProcessRequest({
  id,
  stages,
  currentStage,
  hasTemplate,
}: {
  id: string;
  stages: string[];
  currentStage: string;
  hasTemplate: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(advanceServiceRequest, {});
  useActionEffect(state);
  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Move to stage">
          <Select name="stage" defaultValue={currentStage}>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Set status">
          <Select name="status" defaultValue="in_review">
            {SR_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Note (shown to the guardian)">
        <Textarea name="note" rows={2} />
      </Field>
      {hasTemplate && (
        <p className="text-[12px] text-muted">
          Setting status to <strong>ready</strong> or <strong>approved</strong> generates the document automatically and SMSes the guardian.
        </p>
      )}
      <SubmitButton>Update request</SubmitButton>
    </form>
  );
}
