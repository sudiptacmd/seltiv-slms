import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Bangladeshi Taka, e.g. ৳3,000 or ৳1,50,000 (Indian grouping). */
export function taka(amount: number, opts: { decimals?: boolean } = {}): string {
  const n = Math.round(amount * (opts.decimals ? 100 : 1)) / (opts.decimals ? 100 : 1);
  const [intPart, decPart] = n.toFixed(opts.decimals ? 2 : 0).split(".");
  const sign = intPart.startsWith("-") ? "-" : "";
  const digits = intPart.replace("-", "");
  let out = digits.length > 3 ? digits.slice(-3) : digits;
  let rest = digits.slice(0, -3);
  while (rest.length > 0) {
    out = rest.slice(-2) + "," + out;
    rest = rest.slice(0, -2);
  }
  return `${sign}৳${out}${decPart ? "." + decPart : ""}`;
}

export function pct(value: number, total: number, decimals = 1): string {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(decimals)}%`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function formatDate(d: Date | string | undefined | null, style: "long" | "short" | "iso" = "long"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  if (style === "iso") return date.toISOString().slice(0, 10);
  if (style === "short") return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function monthLabel(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Deterministic short code, e.g. application / invoice numbers. */
export function refCode(prefix: string, seq: number, width = 4): string {
  return `${prefix}-${String(seq).padStart(width, "0")}`;
}

export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function clampText(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
