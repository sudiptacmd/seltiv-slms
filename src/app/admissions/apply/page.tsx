import type { Metadata } from "next";
import Link from "next/link";
import { connectDb } from "@/lib/db";
import { AdmissionSession, ClassModel } from "@/models";
import { Panel } from "@/components/ui/primitives";
import { taka, formatDate } from "@/lib/utils";
import { ApplyForm } from "./ApplyForm";

export const metadata: Metadata = { title: "Apply for admission" };

export default async function ApplyPage() {
  await connectDb();
  const session = await AdmissionSession.findOne({ isOpen: true }).sort({ createdAt: -1 }).lean();
  const open = session && new Date() <= new Date(session.closesAt);
  const classes = await ClassModel.find().sort({ order: 1 }).lean();

  if (!open) {
    return (
      <Panel>
        <h1 className="mb-2 font-serif text-[20px] font-semibold">Admissions are currently closed</h1>
        <p className="text-[13px] text-muted">
          Please check back later, or contact the school office for the next admission cycle.
        </p>
        <Link href="/admissions/status" className="mt-3 inline-block text-[13px] text-accent-700 hover:underline">
          Track an existing application →
        </Link>
      </Panel>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-serif text-[24px] font-semibold tracking-tight">{session!.name}</h1>
        <p className="text-[13px] text-muted">
          Applications close {formatDate(session!.closesAt)}.
          {session!.applicationFee > 0 && ` Application fee ${taka(session!.applicationFee)}.`}
        </p>
      </div>
      <ApplyForm
        classes={classes.map((c) => ({ id: String(c._id), name: c.name }))}
        requiredDocs={session!.requiredDocuments}
      />
      <p className="mt-4 text-center text-[12px] text-muted">
        Already applied? <Link href="/admissions/status" className="text-accent-700 hover:underline">Check your status</Link>
      </p>
    </div>
  );
}
