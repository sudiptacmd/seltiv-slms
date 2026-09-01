"use client";

import { useActionState } from "react";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/form";
import { processExamResults } from "@/lib/actions/exams";
import type { ActionState } from "@/lib/actions/_common";

export function ProcessButtons({ examId, published }: { examId: string; published: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(processExamResults, {});
  useActionEffect(state);
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form action={action}>
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="publish" value="false" />
          <SubmitButton size="sm" variant="secondary">Process (draft)</SubmitButton>
        </form>
        <form action={action}>
          <input type="hidden" name="examId" value={examId} />
          <input type="hidden" name="publish" value="true" />
          <SubmitButton size="sm">{published ? "Re-process & publish" : "Approve & publish"}</SubmitButton>
        </form>
      </div>
      <FormMessage result={state} />
    </div>
  );
}
