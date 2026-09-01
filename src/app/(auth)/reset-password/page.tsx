"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";
import { Field, Input, FormMessage } from "@/components/ui/form";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(resetPassword, {});

  return (
    <div>
      <h1 className="mb-1 font-serif text-[18px] font-semibold">Set a new password</h1>
      <p className="mb-5 text-[12px] text-muted">Enter the code sent to your phone and choose a new password.</p>
      <FormMessage result={state} />
      {state.ok ? (
        <Link href="/login" className="inline-block text-[13px] font-medium text-accent-700 hover:underline">
          Go to sign in →
        </Link>
      ) : (
        <form action={action} className="space-y-3">
          <Field label="Registered phone" required>
            <Input name="phone" placeholder="01700000000" required />
          </Field>
          <Field label="6-digit code" required>
            <Input name="otp" inputMode="numeric" maxLength={6} placeholder="123456" required />
          </Field>
          <Field label="New password" required hint="At least 6 characters">
            <Input name="password" type="password" required />
          </Field>
          <Button type="submit" variant="primary" className="w-full" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
      <div className="mt-4 text-[12px]">
        <Link href="/login" className="text-accent-700 hover:underline">Back to sign in</Link>
      </div>
    </div>
  );
}
