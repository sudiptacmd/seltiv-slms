"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input, Select } from "@/components/ui/form";

export type FilterConfig =
  | { type: "search"; key: string; placeholder?: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[] };

export function FilterBar({ filters }: { filters: FilterConfig[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      next.delete("page");
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {filters.map((f) => {
        if (f.type === "search") {
          return (
            <Input
              key={f.key}
              defaultValue={params.get(f.key) ?? ""}
              placeholder={f.placeholder ?? "Search…"}
              className="h-8 max-w-[220px] text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter") setParam(f.key, (e.target as HTMLInputElement).value);
              }}
              onBlur={(e) => setParam(f.key, e.target.value)}
            />
          );
        }
        return (
          <Select
            key={f.key}
            defaultValue={params.get(f.key) ?? ""}
            className="h-8 max-w-[200px] text-[13px]"
            onChange={(e) => setParam(f.key, e.target.value)}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        );
      })}
      {[...params.keys()].some((k) => k !== "page") && (
        <button
          onClick={() => router.replace(pathname)}
          className="text-[12px] text-accent-700 hover:underline"
        >
          Clear
        </button>
      )}
    </div>
  );
}
