import type { Metadata } from "next";
import { connectDb } from "@/lib/db";
import { AdmissionApplication } from "@/models";
import { Panel } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/ui/misc";
import { formatDate } from "@/lib/utils";
import { normalizeMsisdn } from "@/lib/adapters/sms";
import { APPLICATION_STAGE } from "@/models/types";

export const metadata: Metadata = { title: "Application status" };

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string; phone?: string }>;
}) {
  const sp = await searchParams;
  let app = null;
  let error = "";

  if (sp.no && sp.phone) {
    await connectDb();
    app = await AdmissionApplication.findOne({
      applicationNo: sp.no.trim().toUpperCase(),
      guardianPhone: normalizeMsisdn(sp.phone.trim()),
    })
      .populate("klass", "name")
      .lean();
    if (!app) error = "No application found with that number and phone. Check both and try again.";
  }

  const stages = ["submitted", "test_scheduled", "verified", "seat_offered", "enrolled"];
  const idx = app ? stages.indexOf(app.stage) : -1;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-3 font-serif text-[22px] font-semibold tracking-tight">Track your application</h1>

      <Panel>
        <form className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[12px] text-muted">Application number</span>
            <input name="no" defaultValue={sp.no} placeholder="APP-2027-0001" required className="h-9 rounded border border-line-strong px-2.5 text-sm" />
          </label>
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[12px] text-muted">Guardian phone</span>
            <input name="phone" defaultValue={sp.phone} placeholder="01700000000" required className="h-9 rounded border border-line-strong px-2.5 text-sm" />
          </label>
          <button className="h-9 rounded bg-accent px-3.5 text-[13px] font-medium text-white hover:bg-accent-600">Check</button>
        </form>
      </Panel>

      {error && <p className="mt-3 rounded bg-danger-bg px-3 py-2 text-[13px] text-danger">{error}</p>}

      {app && (
        <Panel className="mt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-[16px] font-semibold">{app.studentName}</div>
              <div className="text-[12px] text-muted">
                {app.applicationNo} · {(app.klass as unknown as { name: string })?.name} · applied {formatDate(app.createdAt, "short")}
              </div>
            </div>
            <StatusBadge status={app.stage} />
          </div>

          {app.stage === "rejected" ? (
            <p className="mt-4 rounded bg-danger-bg px-3 py-2 text-[13px] text-danger">
              This application was not successful. {app.rejectionReason}
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {stages.map((s, i) => (
                <li key={s} className="flex items-center gap-2 text-[13px]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    i < idx ? "bg-ok text-white" : i === idx ? "bg-accent text-white" : "border border-line-strong text-muted"
                  }`}>
                    {i < idx ? "✓" : i + 1}
                  </span>
                  <span className={i === idx ? "font-medium" : "text-muted"}>
                    {(APPLICATION_STAGE.find((x) => x === s) ?? s).replace(/_/g, " ")}
                  </span>
                </li>
              ))}
            </ol>
          )}

          {app.stage === "test_scheduled" && (
            <p className="mt-3 text-[12px] text-muted">Bring your application number and a photo ID to the entrance test.</p>
          )}
          {app.stage === "enrolled" && (
            <p className="mt-3 rounded bg-ok-bg px-3 py-2 text-[13px] text-ok">
              Congratulations — your child is enrolled. Sign in with the guardian phone number to access the parent portal.
            </p>
          )}
        </Panel>
      )}
    </div>
  );
}
