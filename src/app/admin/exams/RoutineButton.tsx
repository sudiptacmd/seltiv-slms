"use client";

import { useActionState } from "react";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/form";
import { publishExamRoutine } from "@/lib/actions/exams";
import type { ActionState } from "@/lib/actions/_common";

export function RoutineButton({ examId }: { examId: string }) {
  const [state, action] = useActionState<ActionState, FormData>(publishExamRoutine, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="examId" value={examId} />
      <SubmitButton size="sm" variant="secondary">Publish routine + SMS</SubmitButton>
      <FormMessage result={state} />
    </form>
  );
}
