import { endpoints } from "@/lib/api/endpoints";
import { platformGet } from "@/lib/api/platform/_pagination";
import type {
  GrowthAnalytics,
  GrowthAnalyticsParams,
  PlanDistribution,
} from "@/lib/types/platform";

export async function fetchGrowthAnalytics(
  params: GrowthAnalyticsParams,
): Promise<GrowthAnalytics> {
  return platformGet<GrowthAnalytics>(endpoints.platform.analyticsGrowth, {
    startDate: params.startDate,
    endDate: params.endDate,
    groupBy: params.groupBy,
  });
}

export async function fetchPlanDistribution(): Promise<PlanDistribution> {
  return platformGet<PlanDistribution>(endpoints.platform.analyticsPlans);
}
