import { endpoints } from "@/lib/api/endpoints";
import { platformGet } from "@/lib/api/platform/_pagination";
import type {
  CrashReportsParams,
  CrashReportsResponse,
  DeviceHealthResponse,
  PerformanceMetricsParams,
  PerformanceMetricsResponse,
} from "@/lib/types/platform";

export async function fetchCrashReports(
  params: CrashReportsParams = {},
): Promise<CrashReportsResponse> {
  return platformGet<CrashReportsResponse>(endpoints.platform.telemetryCrashes, {
    organizationId: params.organizationId,
    userId: params.userId,
    isFatal: params.isFatal,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit,
  });
}

export async function fetchPerformanceMetrics(
  params: PerformanceMetricsParams = {},
): Promise<PerformanceMetricsResponse> {
  return platformGet<PerformanceMetricsResponse>(
    endpoints.platform.telemetryPerformance,
    {
      organizationId: params.organizationId,
      metric: params.metric,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  );
}

export async function fetchDeviceHealth(
  organizationId?: string,
): Promise<DeviceHealthResponse> {
  return platformGet<DeviceHealthResponse>(
    endpoints.platform.telemetryDeviceHealth,
    { organizationId },
  );
}
