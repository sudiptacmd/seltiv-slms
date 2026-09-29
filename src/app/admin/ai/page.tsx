import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader, Tag, LinkButton } from "@/components/ui/primitives";
import { aiModel, localModelStatus } from "@/lib/ai/ollama";
import { GradingAssistant } from "./GradingAssistant";
export const metadata: Metadata = { title: "Seltiv AI" };
export default async function AIPage() {
  await requireRole("admin");
  const connected = await localModelStatus();
  return <div>
    <PageHeader title="Seltiv AI" subtitle="Describe an academic change. Review the proposal, then approve it to apply."
      actions={<LinkButton href="/admin/exams/marking-structure" size="sm">View marking structures</LinkButton>} />
    <div className="mb-4 flex items-center gap-2"><Tag tone={connected ? "ok" : "warn"}>{connected ? "Local AI connected" : "Local AI unavailable"}</Tag><span className="text-[12px] text-muted">{aiModel()} · Runs on your school’s server</span></div>
    <GradingAssistant connected={connected} />
  </div>;
}
