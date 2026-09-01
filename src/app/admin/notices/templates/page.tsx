import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/session";
import { PageHeader, Panel } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { Notice } from "@/models";
import { TemplateForm } from "./TemplateForm";

export const metadata: Metadata = { title: "Notice templates" };

export default async function NoticeTemplatesPage() {
  await requireRole("admin");
  await connectDb();
  const drafts = await Notice.find({ status: "draft" }).sort({ createdAt: -1 }).lean();

  return (
    <div>
      <PageHeader title="Notice templates" subtitle="Reusable drafts — start a new notice from one of these." />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="New template" className="lg:col-span-1"><TemplateForm /></Panel>
        <div className="space-y-3 lg:col-span-2">
          {drafts.map((d) => (
            <Panel key={String(d._id)} title={d.title}>
              <p className="whitespace-pre-wrap text-[13px] text-muted">{d.body}</p>
              <Link href="/admin/notices/new" className="mt-2 inline-block text-[12px] font-medium text-accent-700 hover:underline">
                Use in a new notice →
              </Link>
            </Panel>
          ))}
          {drafts.length === 0 && <Panel><p className="text-[13px] text-muted">No templates yet.</p></Panel>}
        </div>
      </div>
    </div>
  );
}
