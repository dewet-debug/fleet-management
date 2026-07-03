/**
 * Sparkline — tiny inline trend for KPI cards. Pure SVG, no dependency.
 * Pass a CSS-variable colour so it re-themes in dark.
 *   <Sparkline data={[64,65,66,68,70,71]} color="var(--success)" />
 */
export function Sparkline({
  data,
  color = 'var(--peri)',
  width = 118,
  height = 34,
  pad = 4,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  pad?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (width - 2 * pad);
    const y = height - pad - ((v - min) / rng) * (height - 2 * pad);
    return [x, y] as const;
  });
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width, height, overflow: 'visible' }}>
      <polyline
        points={pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r={2.6} fill={color} />
    </svg>
  );
}
