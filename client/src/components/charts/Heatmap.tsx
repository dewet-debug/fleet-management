import { zar, int } from '../../theme/format';
import type { CellFormat } from '../../api/reports';

/**
 * Heatmap — CSS-grid intensity matrix (e.g. day-of-week × hour-of-day demand).
 * Cell background is the theme colour at an alpha scaled by value/max. Hover a
 * cell for its exact value.
 */
export function Heatmap({
  rowLabels,
  colLabels,
  matrix,
  color = 'var(--primary)',
  valueFormat = 'int',
  colTickEvery = 2,
}: {
  rowLabels: string[];
  colLabels: string[];
  matrix: number[][];
  color?: string;
  valueFormat?: CellFormat;
  colTickEvery?: number;
}) {
  const max = Math.max(1, ...matrix.flat());
  const fmt = (v: number) =>
    valueFormat === 'money' ? zar(v) : valueFormat === 'percent' ? `${(v * 100).toFixed(1)}%` : int(Math.round(v));

  return (
    <div className="overflow-x-auto">
      <div
        className="inline-grid gap-px text-center"
        style={{ gridTemplateColumns: `36px repeat(${colLabels.length}, minmax(16px, 1fr))` }}
      >
        {/* header row */}
        <div />
        {colLabels.map((c, i) => (
          <div key={`h-${i}`} className="pb-1 font-mono text-[9px] text-ink-ghost">
            {i % colTickEvery === 0 ? c : ''}
          </div>
        ))}
        {/* body */}
        {rowLabels.map((rl, ri) => (
          <RowFragment
            key={rl}
            rl={rl}
            values={matrix[ri] ?? []}
            max={max}
            color={color}
            fmt={fmt}
          />
        ))}
      </div>
    </div>
  );
}

function RowFragment({
  rl,
  values,
  max,
  color,
  fmt,
}: {
  rl: string;
  values: number[];
  max: number;
  color: string;
  fmt: (v: number) => string;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1.5 font-mono text-[10px] text-ink-muted">{rl}</div>
      {values.map((v, ci) => {
        const alpha = v <= 0 ? 0 : 0.12 + 0.88 * (v / max);
        return (
          <div
            key={ci}
            title={`${rl} · ${String(ci).padStart(2, '0')}:00 — ${fmt(v)}`}
            className="h-6 rounded-[2px] border border-paper-hair"
            style={{ backgroundColor: color, opacity: alpha || undefined, background: v <= 0 ? 'var(--neutral-bg)' : undefined }}
          />
        );
      })}
    </>
  );
}
