import { env } from "@/lib/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-panel px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-serif text-[22px] font-semibold tracking-tight text-ink">{env.school.name}</div>
          <div className="mt-0.5 text-[12px] text-muted">Student Lifecycle Management System</div>
        </div>
        <div className="rounded-lg border border-line bg-surface p-6 shadow-card">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] text-muted">Seltiv SLMS · {env.school.code}</p>
      </div>
    </div>
  );
}
