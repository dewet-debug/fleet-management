import { useState } from 'react';

export interface DateRange {
  dateFrom: string;
  dateTo: string;
}

/** YYYY-MM-DD from local date parts (never UTC — keeps "today" the local SAST day). */
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const firstOfMonth = (o: number) => { const d = new Date(); d.setMonth(d.getMonth() + o, 1); return d; };
const lastOfMonth = (o: number) => { const d = new Date(); d.setMonth(d.getMonth() + o + 1, 0); return d; };

const PRESETS: { key: string; label: string; range: () => [Date, Date] }[] = [
  { key: '7d', label: '7d', range: () => [daysAgo(7), new Date()] },
  { key: '30d', label: '30d', range: () => [daysAgo(30), new Date()] },
  { key: '90d', label: '90d', range: () => [daysAgo(90), new Date()] },
  { key: 'mtd', label: 'This month', range: () => [firstOfMonth(0), new Date()] },
  { key: 'lastMonth', label: 'Last month', range: () => [firstOfMonth(-1), lastOfMonth(-1)] },
];

/** Default last-30-days range (local dates) — a convenient initial value. */
export const last30DayRange = (): DateRange => ({ dateFrom: toYmd(daysAgo(30)), dateTo: toYmd(new Date()) });

/**
 * DateRangePicker — quick presets (7d / 30d / 90d / this month / last month)
 * plus custom From–To inputs. Emits {dateFrom,dateTo} on change. Signal-styled,
 * dark-aware (CSS-var tokens).
 */
export function DateRangePicker({
  value,
  onChange,
  initialPreset = '30d',
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  initialPreset?: string;
}) {
  const [preset, setPreset] = useState<string>(initialPreset);
  const ctrl =
    'rounded-control border border-paper-line bg-paper-card px-2.5 py-1.5 text-xs font-mono text-ink-body focus:border-primary-400 focus:outline-none';
  const invalid = value.dateFrom > value.dateTo;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          onClick={() => {
            const [f, t] = p.range();
            setPreset(p.key);
            onChange({ dateFrom: toYmd(f), dateTo: toYmd(t) });
          }}
          className={`rounded-control border px-2 py-1 text-xs font-semibold transition-colors ${
            preset === p.key
              ? 'border-primary-200 bg-primary-50 text-primary-700'
              : 'border-paper-line text-ink-muted hover:bg-paper-sunken'
          }`}
        >
          {p.label}
        </button>
      ))}
      <input
        type="date"
        className={ctrl}
        value={value.dateFrom}
        onChange={(e) => { setPreset('custom'); onChange({ ...value, dateFrom: e.target.value }); }}
      />
      <span className="text-ink-ghost">→</span>
      <input
        type="date"
        className={ctrl}
        value={value.dateTo}
        onChange={(e) => { setPreset('custom'); onChange({ ...value, dateTo: e.target.value }); }}
      />
      {invalid && <span className="font-mono text-xs text-danger">from &gt; to</span>}
    </div>
  );
}
