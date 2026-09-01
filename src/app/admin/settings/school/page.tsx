import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { Settings } from "@/models";
import { env } from "@/lib/env";
import { SchoolForm } from "./SchoolForm";

export const metadata: Metadata = { title: "School settings" };

export default async function SchoolSettingsPage() {
  await requireRole("admin");
  await connectDb();
  const s = await Settings.findOne().lean();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="School details"
        subtitle="Shown on the login screen, letterheads and generated PDFs. In production these can also be set with environment variables per branch."
      />
      <SchoolForm
        draft={{
          schoolName: s?.schoolName ?? env.school.name,
          headTeacher: s?.headTeacher ?? "",
          address: s?.address ?? env.school.address,
          eiin: s?.eiin ?? env.school.eiin,
          phone: s?.phone ?? env.school.phone,
          email: s?.email ?? env.school.email,
          logoUrl: s?.logoUrl ?? "",
        }}
      />
      <Panel title="Environment (read-only)" className="mt-4">
        <p className="text-[13px] text-muted">
          <code className="rounded bg-panel px-1">SCHOOL_CODE</code> = <strong>{env.school.code}</strong> ·{" "}
          <code className="rounded bg-panel px-1">MONGODB_URI</code> set ·{" "}
          each branch of the trust runs its own process with its own values.
        </p>
      </Panel>
    </div>
  );
}
