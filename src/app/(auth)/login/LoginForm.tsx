"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/primitives";
import { Field, Input } from "@/components/ui/form";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      identifier: String(form.get("identifier") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Incorrect phone/email or password.");
      return;
    }
    router.replace(params.get("callbackUrl") || "/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {error && (
        <div className="rounded border border-danger/30 bg-danger-bg px-3 py-2 text-[13px] text-danger">
          {error}
        </div>
      )}
      <Field label="Phone or email" required>
        <Input name="identifier" autoComplete="username" placeholder="01700000000" required autoFocus />
      </Field>
      <Field label="Password" required>
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
