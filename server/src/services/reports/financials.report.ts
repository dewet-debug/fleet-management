import prisma from '../../config/database';
import { ReportResult, ChartSpec } from './types';

/**
 * Fleet Financials — the operator's monthly P&L (imported from the MNC A49
 * workbook): billing vs collections, collection rate, cash and the profit-fund
 * position over the period we hold data.
 */
export async function fleetFinancialsReport(): Promise<ReportResult> {
  const rows = await prisma.fleetFinancialMonth.findMany({ orderBy: { month: 'asc' } });

  if (rows.length === 0) {
    return {
      key: 'fleet-financials',
      title: 'Fleet Financials',
      description: 'Monthly billing, collections and fund position.',
      window: null,
      kpis: [{ label: 'Months', value: 0, format: 'int' }],
      charts: [],
      sections: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const labels = rows.map((r) => r.monthLabel);
  const billed = rows.map((r) => r.billedGross);
  const collected = rows.map((r) => r.collected);
  const collPct = rows.map((r) => (r.billedGross > 0 ? r.collected / r.billedGross : 0));
  const cash = rows.map((r) => r.cashBalance ?? 0);
  const profitFund = rows.map((r) => r.profitFundBalance ?? 0);

  const totalBilled = billed.reduce((a, b) => a + b, 0);
  const totalCollected = collected.reduce((a, b) => a + b, 0);
  const overallColl = totalBilled > 0 ? totalCollected / totalBilled : 0;
  const last = rows[rows.length - 1];
  const worstCollIdx = collPct.indexOf(Math.min(...collPct));

  const charts: ChartSpec[] = [
    {
      type: 'line',
      title: 'Billing vs collections by month',
      description: 'Gross invoiced (solid) vs actually collected (dashed).',
      labels,
      series: [
        { name: 'Billed', values: billed, color: 'info' },
        { name: 'Collected', values: collected, color: 'success', dashed: true },
      ],
      valueFormat: 'money',
    },
    {
      type: 'bar',
      title: 'Collection rate by month',
      description: 'Share of billing collected — the health of driver rental payment.',
      labels,
      series: [{ name: 'Collection %', values: collPct, color: 'warning' }],
      valueFormat: 'percent',
      highlightIndex: worstCollIdx,
    },
    {
      type: 'line',
      title: 'Profit-fund balance (cumulative)',
      description: 'The residual profit after funding lease, insurance, maintenance and fees. Negative = eroding.',
      labels,
      series: [{ name: 'Profit fund', values: profitFund, color: 'danger' }],
      valueFormat: 'money',
    },
    {
      type: 'bar',
      title: 'Cash balance by month',
      labels,
      series: [{ name: 'Cash', values: cash, color: 'primary' }],
      valueFormat: 'money',
    },
  ];

  return {
    key: 'fleet-financials',
    title: 'Fleet Financials',
    description: 'Monthly billing, collections, cash and profit-fund position (imported from the operator P&L workbook).',
    window: { from: `${rows[0].month}-01`, to: `${last.month}-01` },
    kpis: [
      { label: 'Total billed', value: totalBilled, format: 'money' },
      { label: 'Total collected', value: totalCollected, format: 'money' },
      {
        label: 'Overall collection',
        value: overallColl,
        format: 'percent',
        tone: overallColl >= 0.9 ? 'success' : overallColl >= 0.8 ? 'warning' : 'danger',
      },
      { label: 'Latest cash', value: last.cashBalance, format: 'money' },
      {
        label: 'Profit fund',
        value: last.profitFundBalance,
        format: 'money',
        tone: (last.profitFundBalance ?? 0) < 0 ? 'danger' : 'success',
      },
    ],
    charts,
    sections: [
      {
        title: 'Monthly financials',
        columns: [
          { key: 'monthLabel', header: 'Month' },
          { key: 'vehiclesActive', header: 'Active veh', format: 'int', align: 'right' },
          { key: 'billedGross', header: 'Billed', format: 'money', align: 'right' },
          { key: 'collected', header: 'Collected', format: 'money', align: 'right' },
          { key: 'collPct', header: 'Coll %', format: 'percent', align: 'right' },
          { key: 'cashBalance', header: 'Cash', format: 'money', align: 'right' },
          { key: 'totalFundBalance', header: 'Fund bal', format: 'money', align: 'right' },
          { key: 'profitFundBalance', header: 'Profit fund', format: 'money', align: 'right' },
        ],
        rows: rows.map((r) => ({
          id: r.month,
          monthLabel: r.monthLabel,
          vehiclesActive: r.vehiclesActive,
          billedGross: r.billedGross,
          collected: r.collected,
          collPct: r.billedGross > 0 ? r.collected / r.billedGross : null,
          cashBalance: r.cashBalance,
          totalFundBalance: r.totalFundBalance,
          profitFundBalance: r.profitFundBalance,
        })),
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
