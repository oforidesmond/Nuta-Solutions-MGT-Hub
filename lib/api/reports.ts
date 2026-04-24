import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ReportRevenueTrendsParams,
  ReportSalesSummaryParams,
  ReportStaffPerformanceParams,
} from "@/lib/types/reports";

export async function fetchReportSalesSummary(params: ReportSalesSummaryParams): Promise<Record<string, unknown>> {
  const res = await api.get(endpoints.reports.salesSummary, {
    params: { startDate: params.startDate, endDate: params.endDate },
  });
  return res.data && typeof res.data === "object" ? (res.data as Record<string, unknown>) : {};
}

export async function fetchReportStaffPerformance(
  params: ReportStaffPerformanceParams,
): Promise<Record<string, unknown>> {
  const res = await api.get(endpoints.reports.staffPerformance, {
    params: { period: params.period },
  });
  return res.data && typeof res.data === "object" ? (res.data as Record<string, unknown>) : {};
}

export async function fetchReportRevenueTrends(
  params: ReportRevenueTrendsParams,
): Promise<Record<string, unknown>> {
  const res = await api.get(endpoints.reports.revenueTrends, {
    params: { period: params.period },
  });
  return res.data && typeof res.data === "object" ? (res.data as Record<string, unknown>) : {};
}
