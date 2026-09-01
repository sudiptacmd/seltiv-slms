"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/ui/primitives";

type Child = { id: string; name: string; photoUrl?: string; klass: string; section: string; roll: number | null };

export function ChildSwitcher({ children, activeId }: { children: Child[]; activeId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  if (children.length <= 1) {
    const c = children[0];
    if (!c) return null;
    return (
      <div className="mb-4 flex items-center gap-2 text-[13px] text-muted">
        <Avatar name={c.name} src={c.photoUrl} size={28} />
        <span className="font-medium text-ink">{c.name}</span>
        <span>· {c.klass} {c.section} · Roll {c.roll}</span>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {children.map((c) => {
        const active = c.id === activeId;
        return (
          <button
            key={c.id}
            onClick={() => {
              const next = new URLSearchParams(params.toString());
              next.set("child", c.id);
              router.replace(`${pathname}?${next.toString()}`);
            }}
            className={`flex items-center gap-2 rounded border px-2.5 py-1.5 text-[13px] ${
              active ? "border-accent bg-accent-50" : "border-line hover:bg-panel"
            }`}
          >
            <Avatar name={c.name} src={c.photoUrl} size={22} />
            <span className="font-medium">{c.name}</span>
            <span className="text-muted">{c.klass} {c.section}</span>
          </button>
        );
      })}
    </div>
  );
}
