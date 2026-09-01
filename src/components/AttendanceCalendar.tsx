import { Panel, StatTile } from "@/components/ui/primitives";

type Rec = { date: string; status: string };

const STATUS_CLS: Record<string, string> = {
  present: "bg-ok-bg text-ok",
  late: "bg-warn-bg text-warn",
  absent: "bg-danger-bg text-danger",
  leave: "bg-accent-50 text-accent-900",
};

export function AttendanceCalendar({ records, month }: { records: Rec[]; month: string /* YYYY-MM */ }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = first.getDay();
  const byDate = new Map(records.map((r) => [r.date, r.status]));

  const monthRecs = records.filter((r) => r.date.startsWith(month));
  const summary = {
    present: monthRecs.filter((r) => r.status === "present").length,
    absent: monthRecs.filter((r) => r.status === "absent").length,
    late: monthRecs.filter((r) => r.status === "late").length,
    total: monthRecs.length,
  };
  const pct = summary.total ? Math.round(((summary.present + summary.late) / summary.total) * 100) : null;

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile value={pct == null ? "—" : `${pct}%`} label="This month" tone={pct != null && pct < 85 ? "warn" : "ink"} />
        <StatTile value={summary.present} label="Present" tone="ok" />
        <StatTile value={summary.absent} label="Absent" tone={summary.absent ? "danger" : "ink"} />
        <StatTile value={summary.late} label="Late" tone={summary.late ? "warn" : "ink"} />
      </div>

      <Panel title={first.toLocaleString("en", { month: "long", year: "numeric" })}>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="pb-1 font-medium">{d}</div>
          ))}
          {cells.map((day, i) => {
            if (day == null) return <div key={i} />;
            const dateStr = `${month}-${String(day).padStart(2, "0")}`;
            const status = byDate.get(dateStr);
            return (
              <div
                key={i}
                className={`flex aspect-square flex-col items-center justify-center rounded border border-line text-[12px] ${
                  status ? STATUS_CLS[status] : "text-ink"
                }`}
              >
                <span className="tabular-nums">{day}</span>
                {status && <span className="text-[9px] uppercase">{status[0]}</span>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
