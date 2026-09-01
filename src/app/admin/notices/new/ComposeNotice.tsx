"use client";

import { useActionState, useMemo, useState } from "react";
import { Panel } from "@/components/ui/primitives";
import { Field, Input, Textarea, Select, Checkbox, FormMessage } from "@/components/ui/form";
import { SubmitButton, useActionEffect } from "@/components/ui/action-form";
import { publishNotice } from "@/lib/actions/notices";
import { countSegments } from "@/lib/sms-util";
import type { ActionState } from "@/lib/actions/_common";

type Opt = { id: string; name: string };

export function ComposeNotice({
  classes,
  sections,
  students,
}: {
  classes: Opt[];
  sections: Opt[];
  students: Opt[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(publishNotice, {});
  useActionEffect(state);
  const [kind, setKind] = useState("all_parents");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sms, setSms] = useState(true);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const seg = useMemo(() => countSegments(`SFHS: ${title}. ${body.slice(0, 240)}`), [title, body]);

  if (state.ok) {
    return (
      <Panel>
        <p className="rounded bg-ok-bg px-3 py-2 text-[13px] text-ok">{state.message}</p>
        <a href="/admin/notices" className="mt-3 inline-block text-[13px] font-medium text-accent-700 hover:underline">Back to notices →</a>
      </Panel>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <FormMessage result={state} />
      <Panel title="Message">
        <Field label="Title" required>
          <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Body" required>
          <Textarea name="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
        </Field>
        <Field label="Image URL (optional)"><Input name="imageUrl" /></Field>
        <Field label="Attachment URL (optional)"><Input name="attachmentUrl" /></Field>
      </Panel>

      <Panel title="Audience">
        <Field label="Send to">
          <Select name="audienceKind" value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all_parents">All parents</option>
            <option value="all_teachers">All teachers</option>
            <option value="all">Everyone (parents + teachers)</option>
            <option value="class">A specific class</option>
            <option value="section">A specific section</option>
            <option value="individuals">Selected students&apos; guardians</option>
          </Select>
        </Field>
        {kind === "class" && (
          <Field label="Class" className="mt-2">
            <Select name="klass" required>
              <option value="">Select…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}
        {kind === "section" && (
          <Field label="Section" className="mt-2">
            <Select name="section" required>
              <option value="">Select…</option>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        )}
        {kind === "individuals" && (
          <div className="mt-2">
            <p className="mb-1 text-[12px] text-muted">{picked.size} students selected</p>
            <div className="max-h-48 overflow-y-auto rounded border border-line">
              {students.map((st) => (
                <label key={st.id} className="flex items-center gap-2 border-b border-line px-3 py-1 text-[13px] last:border-0">
                  <input
                    type="checkbox"
                    name="studentId"
                    value={st.id}
                    checked={picked.has(st.id)}
                    onChange={() =>
                      setPicked((p) => {
                        const n = new Set(p);
                        n.has(st.id) ? n.delete(st.id) : n.add(st.id);
                        return n;
                      })
                    }
                    className="h-4 w-4 accent-accent"
                  />
                  {st.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Channels & timing">
        <div className="flex gap-4">
          <Checkbox name="channel" value="portal" defaultChecked label="Portal" />
          <Checkbox name="channel" value="sms" checked={sms} onChange={(e) => setSms(e.target.checked)} label="SMS" />
        </div>
        {sms && (
          <p className="mt-2 text-[12px] text-muted">
            SMS preview: {seg.segments} segment{seg.segments === 1 ? "" : "s"}{seg.unicode ? " · unicode (Bangla)" : ""} — 1 SMS credit per segment per recipient.
          </p>
        )}
        <Field label="Schedule for (optional)" className="mt-3">
          <Input name="scheduledFor" type="datetime-local" />
        </Field>
      </Panel>

      <div className="flex justify-end gap-2">
        <SubmitButton variant="secondary" name="mode" value="draft">Save draft</SubmitButton>
        <SubmitButton name="mode" value="publish">Publish{sms ? " & Send SMS" : ""}</SubmitButton>
      </div>
    </form>
  );
}
