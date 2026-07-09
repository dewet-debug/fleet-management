import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Card, Stat, Table, LoadingSpinner, Badge } from '../components/ui';
import { DateRangePicker, DateRange, last30DayRange } from '../components/ui/DateRangePicker';
import { useReportCatalog, useReport } from '../hooks/useReports';
import type { CellFormat, Tone, ReportSection, ReportKpi, ChartSpec, ChartColor, ReportQuery } from '../api/reports';
import { RevenueTrendChart } from '../components/charts/RevenueTrendChart';
import { BarChart } from '../components/charts/BarChart';
import { Heatmap } from '../components/charts/Heatmap';
import { zar, int } from '../theme/format';

const chartVar = (c?: ChartColor) => `var(--${c ?? 'peri'})`;

// ---- value formatting driven by backend format hints ----

function formatCell(value: any, format?: CellFormat): string {
  if (value === null || value === undefined || value === '') return '—';
  switch (format) {
    case 'money':
      return zar(Number(value));
    case 'int':
      return int(Number(value));
    case 'number':
      return Number.isInteger(value) ? int(value) : Number(value).toFixed(1);
    case 'percent':
      return `${(Number(value) * 100).toFixed(1)}%`;
    case 'km':
      return `${int(Math.round(Number(value)))} km`;
    case 'days': {
      const n = Number(value);
      return n < 0 ? `${n}d overdue` : `${n}d`;
    }
    case 'date':
      return new Date(value).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
    case 'datetime':
      return new Date(value).toLocaleString('en-ZA');
    default:
      return String(value);
  }
}

type TableRow = { id: string | number; [key: string]: any };

const TONE_TEXT: Record<Tone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
  neutral: 'text-ink-strong',
};

// ---- section renderer ----

function SectionCard({ section }: { section: ReportSection }) {
  const columns = useMemo(
    () =>
      section.columns.map((c) => ({
        key: c.key,
        header: c.header,
        className: c.align === 'right' ? 'text-right tabular-nums' : undefined,
      })),
    [section.columns],
  );
  const colFormat = useMemo(() => {
    const m: Record<string, CellFormat | undefined> = {};
    for (const c of section.columns) m[c.key] = c.format;
    return m;
  }, [section.columns]);

  const template = section.columns
    .map((c, i) => (i === 0 ? 'minmax(150px, 2fr)' : 'minmax(88px, 1fr)'))
    .join(' ');

  const rows: TableRow[] = section.rows.map((r, i) => ({ ...r, id: r.id ?? i }));

  const title = (
    <span className="flex items-center gap-2">
      {section.tone && <Badge tone={section.tone} dot>{section.tone === 'danger' ? 'Action' : section.tone === 'warning' ? 'Review' : 'Info'}</Badge>}
      {section.title}
    </span>
  );

  return (
    <Card title={title} subtitle={section.description} bodyClassName="p-0">
      <div className="overflow-x-auto">
        <Table
          columns={columns}
          template={template}
          rows={rows}
          emptyMessage={section.emptyMessage ?? 'No data.'}
          renderCell={(row, key) => (
            <span className={colFormat[key] === 'days' && Number(row[key]) < 0 ? 'text-danger' : undefined}>
              {formatCell(row[key], colFormat[key])}
            </span>
          )}
        />
      </div>
    </Card>
  );
}

function ChartCard({ chart }: { chart: ChartSpec }) {
  return (
    <Card title={chart.title} subtitle={chart.description}>
      {chart.type === 'line' && (
        <RevenueTrendChart
          values={chart.series?.[0]?.values ?? []}
          secondary={chart.series?.[1]?.values}
          labels={chart.labels}
          tickEvery={Math.max(1, Math.ceil(chart.labels.length / 6))}
        />
      )}
      {chart.type === 'bar' && (
        <BarChart
          labels={chart.labels}
          values={chart.series?.[0]?.values ?? []}
          color={chartVar(chart.series?.[0]?.color)}
          highlightIndex={chart.highlightIndex ?? -1}
          valueFormat={chart.valueFormat}
        />
      )}
      {chart.type === 'heatmap' && (
        <Heatmap
          rowLabels={chart.rowLabels ?? []}
          colLabels={chart.labels}
          matrix={chart.matrix ?? []}
          color={chartVar('primary')}
          valueFormat={chart.valueFormat}
        />
      )}
    </Card>
  );
}

