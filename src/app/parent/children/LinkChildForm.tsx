"use client";

import { useActionState, useState } from "react";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { requestChildLink, confirmChildLink } from "@/lib/actions/link-child";
import type { ActionState } from "@/lib/actions/_common";

export function LinkChildForm() {
  const [reqState, reqAction] = useActionState<ActionState, FormData>(requestChildLink, {});
  const [confState, confAction] = useActionState<ActionState, FormData>(confirmChildLink, {});
  const [code, setCode] = useState("");
  useActionEffect(confState);

  const codeSent = reqState.ok;

  return (
    <div className="space-y-3">
      <FormMessage result={reqState} />
      <form action={reqAction} className="flex items-end gap-2">
        <Field label="Student ID" className="flex-1">
          <Input name="studentCode" value={code} onChange={(e) => setCode(e.target.value)} placeholder="SFHS-2026-1001" required />
        </Field>
        <SubmitButton variant="secondary">{codeSent ? "Resend code" : "Send code"}</SubmitButton>
      </form>

      {codeSent && (
        <>
          <FormMessage result={confState} />
          {!confState.ok && (
            <form action={confAction} className="flex items-end gap-2">
              <input type="hidden" name="studentCode" value={code} />
              <Field label="6-digit code" className="flex-1">
                <Input name="otp" inputMode="numeric" maxLength={6} placeholder="123456" required />
              </Field>
              <SubmitButton>Link child</SubmitButton>
            </form>
          )}
        </>
      )}
    </div>
  );
}
