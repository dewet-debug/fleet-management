import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchReportCatalog, fetchReport, ReportQuery } from '../api/reports';

export const useReportCatalog = () =>
  useQuery({ queryKey: ['reports', 'catalog'], queryFn: fetchReportCatalog });

export const useReport = (key: string, params: ReportQuery, enabled = true) =>
  useQuery({
    queryKey: ['reports', key, params],
    queryFn: () => fetchReport(key, params),
    enabled: enabled && !!key,
    placeholderData: keepPreviousData,
  });
