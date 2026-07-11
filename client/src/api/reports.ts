import client from './client';

export type CellFormat =
  | 'text'
  | 'money'
  | 'int'
  | 'number'
  | 'percent'
  | 'km'
  | 'date'
  | 'datetime'
  | 'days';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

export interface ReportMeta {
  key: string;
  title: string;
  description: string;
  category: string;
  usesDateRange: boolean;
}

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
  dashed?: boolean;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  description?: string;
  labels: string[];
  series?: ChartSeries[];
  valueFormat?: CellFormat;
  highlightIndex?: number;
  rowLabels?: string[];
  matrix?: number[][];
}

export interface ReportSelector {
  param: 'driverUuid';
  label: string;
  value: string;
  options: { value: string; label: string }[];
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

export interface ReportQuery {
  dateFrom?: string;
  dateTo?: string;
  months?: number;
  horizonDays?: number;
  driverUuid?: string;
}

export async function fetchReportCatalog() {
  const { data } = await client.get<{ success: boolean; data: ReportMeta[] }>('/reports');
  return data.data;
}

export async function fetchReport(key: string, params: ReportQuery) {
  const { data } = await client.get<{ success: boolean; data: ReportResult }>(`/reports/${key}`, {
    params,
  });
  return data.data;
}
