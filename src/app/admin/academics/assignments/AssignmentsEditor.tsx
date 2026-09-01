"use client";

import { useActionState } from "react";
import { Select } from "@/components/ui/form";
import { assignSubjectTeacher, setClassTeacher } from "@/lib/actions/academics";
import { useActionEffect } from "@/components/ui/action-form";
import type { ActionState } from "@/lib/actions/_common";

type Teacher = { id: string; name: string };

export function AssignmentsEditor({
  sectionId,
  classTeacherId,
  subjects,
  teachers,
}: {
  sectionId: string;
  classTeacherId: string;
  subjects: { id: string; name: string; teacherId: string }[];
  teachers: Teacher[];
}) {
  return (
    <div className="space-y-3">
      <ClassTeacherRow sectionId={sectionId} value={classTeacherId} teachers={teachers} />
      <div className="grid gap-2 sm:grid-cols-2">
        {subjects.map((subj) => (
          <SubjectRow key={subj.id} sectionId={sectionId} subject={subj} teachers={teachers} />
        ))}
      </div>
    </div>
  );
}

function ClassTeacherRow({ sectionId, value, teachers }: { sectionId: string; value: string; teachers: Teacher[] }) {
  const [state, action] = useActionState<ActionState, FormData>(setClassTeacher, {});
  useActionEffect(state);
  return (
    <form
      action={action}
      className="flex items-center justify-between gap-3 rounded bg-accent-50/60 px-3 py-2 text-[13px]"
    >
      <input type="hidden" name="sectionId" value={sectionId} />
      <span className="font-medium">Class teacher</span>
      <Select
        name="teacherId"
        defaultValue={value}
        className="h-8 max-w-[220px] text-[13px]"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">— none —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
    </form>
  );
}

function SubjectRow({
  sectionId,
  subject,
  teachers,
}: {
  sectionId: string;
  subject: { id: string; name: string; teacherId: string };
  teachers: Teacher[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(assignSubjectTeacher, {});
  useActionEffect(state);
  return (
    <form action={action} className="flex items-center justify-between gap-2 rounded border border-line px-3 py-1.5 text-[13px]">
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="subjectId" value={subject.id} />
      <span>{subject.name}</span>
      <Select
        name="teacherId"
        defaultValue={subject.teacherId}
        className="h-8 max-w-[160px] text-[13px]"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="">— unassigned —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </Select>
    </form>
  );
}
