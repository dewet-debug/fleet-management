/**
 * Shared report envelope. Every report returns the same shape so the client can
 * render any report generically: a KPI strip plus one or more tabular sections.
 * `format` hints tell the client how to render each value (currency, %, etc.).
 */

export type CellFormat =
  | 'text'
  | 'money'
  | 'int'
  | 'number'
  | 'percent' // value is a fraction 0..1
  | 'km'
  | 'date'
  | 'datetime'
  | 'days';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface ReportColumn {
  key: string;
  header: string;
  format?: CellFormat;
  align?: 'left' | 'right';
}

export interface ReportSection {
  title: string;
  description?: string;
  columns: ReportColumn[];
  rows: Record<string, any>[];
  emptyMessage?: string;
  /** Optional tone applied to a whole section header (e.g. "Overdue" in red). */
  tone?: Tone;
}

export interface ReportKpi {
  label: string;
  value: number | string | null;
  format?: CellFormat;
  tone?: Tone;
  sub?: string;
}

export type ChartType = 'line' | 'bar' | 'heatmap';
export type ChartColor = 'primary' | 'peri' | 'success' | 'warning' | 'info' | 'danger' | 'neutral';

export interface ChartSeries {
  name: string;
  values: number[];
  color?: ChartColor;
  /** render as a dashed overlay line (line charts only). */
  dashed?: boolean;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  description?: string;
  /** x-axis labels (line/bar) or column labels (heatmap x-axis). */
  labels: string[];
  series?: ChartSeries[]; // line / bar
  valueFormat?: CellFormat;
  /** highlight the index of the peak bar/label (bar charts). */
  highlightIndex?: number;
  // heatmap only:
  rowLabels?: string[];
  matrix?: number[][];
}

export interface ReportResult {
  key: string;
  title: string;
  description: string;
  window?: { from: string; to: string; days?: number } | null;
  selector?: ReportSelector;
  kpis: ReportKpi[];
  charts?: ChartSpec[];
  sections: ReportSection[];
  generatedAt: string;
}

export interface ReportParams {
  dateFrom?: string;
  dateTo?: string;
  months?: number; // for month-on-month reports
  horizonDays?: number; // for forward-looking (expiry / service-due) reports
  speedLimit?: number; // speeding threshold (km/h) for the behaviour report
  driverUuid?: string; // subject selector for per-driver reports
}

/** A dropdown the client renders to re-scope a report (e.g. pick a driver). */
export interface ReportSelector {
  param: 'driverUuid';
  label: string;
  value: string;
  options: { value: string; label: string }[];
}

export interface ReportMeta {
  key: string;
  title: string;
  description: string;
  category: string;
  /** Whether the report responds to the date-range picker. */
  usesDateRange: boolean;
}

/** Normalize a license plate for cross-system comparison (upper, no spaces). */
export function normalizePlate(plate: string | null | undefined): string {
  return (plate ?? '').toUpperCase().replace(/\s/g, '');
}
