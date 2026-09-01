"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveFeeHead, saveFeePlan } from "@/lib/actions/fee-structure";
import type { ActionState } from "@/lib/actions/_common";

export function FeeHeadForm() {
  const [state, action] = useActionState<ActionState, FormData>(saveFeeHead, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <FormMessage result={state} />
      <Field label="Name" className="w-36"><Input name="name" placeholder="Transport" required /></Field>
      <Field label="Code" className="w-24"><Input name="code" placeholder="TRANSPORT" required /></Field>
      <Checkbox name="recurring" label="Monthly" defaultChecked />
      <SubmitButton size="sm">Add</SubmitButton>
    </form>
  );
}

type Plan = {
  items: { headId: string; amount: number }[];
  instalments: number;
  lateFeeRule: string;
  lateFeeValue: number;
  graceDays: number;
  dueDayOfMonth: number;
};

export function FeePlanEditor({
  classId,
  className,
  heads,
  plan,
}: {
  classId: string;
  className: string;
  heads: { id: string; name: string }[];
  plan: Plan | null;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveFeePlan, {});
  useActionEffect(state);
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(heads.map((h) => [h.id, String(plan?.items.find((it) => it.headId === h.id)?.amount ?? "")])),
  );

  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="className" value={className} />
      <div className="grid gap-2 sm:grid-cols-2">
        {heads.map((h) => (
          <div key={h.id} className="flex items-center gap-2">
            <input type="hidden" name="headId" value={h.id} />
            <label className="flex-1 text-[13px]">{h.name}</label>
            <input
              name="amount"
              type="number"
              value={amounts[h.id] ?? ""}
              onChange={(e) => setAmounts((a) => ({ ...a, [h.id]: e.target.value }))}
              placeholder="0"
              className="h-8 w-28 rounded border border-line-strong px-2 text-right text-[13px]"
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Instalments"><Input name="instalments" type="number" min={1} defaultValue={plan?.instalments ?? 2} /></Field>
        <Field label="Due day"><Input name="dueDayOfMonth" type="number" min={1} max={28} defaultValue={plan?.dueDayOfMonth ?? 5} /></Field>
        <Field label="Late fee rule">
          <Select name="lateFeeRule" defaultValue={plan?.lateFeeRule ?? "flat"}>
            <option value="none">None</option>
            <option value="flat">Flat</option>
            <option value="per_day">Per day</option>
            <option value="percent">Percent</option>
          </Select>
        </Field>
        <Field label="Late fee value"><Input name="lateFeeValue" type="number" defaultValue={plan?.lateFeeValue ?? 100} /></Field>
      </div>
      <SubmitButton size="sm">Save plan</SubmitButton>
    </form>
  );
}
