import { Card, Stat, LoadingSpinner } from '../ui';
import { useBoltAnalytics } from '../../hooks/useBolt';
import { zar, int } from '../../theme/format';
import DemandMap from './DemandMap';

// Signal semantic hexes (for hand-built charts that need inline colour)
const C = {
  success: '#17935b',
  successBg: '#e4f4ec',
  primary: '#356093',
  primary300: '#8fb0cd',
  info: '#2f6ea8',
  warning: '#bd7f14',
  neutral: '#6b7688',
  danger: '#b0392f',
  line: '#e6e5df',
};
const DONUT_PALETTE = [C.primary, C.success, C.warning, C.info, C.neutral, C.danger];

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

export default function BoltAnalytics({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) {
  const { data, isLoading } = useBoltAnalytics({ dateFrom, dateTo });

  if (isLoading || !data) return <LoadingSpinner size="lg" />;

  const trend = data.dailyTrend;
  const maxGross = Math.max(1, ...trend.map((d) => d.gross));
  const totals = trend.reduce(
    (a, d) => ({ gross: a.gross + d.gross, net: a.net + d.net, commission: a.commission + d.commission }),
    { gross: 0, net: 0, commission: 0 },
  );

  const payTotalCount = data.paymentMix.reduce((s, p) => s + p.count, 0) || 1;
  // conic-gradient stops for the donut
  let acc = 0;
  const conic = data.paymentMix
    .map((p, i) => {
      const start = (acc / payTotalCount) * 360;
      acc += p.count;
      const end = (acc / payTotalCount) * 360;
      return `${DONUT_PALETTE[i % DONUT_PALETTE.length]} ${start}deg ${end}deg`;
    })
    .join(', ');

  const f = data.funnel;
  const funnelRows = [
    { label: 'Attempts', value: f.attempts, tone: C.neutral },
    { label: 'Accepted', value: f.accepted, tone: C.info },
    { label: 'Finished', value: f.finished, tone: C.success },
  ];
  const maxVehGross = Math.max(1, ...data.topVehicles.map((v) => v.gross));

  return (
    <div className="space-y-4">
      {/* Revenue trend */}
      <Card title="Revenue trend" subtitle="net + commission = gross fare" bodyClassName="p-5">
        <div className="mb-4 flex flex-wrap gap-6">
          <Stat label="Gross (window)" value={zar(totals.gross)} valueClassName="text-success" />
          <Stat label="Net earnings" value={zar(totals.net)} />
          <Stat label="Commission" value={zar(totals.commission)} valueClassName="text-ink-muted" />
        </div>
        <div className="flex items-end gap-1.5" style={{ height: 160 }}>
          {trend.map((d) => {
            const gH = (d.gross / maxGross) * 140;
            const netH = d.gross > 0 ? (d.net / d.gross) * gH : 0;
            return (
              <div key={d.day} className="group flex flex-1 flex-col items-center justify-end" title={`${d.day} · gross ${zar(d.gross)} · ${int(d.finished)} trips`}>
                <div className="relative w-full max-w-[26px] overflow-hidden rounded-t" style={{ height: gH || 1 }}>
                  <div className="absolute inset-x-0 bottom-0" style={{ height: gH, background: C.primary300 }} />
                  <div className="absolute inset-x-0 bottom-0" style={{ height: netH, background: C.success }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-1.5">
          {trend.map((d) => (
            <span key={d.day} className="flex-1 text-center font-mono text-[9px] text-ink-ghost">{d.day.slice(5)}</span>
          ))}
        </div>
        <div className="mt-3 flex gap-4 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C.success }} /> Net</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: C.primary300 }} /> Commission</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment mix donut */}
        <Card title="Payment mix" subtitle="finished trips">
          <div className="flex items-center gap-6">
            <div className="relative shrink-0" style={{ width: 132, height: 132 }}>
              <div className="h-full w-full rounded-pill" style={{ background: `conic-gradient(${conic || `${C.neutral} 0deg 360deg`})` }} />
              <div className="absolute inset-[26px] grid place-items-center rounded-pill bg-paper-card text-center">
                <div>
                  <p className="font-mono text-lg font-semibold text-ink-strong">{int(payTotalCount)}</p>
                  <p className="font-mono text-meta uppercase tracking-wider text-ink-ghost">trips</p>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.paymentMix.map((p, i) => (
                <div key={p.method} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
                  <span className="flex-1 truncate capitalize text-ink-body">{p.method.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs text-ink-muted">{int(p.count)}</span>
                  <span className="w-10 text-right font-mono text-xs text-ink-faint">{pct(p.count, payTotalCount)}%</span>
                </div>
              ))}
              {data.paymentMix.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
            </div>
          </div>
        </Card>

        {/* Completion funnel */}
        <Card title="Completion funnel" subtitle="attempts → net paid">
          <div className="space-y-3">
            {funnelRows.map((r, i) => {
              const p = pct(r.value, f.attempts);
              const drop = i > 0 ? funnelRows[i - 1].value - r.value : 0;
              return (
                <div key={r.label}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="text-ink-body">{r.label}</span>
                    <span className="font-mono text-ink-strong">{int(r.value)} <span className="text-ink-faint">· {p}%</span></span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-pill bg-paper-sunken">
                    <div className="h-full rounded-pill" style={{ width: `${p}%`, background: r.tone }} />
                  </div>
                  {i > 0 && drop > 0 && (
                    <p className="mt-0.5 font-mono text-[10px] text-danger">−{int(drop)} dropped ({pct(drop, funnelRows[i - 1].value)}%)</p>
                  )}
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t border-paper-hair pt-3">
              <span className="font-mono text-meta uppercase tracking-wider text-ink-ghost">Net paid to fleet</span>
              <span className="font-mono text-lg font-semibold text-success">{zar(f.netPaid)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top earning vehicles */}
      <Card title="Top earning vehicles" subtitle="by gross fare · window">
        <div className="space-y-2">
          {data.topVehicles.map((v) => (
            <div key={v.plate} className="flex items-center gap-3">
              <span className="w-24 shrink-0 font-mono text-xs text-ink-strong">{v.plate}</span>
              <div className="h-4 flex-1 overflow-hidden rounded-control bg-paper-sunken">
                <div className="h-full rounded-control" style={{ width: `${pct(v.gross, maxVehGross)}%`, background: C.primary }} />
              </div>
              <span className="w-24 text-right font-mono text-xs text-ink-strong">{zar(v.gross)}</span>
              <span className="w-16 text-right font-mono text-xs text-ink-faint">{int(v.trips)} trips</span>
            </div>
          ))}
          {data.topVehicles.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
        </div>
      </Card>

      {/* Demand map */}
      <Card title="Demand map" subtitle="pickup hot-zones · ~1km cells" bodyClassName="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px]">
          <div className="h-[380px] w-full">
            {data.pickupZones.length ? (
              <DemandMap zones={data.pickupZones} />
            ) : (
              <div className="grid h-full place-items-center text-sm text-ink-faint">No pickup coordinates in window.</div>
            )}
          </div>
          <div className="border-t border-paper-hair p-4 lg:border-l lg:border-t-0">
            <p className="mb-2 font-mono text-meta uppercase tracking-wider text-ink-ghost">Top pickup zones</p>
            <div className="space-y-2">
              {data.pickupZones.slice(0, 8).map((z, i) => (
                <div key={`${z.lat},${z.lng}`} className="flex items-start gap-2 text-xs">
                  <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-pill bg-primary-50 font-mono text-[9px] font-semibold text-primary-700">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink-body" title={z.sampleAddress ?? ''}>{z.sampleAddress ?? `${z.lat}, ${z.lng}`}</span>
                  <span className="font-mono text-ink-strong">{int(z.count)}</span>
                </div>
              ))}
              {data.pickupZones.length === 0 && <p className="text-sm text-ink-faint">—</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
