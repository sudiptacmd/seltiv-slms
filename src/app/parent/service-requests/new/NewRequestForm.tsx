"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Select, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { raiseServiceRequest } from "@/lib/actions/service-requests";
import { taka } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/_common";

export function NewRequestForm({
  types,
  children,
}: {
  types: { id: string; name: string; fee: number; description?: string }[];
  children: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(raiseServiceRequest, {});
  useActionEffect(state, { onOk: () => {} });

  if (state.ok) {
    return (
      <Panel>
        <p className="rounded bg-ok-bg px-3 py-2 text-[13px] text-ok">{state.message}</p>
        <a href="/parent/service-requests" className="mt-3 inline-block text-[13px] font-medium text-accent-700 hover:underline">
          Track my requests →
        </a>
      </Panel>
    );
  }

  return (
    <Panel>
      <FormMessage result={state} />
      <form action={action} className="space-y-3">
        <Field label="Child" required>
          <Select name="studentId" required>
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Request type" required>
          <Select name="typeId" required defaultValue="">
            <option value="" disabled>Select…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.fee > 0 ? ` — ${taka(t.fee)}` : " — free"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason / notes" hint="Helps the office process it faster">
          <Textarea name="reason" rows={3} placeholder="e.g. Family relocating to Dhaka" />
        </Field>
        <p className="text-[12px] text-muted">
          If a fee applies you&apos;ll be asked to pay it before the document is issued.
        </p>
        <SubmitButton>Submit request</SubmitButton>
      </form>
    </Panel>
  );
}