function KpiStrip({ kpis }: { kpis: ReportKpi[] }) {
  return (
    <Card bodyClassName="p-0">
      <div className="grid grid-cols-2 divide-x divide-y divide-paper-hair md:grid-cols-4 lg:grid-cols-5 md:divide-y-0">
        {kpis.map((k) => (
          <Stat
            key={k.label}
            label={k.label}
            value={formatCell(k.value, k.format)}
            sub={k.sub}
            valueClassName={k.tone ? TONE_TEXT[k.tone] : undefined}
          />
        ))}
      </div>
    </Card>
  );
}

// ---- page ----

export default function ReportsPage() {
  const { data: catalog } = useReportCatalog();
  const [selected, setSelected] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange>(last30DayRange());
  const [selValues, setSelValues] = useState<Record<string, string>>({});

  const selectedKey = selected ?? catalog?.[0]?.key ?? '';
  const meta = catalog?.find((r) => r.key === selectedKey);
  const selValue = selValues[selectedKey];
  const params: ReportQuery = {};
  if (meta?.usesDateRange) {
    params.dateFrom = range.dateFrom;
    params.dateTo = range.dateTo;
  }
  if (selValue) params.driverUuid = selValue;

  const { data: report, isLoading, isFetching } = useReport(selectedKey, params, !!selectedKey);

  // group catalog by category, preserving order of first appearance
  const grouped = useMemo(() => {
    const groups: { category: string; items: NonNullable<typeof catalog> }[] = [];
    for (const r of catalog ?? []) {
      let g = groups.find((x) => x.category === r.category);
      if (!g) {
        g = { category: r.category, items: [] };
        groups.push(g);
      }
      g.items.push(r);
    }
    return groups;
  }, [catalog]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* report selector rail */}
      <aside className="shrink-0 lg:w-60">
        <div className="lg:sticky lg:top-4">
          <h1 className="mb-1 text-xl font-bold text-ink">Reports</h1>
          <p className="mb-4 text-xs text-ink-faint">Operational fleet reporting</p>
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.category}>
                <p className="mb-1.5 px-1 font-mono text-meta uppercase tracking-wider text-ink-ghost">
                  {g.category}
                </p>
                <div className="space-y-0.5">
                  {g.items.map((r) => {
                    const active = r.key === selectedKey;
                    return (
                      <button
                        key={r.key}
                        onClick={() => setSelected(r.key)}
                        className={clsx(
                          'w-full rounded-control px-3 py-2 text-left text-sm transition-colors',
                          active
                            ? 'bg-primary-50 font-semibold text-primary-700'
                            : 'text-ink-muted hover:bg-paper-sunken hover:text-ink',
                        )}
                      >
                        {r.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* report body */}
      <div className="min-w-0 flex-1 space-y-4">
        {!report && isLoading ? (
          <LoadingSpinner size="lg" />
        ) : report ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{report.title}</h2>
                <p className="max-w-2xl text-sm text-ink-muted">{report.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {report.selector && (
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    {report.selector.label}
                    <select
                      value={selValue ?? report.selector.value}
                      onChange={(e) => setSelValues((v) => ({ ...v, [selectedKey]: e.target.value }))}
                      className="max-w-[260px] rounded-control border border-paper-line bg-paper-card px-2.5 py-1.5 text-xs text-ink-body focus:border-primary-400 focus:outline-none"
                    >
                      {report.selector.options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {meta?.usesDateRange && <DateRangePicker value={range} onChange={setRange} />}
                {isFetching && <span className="font-mono text-xs text-ink-ghost">Updating…</span>}
              </div>
            </div>

            {report.kpis.length > 0 && <KpiStrip kpis={report.kpis} />}

            {report.charts && report.charts.length > 0 && (
              <div className="grid gap-4 xl:grid-cols-2">
                {report.charts.map((c, i) => (
                  <div key={`${report.key}-c${i}`} className={c.type !== 'bar' ? 'xl:col-span-2' : ''}>
                    <ChartCard chart={c} />
                  </div>
                ))}
              </div>
            )}

            {report.sections.map((s, i) => (
              <SectionCard key={`${report.key}-${i}`} section={s} />
            ))}
          </>
        ) : (
          <LoadingSpinner size="lg" />
        )}
      </div>
    </div>
  );
}
