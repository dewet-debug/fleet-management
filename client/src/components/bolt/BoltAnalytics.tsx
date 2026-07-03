import { Card, Stat, LoadingSpinner } from '../ui';
import { useBoltAnalytics } from '../../hooks/useBolt';
import { zar, int } from '../../theme/format';
import { RevenueTrendChart, PaymentMixDonut, CompletionFunnel, TopVehiclesBars, TripDrill } from './charts';
import DemandMap from './DemandMap';

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

  return (
    <div className="space-y-4">
      {/* Revenue trend */}
      <Card title="Revenue trend" subtitle="net + commission = gross fare">
        <div className="mb-4 flex flex-wrap gap-6">
          <Stat label="Gross (window)" value={zar(totals.gross)} valueClassName="text-success" />
          <Stat label="Net earnings" value={zar(totals.net)} />
          <Stat label="Commission" value={zar(totals.commission)} valueClassName="text-ink-muted" />
        </div>
        <RevenueTrendChart trend={data.dailyTrend} onSelect={onSelect} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Payment mix" subtitle="finished trips">
          <PaymentMixDonut paymentMix={data.paymentMix} onSelect={onSelect} />
        </Card>
        <Card title="Completion funnel" subtitle="attempts → net paid">
          <CompletionFunnel funnel={data.funnel} onSelect={onSelect} />
        </Card>
      </div>

      {/* Top earning vehicles */}
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
              {data.pickupZones.length === 0 && <p className="text-sm text-ink-faint">—</p>}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
