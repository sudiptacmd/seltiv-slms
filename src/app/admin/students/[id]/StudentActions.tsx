"use client";

import { useActionState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Select, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { setStudentStatus, transferStudent } from "@/lib/actions/students";
import type { ActionState } from "@/lib/actions/_common";

export function StudentActions({
  studentId,
  status,
}: {
  studentId: string;
  studentName: string;
  status: string;
  currentSectionId: string | null;
}) {
  const [statusState, statusAction] = useActionState<ActionState, FormData>(setStudentStatus, {});
  const [xferState, xferAction] = useActionState<ActionState, FormData>(transferStudent, {});
  useActionEffect(statusState);
  useActionEffect(xferState);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Status">
        <FormMessage result={statusState} />
        <form action={statusAction} className="flex items-end gap-2">
          <input type="hidden" name="id" value={studentId} />
          <Field label="Set status" className="flex-1">
            <Select name="status" defaultValue={status}>
              <option value="active">Active</option>
              <option value="transferred">Transferred out</option>
              <option value="withdrawn">Withdrawn</option>
              <option value="graduated">Graduated</option>
            </Select>
          </Field>
          <SubmitButton variant="secondary" size="sm">Update</SubmitButton>
        </form>
      </Panel>

      <Panel title="Transfer section">
        <FormMessage result={xferState} />
        <form action={xferAction} className="flex items-end gap-2">
          <input type="hidden" name="id" value={studentId} />
          <Field label="To section" className="flex-1">
            <TransferSectionSelect />
          </Field>
          <Field label="Roll" className="w-20">
            <Input name="rollNumber" type="number" min={1} required />
          </Field>
          <SubmitButton variant="secondary" size="sm">Move</SubmitButton>
        </form>
      </Panel>
    </div>
  );
}

// section list is fetched by the parent via a small inline island
import { useEffect, useState } from "react";
function TransferSectionSelect() {
  const [opts, setOpts] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    fetch("/api/options/sections")
      .then((r) => r.json())
      .then((d) => setOpts(d.sections ?? []))
      .catch(() => {});
  }, []);
  return (
    <Select name="toSectionId" required>
      <option value="">Select…</option>
      {opts.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </Select>
  );
}
