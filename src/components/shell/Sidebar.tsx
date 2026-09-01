"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav";

export function Sidebar({
  groups,
  portalName,
  schoolCode,
}: {
  groups: NavGroup[];
  portalName: string;
  schoolCode: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-2.5 lg:hidden">
        <span className="font-serif text-[15px] font-semibold">{portalName}</span>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded border border-line-strong px-2.5 py-1 text-[13px]"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      <aside
        className={cn(
          "w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex lg:h-dvh lg:sticky lg:top-0",
          open ? "flex" : "hidden",
        )}
      >
        <div className="hidden items-baseline gap-2 border-b border-line px-4 py-3.5 lg:flex">
          <span className="font-serif text-[16px] font-semibold tracking-tight">{portalName}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted">{schoolCode}</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {groups.map((group, gi) => (
            <div key={gi} className="mb-3 last:mb-0">
              {group.heading && (
                <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted/80">
                  {group.heading}
                </div>
              )}
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded px-2 py-1.5 text-[13px] transition-colors",
                    isActive(item.href, item.exact)
                      ? "bg-accent-50 font-medium text-accent-900"
                      : "text-ink/80 hover:bg-panel hover:text-ink",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
