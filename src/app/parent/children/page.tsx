import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel, Avatar, EmptyState } from "@/components/ui/primitives";
import { parentChildren } from "@/lib/parent";
import { LinkChildForm } from "./LinkChildForm";

export const metadata: Metadata = { title: "My Children" };

export default async function ParentChildrenPage() {
  const user = await requireRole("parent");
  const children = await parentChildren(user);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="My Children" subtitle="Children linked to your account." />
      <Panel bodyClassName="p-0" className="mb-4">
        {children.length === 0 ? (
          <div className="p-4"><EmptyState title="No child linked yet" hint="Use the form below, or ask the school office." /></div>
        ) : (
          <ul className="divide-y divide-line">
            {children.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={c.name} src={c.photoUrl} size={32} />
                <div className="text-[13px]">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-muted">{c.klass} {c.section} · Roll {c.roll}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Link another child">
        <p className="mb-3 text-[12px] text-muted">
          Enter the student ID printed on the ID card. We&apos;ll send a code to the phone number the school has on file for that student.
        </p>
        <LinkChildForm />
      </Panel>
    </div>
  );
}
