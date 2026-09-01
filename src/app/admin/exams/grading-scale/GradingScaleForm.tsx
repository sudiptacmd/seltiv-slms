"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { Field, Input, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { saveGradingScale } from "@/lib/actions/school-settings";
import type { ActionState } from "@/lib/actions/_common";

type Band = { grade: string; minPercent: number; gpa: number };

export function GradingScaleForm({ bands: initial, failGrade }: { bands: Band[]; failGrade: string }) {
  const [state, action] = useActionState<ActionState, FormData>(saveGradingScale, {});
  useActionEffect(state);
  const [bands, setBands] = useState<Band[]>(initial);

  const update = (i: number, key: keyof Band, val: string) =>
    setBands((b) => b.map((x, j) => (j === i ? { ...x, [key]: key === "grade" ? val : Number(val) } : x)));

  return (
    <form action={action} className="space-y-3">
      <FormMessage result={state} />
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[11px] uppercase text-muted">
          <span>Grade</span><span>Min %</span><span>Grade point</span><span></span>
        </div>
        {bands.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <Input name="grade" value={b.grade} onChange={(e) => update(i, "grade", e.target.value)} required />
            <Input name="minPercent" type="number" value={b.minPercent} onChange={(e) => update(i, "minPercent", e.target.value)} required />
            <Input name="gpa" type="number" step="0.01" value={b.gpa} onChange={(e) => update(i, "gpa", e.target.value)} required />
            <button type="button" onClick={() => setBands((x) => x.filter((_, j) => j !== i))} className="text-[12px] text-danger">×</button>
          </div>
        ))}
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={() => setBands((b) => [...b, { grade: "", minPercent: 0, gpa: 0 }])}>
        + Add band
      </Button>
      <Field label="Fail grade"><Input name="failGrade" defaultValue={failGrade} className="w-20" /></Field>
      <SubmitButton>Save scale</SubmitButton>
    </form>
  );
}
