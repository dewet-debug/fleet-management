import { useId } from 'react';
import { zar, int } from '../../theme/format';
import type { CellFormat } from '../../api/reports';

/**
 * BarChart — hand-built SVG bar chart (no chart lib), theme-aware via CSS vars.
 * Single series with an optional highlighted bar (e.g. the peak hour/day).
 *   <BarChart labels={['Mon',...]} values={[...]} color="var(--primary)" highlightIndex={5} valueFormat="money" />
 */
export function BarChart({
  labels,
  values,
  color = 'var(--peri)',
  highlightColor = 'var(--primary)',
  highlightIndex = -1,
  valueFormat = 'number',
}: {
  labels: string[];
  values: number[];
  color?: string;
  highlightColor?: string;
  highlightIndex?: number;
  valueFormat?: CellFormat;
}) {
  const gid = useId();
  const n = values.length;
  if (!n) return <div className="grid h-[180px] place-items-center text-sm text-ink-faint">No data.</div>;

  const W = 720, H = 200, padL = 46, padR = 8, padT = 14, padB = 26;
  const max = Math.max(...values, 1);
  const plotW = W - padL - padR;
  const step = plotW / n;
  const barW = Math.max(2, step * 0.66);
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);

  const fmt = (v: number) =>
    valueFormat === 'money' ? zar(v)
    : valueFormat === 'percent' ? `${(v * 100).toFixed(1)}%`
    : valueFormat === 'km' ? `${int(Math.round(v))} km`
    : int(Math.round(v));
  const axis = (v: number) =>
    valueFormat === 'money'
      ? v >= 1000 ? `R${Math.round(v / 1000)}k` : `R${Math.round(v)}`
      : v >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v));

  const gridVals = [0.25, 0.5, 0.75, 1].map((f) => f * max);
  const tickEvery = Math.ceil(n / 14);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={y(v)} x2={W - padR} y2={y(v)} stroke="var(--hair)" strokeWidth={1} />
          <text x={padL - 6} y={y(v) + 3} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize={9} fill="var(--ghost)">
            {axis(v)}
          </text>
        </g>
      ))}
      {values.map((v, i) => {
        const bx = padL + i * step + (step - barW) / 2;
        const by = y(v);
        const isHi = i === highlightIndex;
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={Math.max(0, H - padB - by)} rx={2} fill={isHi ? highlightColor : color} opacity={isHi ? 1 : 0.82}>
              <title>{`${labels[i]}: ${fmt(v)}`}</title>
            </rect>
            {(i % tickEvery === 0 || isHi) && (
              <text x={padL + i * step + step / 2} y={H - 8} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={9} fill={isHi ? 'var(--ink)' : 'var(--ghost)'} fontWeight={isHi ? 700 : 400}>
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
