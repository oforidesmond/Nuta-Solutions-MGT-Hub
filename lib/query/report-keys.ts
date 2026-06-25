import type { DateRangePreset } from "@/lib/date-range-presets";
import type { RevenueTrendPeriod } from "@/lib/types/reports";
import { withBranchKey } from "@/lib/query/branch-query-keys";

export const reportKeys = {
  all: (branchId: string | null) => withBranchKey(branchId, "reports"),

  salesSummary: (branchId: string | null, startDate: string, endDate: string) =>
    withBranchKey(branchId, "reports", "sales-summary", startDate, endDate),

  staffPerformance: (
    branchId: string | null,
    period: string,
    startDate?: string,
    endDate?: string,
  ) => withBranchKey(branchId, "reports", "staff-performance", period, startDate, endDate),

  revenueTrends: (
    branchId: string | null,
    granularity: RevenueTrendPeriod,
    preset?: DateRangePreset,
  ) => withBranchKey(branchId, "reports", "revenue-trends", granularity, preset),

  topProducts: (
    branchId: string | null,
    startDate: string,
    endDate: string,
    by: "revenue" | "quantity",
  ) => withBranchKey(branchId, "reports", "top-products", startDate, endDate, by),
};
