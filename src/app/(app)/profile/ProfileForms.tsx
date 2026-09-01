"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/action-form";
import { changePassword, updateNotificationPrefs } from "@/lib/actions/account";
import type { ActionState } from "@/lib/actions/_common";

export function PasswordForm() {
  const [state, action] = useActionState<ActionState, FormData>(changePassword, {});
  return (
    <Panel title="Change password">
      <FormMessage result={state} />
      <form action={action} className="space-y-3">
        <Field label="Current password" required>
          <Input name="current" type="password" required autoComplete="current-password" />
        </Field>
        <Field label="New password" required hint="At least 6 characters">
          <Input name="next" type="password" required autoComplete="new-password" />
        </Field>
        <SubmitButton>Update password</SubmitButton>
      </form>
    </Panel>
  );
}

export function NotificationPrefsForm({ sms, email }: { sms: boolean; email: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateNotificationPrefs, {});
  return (
    <Panel title="Notification preferences">
      <FormMessage result={state} />
      <form action={action} className="space-y-2">
        <Checkbox name="sms" defaultChecked={sms} label="SMS alerts (fees, attendance, notices)" />
        <Checkbox name="email" defaultChecked={email} label="Email copies where an address is on file" />
        <div className="pt-2">
          <SubmitButton variant="secondary" size="sm">Save</SubmitButton>
        </div>
      </form>
    </Panel>
  );
}
