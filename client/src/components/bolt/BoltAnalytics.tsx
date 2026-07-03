import { Card, Stat, LoadingSpinner } from '../ui';
import { useBoltAnalytics } from '../../hooks/useBolt';
import { zar, int } from '../../theme/format';
import { CompletionFunnel, TopVehiclesBars, TripDrill } from './charts';
import { RevenueTrendChart } from '../charts/RevenueTrendChart';
import { Donut } from '../charts/Donut';
import DemandMap from './DemandMap';

const PAL = ['var(--primary)', 'var(--success)', 'var(--warning)', 'var(--info)', 'var(--neutral)', 'var(--danger)'];

export default function BoltAnalytics({
  dateFrom,
  dateTo,
  onSelect,
}: {
  dateFrom?: string;
  dateTo?: string;
  onSelect?: (d: TripDrill) => void;
}) {
  const { data, isLoading } = useBoltAnalytics({ dateFrom, dateTo });

  if (isLoading || !data) return <LoadingSpinner size="lg" />;

  const totals = data.dailyTrend.reduce(
    (a, d) => ({ gross: a.gross + d.gross, net: a.net + d.net, commission: a.commission + d.commission }),
    { gross: 0, net: 0, commission: 0 },
  );
  const payTotal = data.paymentMix.reduce((s, p) => s + p.count, 0);
  const tickEvery = Math.max(1, Math.ceil(data.dailyTrend.length / 6));

  return (
    <div className="space-y-4">
      {/* Revenue trend — SVG hero */}
      <Card title="Revenue trend" subtitle="gross + net · window">
        <div className="mb-4 flex flex-wrap gap-6">
          <Stat label="Gross (window)" value={zar(totals.gross)} valueClassName="text-success" />
          <Stat label="Net earnings" value={zar(totals.net)} />
          <Stat label="Commission" value={zar(totals.commission)} valueClassName="text-ink-muted" />
        </div>
        <RevenueTrendChart
          values={data.dailyTrend.map((d) => d.gross)}
          secondary={data.dailyTrend.map((d) => d.net)}
          labels={data.dailyTrend.map((d) => d.day.slice(5))}
          tickEvery={tickEvery}
        />
        <div className="mt-2 flex gap-4 font-mono text-meta uppercase tracking-wider text-ink-ghost">
          <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm" style={{ background: 'var(--peri)' }} /> Gross</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-3" style={{ background: 'var(--success)' }} /> Net</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Payment mix — donut + clickable legend (preserves drill-down) */}
        <Card title="Payment mix" subtitle="finished trips">
          <div className="flex items-center gap-5">
            <Donut
              size={132}
              centerTop={int(payTotal)}
              centerSub="trips"
              segments={data.paymentMix.map((p, i) => ({ value: p.count, color: PAL[i % PAL.length] }))}
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              {data.paymentMix.map((p, i) => (
                <div
                  key={p.method}
                  onClick={onSelect ? () => onSelect({ paymentMethod: p.method, status: 'finished' }) : undefined}
                  className={`flex items-center gap-2 rounded-control px-1 py-0.5 text-sm ${onSelect ? 'cursor-pointer hover:bg-paper-sunken' : ''}`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PAL[i % PAL.length] }} />
                  <span className="flex-1 truncate capitalize text-ink-body">{p.method.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs text-ink-muted">{int(p.count)}</span>
                  <span className="w-9 text-right font-mono text-xs text-ink-faint">{payTotal ? Math.round((p.count / payTotal) * 100) : 0}%</span>
                </div>
              ))}
              {data.paymentMix.length === 0 && <p className="text-sm text-ink-faint">No finished trips in window.</p>}
            </div>
          </div>
        </Card>

        <Card title="Completion funnel" subtitle="attempts → net paid">
          <CompletionFunnel funnel={data.funnel} onSelect={onSelect} />
        </Card>
      </div>

      <Card title="Top earning vehicles" subtitle="by gross fare · window">
        <TopVehiclesBars topVehicles={data.topVehicles} onSelect={onSelect} />
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
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
