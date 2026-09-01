/** Minimal dependency-free bar chart, styled to match the deck mockup. */
export function BarChart({
  data,
  height = 150,
  suffix = "",
}: {
  data: { label: string; value: number; highlight?: boolean }[];
  height?: number;
  suffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] tabular-nums text-muted">
              {d.value}
              {suffix}
            </span>
            <div
              className={`w-full rounded-t-[2px] ${d.highlight ? "bg-accent" : "bg-neutral-strong"}`}
              style={{ height: `${Math.max(3, (d.value / max) * (height - 24))}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-3">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[11px] text-muted">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
