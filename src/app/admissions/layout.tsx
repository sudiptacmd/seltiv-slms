import Link from "next/link";
import { env } from "@/lib/env";

export default function AdmissionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-panel">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <div className="font-serif text-[16px] font-semibold">{env.school.name}</div>
            <div className="text-[11px] text-muted">Admissions</div>
          </div>
          <Link href="/login" className="text-[13px] text-accent-700 hover:underline">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 py-6 text-center text-[11px] text-muted">
        {env.school.address} · {env.school.phone}
      </footer>
    </div>
  );
}
