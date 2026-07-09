import prisma from '../../config/database';
import { ReportResult, ChartSpec } from './types';

const SHORT = 0.9; // collected below 90% of billed = "short" for that month

/**
 * Rental repeat offenders — vehicles/drivers that under-pay their rental across
 * multiple months. Built from the imported monthly Collections data.
 */
export async function rentalRepeatOffendersReport(): Promise<ReportResult> {
  const all = await prisma.vehicleRentalMonth.findMany({ orderBy: { month: 'asc' } });

  interface Agg {
    plate: string;
    driver: string | null;
    months: number;
    short: number;
    billed: number;
    collected: number;
    lastMonth: string;
  }
  const byPlate = new Map<string, Agg>();
  const monthSet = new Set<string>();
  const monthShortfall = new Map<string, number>();

  for (const r of all) {
    monthSet.add(r.month);
    monthShortfall.set(r.month, (monthShortfall.get(r.month) ?? 0) + (r.rentalBilled - r.rentalCollected));
    let g = byPlate.get(r.licensePlate);
    if (!g) {
      g = { plate: r.licensePlate, driver: r.driverName, months: 0, short: 0, billed: 0, collected: 0, lastMonth: '' };
      byPlate.set(r.licensePlate, g);
    }
    g.months += 1;
    g.billed += r.rentalBilled;
    g.collected += r.rentalCollected;
    if (r.rentalCollected < r.rentalBilled * SHORT) g.short += 1;
    if (r.month >= g.lastMonth) {
      g.lastMonth = r.month;
      if (r.driverName) g.driver = r.driverName;
    }
  }

  const list = [...byPlate.values()].map((g) => ({
    id: g.plate,
    plate: g.plate,
    driver: g.driver ?? '—',
    monthsShort: g.short,
    monthsTracked: g.months,
    billed: Math.round(g.billed),
    collected: Math.round(g.collected),
    collPct: g.billed > 0 ? g.collected / g.billed : null,
    shortfall: Math.round(g.billed - g.collected),
  }));

  const repeat = list.filter((r) => r.monthsShort >= 2).sort((a, b) => b.shortfall - a.shortfall);
  const chronic = list
    .filter((r) => r.monthsTracked >= 3 && r.monthsShort === r.monthsTracked)
    .sort((a, b) => b.shortfall - a.shortfall);
  const totalShortfall = list.reduce((a, r) => a + Math.max(0, r.shortfall), 0);

  const months = [...monthSet].sort();
  const mLabel = (k: string) => {
    const [y, m] = k.split('-');
    return `${['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m]} '${y.slice(2)}`;
  };

  const charts: ChartSpec[] = [
    {
      type: 'bar',
      title: 'Rental shortfall by month',
      description: 'Billed minus collected each month — the growing uncollected rental.',
      labels: months.map(mLabel),
      series: [{ name: 'Shortfall', values: months.map((m) => Math.round(monthShortfall.get(m) ?? 0)), color: 'danger' }],
      valueFormat: 'money',
    },
  ];

  const cols = [
    { key: 'plate', header: 'Plate' },
    { key: 'driver', header: 'Driver' },
    { key: 'monthsShort', header: 'Months short', format: 'int' as const, align: 'right' as const },
    { key: 'monthsTracked', header: 'Months', format: 'int' as const, align: 'right' as const },
    { key: 'billed', header: 'Billed', format: 'money' as const, align: 'right' as const },
    { key: 'collected', header: 'Collected', format: 'money' as const, align: 'right' as const },
    { key: 'collPct', header: 'Coll %', format: 'percent' as const, align: 'right' as const },
    { key: 'shortfall', header: 'Shortfall', format: 'money' as const, align: 'right' as const },
  ];

  return {
    key: 'rental-repeat-offenders',
    title: 'Rental Repeat Offenders',
    description: 'Vehicles/drivers that under-pay rental across multiple months (collected below 90% of billed).',
    window: null,
    kpis: [
      { label: 'Total rental shortfall', value: totalShortfall, format: 'money', tone: 'danger' },
      { label: 'Repeat offenders (2+ mo)', value: repeat.length, format: 'int', tone: repeat.length ? 'warning' : 'success' },
      { label: 'Chronic (every month)', value: chronic.length, format: 'int', tone: chronic.length ? 'danger' : 'success' },
      { label: 'Vehicles tracked', value: list.length, format: 'int' },
    ],
    charts,
    sections: [
      {
        title: `Repeat offenders — short in 2+ months (${repeat.length})`,
        description: 'Ranked by total shortfall. These are the biggest cumulative rental losses.',
        tone: 'danger',
        columns: cols,
        rows: repeat,
        emptyMessage: 'No repeat under-payers. ✓',
      },
      {
        title: `Chronic — short every tracked month (${chronic.length})`,
        description: 'Under-paid in every month they were on fleet (3+ months). Escalate / recover the vehicle.',
        tone: 'danger',
        columns: cols,
        rows: chronic,
        emptyMessage: 'No chronic under-payers. ✓',
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
