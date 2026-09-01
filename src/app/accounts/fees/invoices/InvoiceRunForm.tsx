"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { generateInvoiceRun, applyLateFees } from "@/lib/actions/invoices";
import type { ActionState } from "@/lib/actions/_common";

export function InvoiceRunForm({ defaultPeriod }: { defaultPeriod: string }) {
  const [genState, genAction] = useActionState<ActionState, FormData>(generateInvoiceRun, {});
  const [lateState, lateAction] = useActionState<ActionState, FormData>(applyLateFees, {});
  useActionEffect(genState);
  useActionEffect(lateState);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Generate a monthly fee run">
        <FormMessage result={genState} />
        <form action={genAction} className="space-y-3">
          <Field label="Month" required>
            <Input name="period" type="month" defaultValue={defaultPeriod} required />
          </Field>
          <Checkbox name="examFee" label="Also add the exam fee (৳500) this month" />
          <p className="text-[12px] text-muted">
            One tuition invoice per active student, using each class&apos;s fee plan. Students already invoiced for the month are skipped.
          </p>
          <SubmitButton>Generate invoices</SubmitButton>
        </form>
      </Panel>

      <Panel title="Apply late fees">
        <FormMessage result={lateState} />
        <p className="mb-3 text-[13px] text-muted">
          Adds the configured late fee to every unpaid invoice whose grace period has passed.
        </p>
        <form action={lateAction}>
          <SubmitButton variant="secondary">Run late-fee sweep</SubmitButton>
        </form>
      </Panel>
    </div>
  );
}
