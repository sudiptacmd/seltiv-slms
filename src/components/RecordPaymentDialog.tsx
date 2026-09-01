"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { recordCashPayment } from "@/lib/actions/payments";
import { taka } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/_common";

export function RecordPaymentButton({
  invoiceId,
  title,
  remaining,
}: {
  invoiceId: string;
  title: string;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<ActionState, FormData>(recordCashPayment, {});
  useActionEffect(state, { onOk: () => setOpen(false) });

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Record payment
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-lg border border-line bg-surface p-5 shadow-pop" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-1 font-serif text-[16px] font-semibold">Record a payment</h3>
            <p className="mb-3 text-[12px] text-muted">{title} · {taka(remaining)} outstanding</p>
            <FormMessage result={state} />
            <form action={action} className="space-y-3">
              <input type="hidden" name="invoiceId" value={invoiceId} />
              <Field label="Amount" required>
                <Input name="amount" type="number" min={1} max={remaining} defaultValue={remaining} required />
              </Field>
              <Field label="Method">
                <Select name="method" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="bank">Bank deposit</option>
                  <option value="adjustment">Adjustment</option>
                </Select>
              </Field>
              <Field label="Reference (optional)"><Input name="reference" placeholder="Slip / txn no." /></Field>
              <Field label="Note (optional)"><Textarea name="note" rows={2} /></Field>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                <SubmitButton size="sm">Issue receipt</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
