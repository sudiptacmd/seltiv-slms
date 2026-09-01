"use client";

import { useActionState } from "react";
import { Panel, Button } from "@/components/ui/primitives";
import { Field, Input, Select, Textarea, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { updateApplication } from "@/lib/actions/admissions";
import type { ActionState } from "@/lib/actions/_common";
import { APPLICATION_STAGE } from "@/models/types";

export function ApplicationActions({
  id,
  stage,
  documents,
  sections,
  enrolled,
  testScore,
}: {
  id: string;
  stage: string;
  documents: { label: string; status: string; note?: string }[];
  sections: { id: string; name: string }[];
  enrolled: boolean;
  testScore?: number;
}) {
  const [stageState, stageAction] = useActionState<ActionState, FormData>(updateApplication, {});
  const [docState, docAction] = useActionState<ActionState, FormData>(updateApplication, {});
  const [scoreState, scoreAction] = useActionState<ActionState, FormData>(updateApplication, {});
  const [enrolState, enrolAction] = useActionState<ActionState, FormData>(updateApplication, {});
  useActionEffect(stageState);
  useActionEffect(docState);
  useActionEffect(scoreState);
  useActionEffect(enrolState);

  return (
    <div className="space-y-4">
      <Panel title="Documents">
        <FormMessage result={docState} />
        <ul className="space-y-2">
          {documents.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-[13px]">
              <div>
                <span className="font-medium">{d.label}</span>
                <span className={`ml-2 text-[11px] ${d.status === "verified" ? "text-ok" : d.status === "rejected" ? "text-danger" : "text-muted"}`}>
                  {d.status}
                </span>
                {d.note && <span className="ml-1 text-[11px] text-muted">— {d.note}</span>}
              </div>
              <div className="flex gap-1">
                <form action={docAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="action" value="verify_doc" />
                  <input type="hidden" name="docIndex" value={i} />
                  <input type="hidden" name="status" value="verified" />
                  <button className="rounded border border-line px-2 py-0.5 text-[11px] hover:bg-panel">Verify</button>
                </form>
                <form action={docAction}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="action" value="verify_doc" />
                  <input type="hidden" name="docIndex" value={i} />
                  <input type="hidden" name="status" value="rejected" />
                  <button className="rounded border border-line px-2 py-0.5 text-[11px] text-danger hover:bg-danger-bg">Reject</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Entrance test">
          <FormMessage result={scoreState} />
          <form action={scoreAction} className="flex items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="action" value="test_score" />
            <Field label="Score (out of 100)" className="flex-1">
              <Input name="testScore" type="number" min={0} max={100} defaultValue={testScore} />
            </Field>
            <SubmitButton size="sm" variant="secondary">Save score</SubmitButton>
          </form>
        </Panel>

        <Panel title="Stage">
          <FormMessage result={stageState} />
          <form action={stageAction} className="space-y-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="action" value="stage" />
            <Field label="Move to">
              <Select name="stage" defaultValue={stage}>
                {APPLICATION_STAGE.filter((s) => s !== "enrolled").map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                ))}
              </Select>
            </Field>
            <Field label="Reason (if rejecting)">
              <Textarea name="reason" rows={2} />
            </Field>
            <SubmitButton size="sm" variant="secondary">Update stage</SubmitButton>
          </form>
        </Panel>
      </div>

      {!enrolled && (
        <Panel title="Enrol as student">
          <FormMessage result={enrolState} />
          <form action={enrolAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="action" value="enrol" />
            <Field label="Section">
              <Select name="sectionId" required>
                <option value="">Select…</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Roll" className="w-24">
              <Input name="rollNumber" type="number" min={1} required />
            </Field>
            <SubmitButton>Enrol & create login</SubmitButton>
          </form>
        </Panel>
      )}

      {enrolled && (
        <Panel title="Enrolled">
          <p className="text-[13px] text-ok">This applicant has been enrolled as a student.</p>
          <Button variant="ghost" size="sm" className="mt-1" disabled>
            Student record created
          </Button>
        </Panel>
      )}
    </div>
  );
}
