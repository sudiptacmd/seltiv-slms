import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { PageHeader } from "@/components/ui/primitives";
import { connectDb } from "@/lib/db";
import { AdmissionSession } from "@/models";
import { formatDate } from "@/lib/utils";
import { SessionForm } from "./SessionForm";

export const metadata: Metadata = { title: "Admission session" };

export default async function AdmissionSettingsPage() {
  await requireRole("admin");
  await connectDb();
  const session = await AdmissionSession.findOne().sort({ createdAt: -1 }).lean();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Admission session" subtitle="Open/close window, application fee and the documents applicants must upload." />
      <SessionForm
        draft={
          session
            ? {
                id: String(session._id),
                name: session.name,
                opensAt: formatDate(session.opensAt, "iso"),
                closesAt: formatDate(session.closesAt, "iso"),
                isOpen: session.isOpen,
                applicationFee: session.applicationFee,
                requiredDocuments: session.requiredDocuments.join(", "),
              }
            : undefined
        }
      />
    </div>
  );
}
