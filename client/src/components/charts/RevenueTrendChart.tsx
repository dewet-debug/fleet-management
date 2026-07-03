import { useId } from 'react';

/**
 * RevenueTrendChart — dashboard hero. Hand-built SVG (no chart lib): gradient
 * area + crisp gross line, optional dashed net overlay, money gridlines, date
 * ticks, and a latest-point tooltip. Scale + gridlines are derived from the
 * data (not hardcoded). Colours are CSS variables so it re-themes in dark.
 *
 *   <RevenueTrendChart values={grossPerDay} secondary={netPerDay} labels={days} />
 *
 * `values`/`secondary` are actual ZAR (formatted to Rk internally).
 */
export function RevenueTrendChart({
  values,
  secondary,
  labels,
  tickEvery = 6,
}: {
  values: number[];
  secondary?: number[];
  labels: string[];
  tickEvery?: number;
}) {
  const gid = useId();
  const n = values.length;
  if (n < 2) return <div className="grid h-[200px] place-items-center text-sm text-ink-faint">Not enough data in this window.</div>;

  const x0 = 46, x1 = 708, yT = 16, yB = 190;
  const all = secondary && secondary.length === n ? [...values, ...secondary] : values;
  const dMax = Math.max(...all), dMin = Math.min(...all);
  const span = dMax - dMin || dMax || 1;
  const vmax = dMax + span * 0.12;
  const vmin = Math.max(0, dMin - span * 0.12);
  const X = (i: number) => x0 + (i / (n - 1)) * (x1 - x0);
  const Y = (v: number) => yB - ((v - vmin) / (vmax - vmin || 1)) * (yB - yT);

  const toPath = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ');
  const line = toPath(values);
  const area = `M${X(0).toFixed(1)} ${yB} ${values.map((v, i) => `L${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')} L${X(n - 1).toFixed(1)} ${yB} Z`;

  const gridVals = Array.from({ length: 4 }, (_, k) => vmin + ((k + 1) / 5) * (vmax - vmin));
  const kfmt = (v: number) => `R${Math.round(v / 1000)}k`;
  const lastX = X(n - 1), lastY = Y(values[n - 1]);
  const hasNet = !!secondary && secondary.length === n;

  return (
    <svg viewBox="0 0 720 218" style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--peri)" stopOpacity={0.34} />
          <stop offset="100%" stopColor="var(--peri)" stopOpacity={0} />
        </linearGradient>
      </defs>
      {gridVals.map((v, idx) => (
        <g key={idx}>
          <line x1={46} y1={Y(v)} x2={708} y2={Y(v)} stroke="var(--hair)" strokeWidth={1} />
          <text x={8} y={Y(v) + 3} fontFamily="IBM Plex Mono, monospace" fontSize={9} fill="var(--ghost)">{kfmt(v)}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      {hasNet && (
        <path d={toPath(secondary!)} fill="none" stroke="var(--success)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.85} />
      )}
      <path d={line} fill="none" stroke="var(--peri)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={4} fill="var(--peri)" stroke="var(--card)" strokeWidth={2} />
      {labels.map((lab, i) =>
        i % tickEvery === 0 || i === n - 1 ? (
          <text key={i} x={X(i)} y={212} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={9} fill="var(--ghost)">{lab}</text>
        ) : null,
      )}
      <g>
        <rect x={Math.max(2, lastX - 72)} y={lastY - 38} width={66} height={30} rx={6} fill="var(--primary)" />
        <text x={Math.max(2, lastX - 72) + 33} y={lastY - 25} textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize={11} fontWeight={600} fill="#fff">{kfmt(values[n - 1])}</text>
        <text x={Math.max(2, lastX - 72) + 33} y={lastY - 14} textAnchor="middle" fontFamily="IBM Plex Sans, sans-serif" fontSize={8} fill="rgba(255,255,255,.7)">{labels[n - 1]} · gross</text>
      </g>
    </svg>
  );
}
