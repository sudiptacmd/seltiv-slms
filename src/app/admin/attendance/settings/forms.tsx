"use client";

import { useActionState } from "react";
import { Field, Input, Select, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { addPeriod, addCalendarDay, setAttendanceWindow } from "@/lib/actions/school-settings";
import type { ActionState } from "@/lib/actions/_common";

export function PeriodForm() {
  const [state, action] = useActionState<ActionState, FormData>(addPeriod, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <FormMessage result={state} />
      <Field label="Name" className="w-28"><Input name="name" placeholder="Period 7" required /></Field>
      <Field label="Start" className="w-24"><Input name="startTime" type="time" required /></Field>
      <Field label="End" className="w-24"><Input name="endTime" type="time" required /></Field>
      <Checkbox name="isBreak" label="Break" />
      <SubmitButton size="sm">Add</SubmitButton>
    </form>
  );
}

export function HolidayForm() {
  const [state, action] = useActionState<ActionState, FormData>(addCalendarDay, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <FormMessage result={state} />
      <Field label="Date" className="w-36"><Input name="date" type="date" required /></Field>
      <Field label="Title" className="flex-1"><Input name="title" placeholder="Victory Day" required /></Field>
      <Field label="Kind" className="w-28">
        <Select name="kind" defaultValue="holiday">
          <option value="holiday">Holiday</option>
          <option value="event">Event</option>
          <option value="exam">Exam</option>
        </Select>
      </Field>
      <SubmitButton size="sm">Add</SubmitButton>
    </form>
  );
}

export function WindowForm({ hours }: { hours: number }) {
  const [state, action] = useActionState<ActionState, FormData>(setAttendanceWindow, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex items-end gap-2">
      <FormMessage result={state} />
      <Field label="Hours a teacher can edit a saved roll call" className="flex-1">
        <Input name="hours" type="number" min={0} defaultValue={hours} />
      </Field>
      <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
    </form>
  );
}
