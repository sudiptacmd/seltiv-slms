"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, Input, Select, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveClass, saveSection } from "@/lib/actions/academics";
import type { ActionState } from "@/lib/actions/_common";

type Cls = { id: string; name: string; numeric: number };
type Sec = { id: string; classId: string; name: string; capacity: number; room?: string; classTeacher?: string; enrolled: number };

export function ClassesEditor({
  classes,
  sections,
  teachers,
}: {
  classes: Cls[];
  sections: Sec[];
  teachers: { id: string; name: string }[];
}) {
  const [clsState, clsAction] = useActionState<ActionState, FormData>(saveClass, {});
  const [secState, secAction] = useActionState<ActionState, FormData>(saveSection, {});
  useActionEffect(clsState);
  useActionEffect(secState);
  const [addSecFor, setAddSecFor] = useState<string | null>(null);

  return (
    <div>
      <div className="border-b border-line p-4">
        <FormMessage result={clsState} />
        <form action={clsAction} className="flex flex-wrap items-end gap-2">
          <Field label="New class name" className="w-40"><Input name="name" placeholder="Class 11" required /></Field>
          <Field label="Numeric / order" className="w-32"><Input name="numeric" type="number" required /></Field>
          <SubmitButton size="sm">Add class</SubmitButton>
        </form>
      </div>

      <FormMessage result={secState} />
      <div className="divide-y divide-line">
        {classes.map((c) => {
          const secs = sections.filter((s) => s.classId === c.id);
          return (
            <div key={c.id} className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-serif text-[15px] font-semibold">{c.name}</h3>
                <Button size="sm" variant="ghost" onClick={() => setAddSecFor(addSecFor === c.id ? null : c.id)}>
                  + Section
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {secs.map((s) => (
                  <div key={s.id} className="rounded border border-line px-3 py-1.5 text-[12px]">
                    <span className="font-medium">{c.name} {s.name}</span>
                    <span className="ml-2 text-muted">{s.enrolled}/{s.capacity}</span>
                    {s.classTeacher && <span className="ml-2 text-muted">· {s.classTeacher}</span>}
                  </div>
                ))}
                {secs.length === 0 && <span className="text-[12px] text-muted">No sections</span>}
              </div>

              {addSecFor === c.id && (
                <form action={secAction} className="mt-3 flex flex-wrap items-end gap-2 rounded bg-panel p-3">
                  <input type="hidden" name="classId" value={c.id} />
                  <Field label="Section" className="w-24"><Input name="name" placeholder="A" required /></Field>
                  <Field label="Capacity" className="w-24"><Input name="capacity" type="number" defaultValue={40} /></Field>
                  <Field label="Room" className="w-28"><Input name="room" /></Field>
                  <Field label="Class teacher" className="w-44">
                    <Select name="classTeacherId" defaultValue="">
                      <option value="">—</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                  </Field>
                  <SubmitButton size="sm">Add</SubmitButton>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
