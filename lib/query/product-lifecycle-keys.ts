import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import type { ActivityFilterChip } from "@/lib/types/product-lifecycle";
import { withBranchKey } from "@/lib/query/branch-query-keys";

export type LifecycleTimelineFilters = {
  chip: ActivityFilterChip;
  from?: string;
  to?: string;
};

export type InvestigationFilters = {
  from: string;
  to: string;
  actorUserIds: string[];
};

export const productLifecycleKeys = {
  all: (branchId: string | null) => withBranchKey(branchId, "product-lifecycle"),

  timeline: (
    productId: string,
    branchId: string | null,
    filters: LifecycleTimelineFilters,
  ) =>
    withBranchKey(branchId, "product-lifecycle", "timeline", productId, filters),

  financials: (
    productId: string,
    branchId: string | null,
    range: { from: string; to: string },
  ) =>
    withBranchKey(branchId, "product-lifecycle", "financials", productId, range),

  investigation: (
    productId: string,
    branchId: string | null,
    filters: InvestigationFilters,
  ) =>
    withBranchKey(branchId, "product-lifecycle", "investigation", productId, filters),
};

export const productInsightKeys = {
  velocity: (productId: string, branchId: string | null) =>
    withBranchKey(branchId, "product-insights", "velocity", productId),

  shrinkage: (
    productId: string,
    branchId: string | null,
    range: { from: string; to: string },
  ) => withBranchKey(branchId, "product-insights", "shrinkage", productId, range),
};

export const orgInsightKeys = {
  all: (branchId: string | null) => withBranchKey(branchId, "org-insights"),

  shrinkage: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "shrinkage", period),

  slowStock: (branchId: string | null, daysWithoutSale = 30) =>
    withBranchKey(branchId, "org-insights", "slow-stock", daysWithoutSale),

  varianceSales: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "variance-sales", period),

  batchPerformance: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "batch-performance", period),

  transferLeakage: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "transfer-leakage", period),

  returnRates: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "return-rates", period),

  incidentPatterns: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "incident-patterns", period),

  staffAccountability: (branchId: string | null, period: OrgAnalyticsPeriod = "month") =>
    withBranchKey(branchId, "org-insights", "staff-accountability", period),

  staffActivity: (
    userId: string,
    branchId: string | null,
    period: OrgAnalyticsPeriod = "month",
  ) =>
    withBranchKey(branchId, "org-insights", "staff-activity", userId, period),
};

export const batchTraceKeys = {
  detail: (productId: string, batchId: string, branchId: string | null) =>
    withBranchKey(branchId, "batch-trace", productId, batchId),
};
