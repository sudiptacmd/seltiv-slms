"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordOtp, type ActionResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/primitives";
import { Field, Input, FormMessage } from "@/components/ui/form";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(requestPasswordOtp, {});

  return (
    <div>
      <h1 className="mb-1 font-serif text-[18px] font-semibold">Reset password</h1>
      <p className="mb-5 text-[12px] text-muted">We&apos;ll send a 6-digit code to your registered phone.</p>
      <FormMessage result={state} />
      <form action={action} className="space-y-3">
        <Field label="Registered phone" required>
          <Input name="phone" placeholder="01700000000" required autoFocus />
        </Field>
        <Button type="submit" variant="primary" className="w-full" disabled={pending}>
          {pending ? "Sending…" : "Send reset code"}
        </Button>
      </form>
      <div className="mt-4 flex justify-between text-[12px]">
        <Link href="/login" className="text-accent-700 hover:underline">Back to sign in</Link>
        <Link href="/reset-password" className="text-accent-700 hover:underline">I have a code</Link>
      </div>
    </div>
  );
}
