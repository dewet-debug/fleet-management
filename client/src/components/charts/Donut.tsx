import React from 'react';

/**
 * Donut — status / mix ring with a centre stat. CSS conic-gradient (no chart
 * lib). Segments are {value, color}; colours as CSS variables so it re-themes
 * in dark.
 *
 *   <Donut size={150} centerTop="148" centerSub="vehicles"
 *     segments={[{ value: 132, color: 'var(--success)' }, ...]} />
 */
export function Donut({
  segments,
  size = 150,
  thickness = 15,
  centerTop,
  centerSub,
}: {
  segments: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerTop?: React.ReactNode;
  centerSub?: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  const stops = segments
    .filter((s) => s.value > 0)
    .map((s) => {
      const from = (acc / total) * 100;
      acc += s.value;
      const to = (acc / total) * 100;
      return `${s.color} ${from.toFixed(2)}% ${to.toFixed(2)}%`;
    })
    .join(', ');

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '999px',
        background: stops ? `conic-gradient(${stops})` : 'var(--neutral-bg)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: thickness,
          borderRadius: '999px',
          background: 'var(--card)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1.05,
        }}
      >
        {centerTop != null && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: size / 5, fontWeight: 600, color: 'var(--num)' }}>
            {centerTop}
          </span>
        )}
        {centerSub != null && <span style={{ fontSize: 11, color: 'var(--faint)' }}>{centerSub}</span>}
      </div>
    </div>
  );
}
