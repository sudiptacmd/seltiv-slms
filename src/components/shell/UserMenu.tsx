"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Avatar } from "@/components/ui/primitives";

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded border border-line px-2 py-1 hover:bg-panel"
      >
        <Avatar name={name} size={24} />
        <span className="hidden text-[13px] font-medium sm:block">{name}</span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded border border-line bg-surface py-1 shadow-pop">
          <div className="border-b border-line px-3 py-2">
            <div className="text-[13px] font-medium">{name}</div>
            <div className="text-[11px] capitalize text-muted">{role}</div>
          </div>
          <Link href="/profile" className="block px-3 py-1.5 text-[13px] hover:bg-panel" onClick={() => setOpen(false)}>
            My Profile
          </Link>
          <Link href="/settings" className="block px-3 py-1.5 text-[13px] hover:bg-panel" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <Link href="/notifications" className="block px-3 py-1.5 text-[13px] hover:bg-panel" onClick={() => setOpen(false)}>
            Notifications
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="block w-full px-3 py-1.5 text-left text-[13px] text-danger hover:bg-panel"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
