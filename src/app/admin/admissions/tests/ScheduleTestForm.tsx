"use client";

import { useActionState, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { scheduleEntranceTest } from "@/lib/actions/admissions";
import type { ActionState } from "@/lib/actions/_common";

export function ScheduleTestForm({ applicants }: { applicants: { id: string; name: string; klass: string }[] }) {
  const [state, action] = useActionState<ActionState, FormData>(scheduleEntranceTest, {});
  useActionEffect(state);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  return (
    <Panel title="Schedule a test">
      <FormMessage result={state} />
      <form action={action} className="space-y-3">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="applicantId" value={id} />
        ))}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title" required><Input name="title" defaultValue="Entrance Test" required /></Field>
          <Field label="Date" required><Input name="date" type="datetime-local" required /></Field>
          <Field label="Venue"><Input name="venue" placeholder="School main building" /></Field>
          <Field label="Full marks"><Input name="fullMarks" type="number" defaultValue={100} /></Field>
        </div>

        <div>
          <p className="mb-1 text-[12px] font-medium text-muted">Assign applicants ({selected.size} selected)</p>
          <div className="max-h-52 overflow-y-auto rounded border border-line">
            {applicants.length === 0 && <p className="p-3 text-[12px] text-muted">No applicants waiting for a test.</p>}
            {applicants.map((a) => (
              <label key={a.id} className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-[13px] last:border-0">
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() =>
                    setSelected((s) => {
                      const n = new Set(s);
                      n.has(a.id) ? n.delete(a.id) : n.add(a.id);
                      return n;
                    })
                  }
                  className="h-4 w-4 accent-accent"
                />
                {a.name} <span className="text-muted">· {a.klass}</span>
              </label>
            ))}
          </div>
        </div>

        <SubmitButton disabled={selected.size === 0}>Schedule test</SubmitButton>
      </form>
    </Panel>
  );
}
