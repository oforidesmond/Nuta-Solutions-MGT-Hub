import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ReportRevenueTrendsParams,
  ReportSalesSummaryParams,
  ReportStaffPerformanceParams,
} from "@/lib/types/reports";

export interface ReportBranchContext {
  id: string;
  name: string;
}

export interface ReportEnvelope {
  branch: ReportBranchContext | null;
  reportData: Record<string, unknown>;
}

/**
 * Unwrap the `{ branch, reportData }` envelope. Back-compatible: when the body
 * has no `reportData`, treat the whole body as the report payload.
 */
function unwrapReportEnvelope(data: unknown): ReportEnvelope {
  if (!data || typeof data !== "object") {
    return { branch: null, reportData: {} };
  }
  const o = data as Record<string, unknown>;
  const branch =
    o.branch && typeof o.branch === "object"
      ? (o.branch as ReportBranchContext)
      : null;
  if (o.reportData && typeof o.reportData === "object") {
    return { branch, reportData: o.reportData as Record<string, unknown> };
  }
  return { branch, reportData: o };
}

export async function fetchReportSalesSummary(
  params: ReportSalesSummaryParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.salesSummary, {
    params: { startDate: params.startDate, endDate: params.endDate },
  });
  return unwrapReportEnvelope(res.data);
}

export async function fetchReportStaffPerformance(
  params: ReportStaffPerformanceParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.staffPerformance, {
    params: { period: params.period },
  });
  return unwrapReportEnvelope(res.data);
}

export async function fetchReportRevenueTrends(
  params: ReportRevenueTrendsParams,
): Promise<ReportEnvelope> {
  const res = await api.get(endpoints.reports.revenueTrends, {
    params: { period: params.period },
  });
  return unwrapReportEnvelope(res.data);
}
