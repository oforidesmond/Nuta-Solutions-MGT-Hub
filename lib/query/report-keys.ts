import type { RevenueTrendPeriod } from "@/lib/types/reports";import { withBranchKey } from "@/lib/query/branch-query-keys";

export const reportKeys = {
  all: (branchId: string | null) => withBranchKey(branchId, "reports"),

  salesSummary: (branchId: string | null, startDate: string, endDate: string) =>
    withBranchKey(branchId, "reports", "sales-summary", startDate, endDate),

  staffPerformance: (branchId: string | null, period: string) =>
    withBranchKey(branchId, "reports", "staff-performance", period),

  revenueTrends: (
    branchId: string | null,
    granularity: RevenueTrendPeriod,
    startDate: string,
    endDate: string,
  ) =>
    withBranchKey(
      branchId,
      "reports",
      "revenue-trends",
      granularity,
      startDate,
      endDate,
    ),

  orgTopProducts: (
    period: string,
    from: string | undefined,
    to: string | undefined,
    by: "revenue" | "quantity",
  ) => ["org-analytics", "top-products", period, from, to, by] as const,
};
