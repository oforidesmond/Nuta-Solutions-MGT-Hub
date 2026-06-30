import type { ProductLifecycleFinancialBlock } from "@/lib/types/product-lifecycle";

export type RevenueTrendPeriod = "daily" | "weekly" | "monthly";
export type StaffReportPeriod = "7d" | "30d" | "90d" | "this_month";

export interface ReportSalesSummaryParams {
  startDate: string;
  endDate: string;
}

export interface ReportStaffPerformanceParams {
  period: StaffReportPeriod;
}

export interface ReportRevenueTrendsParams {
  period: RevenueTrendPeriod;
  startDate?: string;
  endDate?: string;
}

export interface ReportBranchContext {
  id: string;
  name: string;
}

/** Branch P&L blocks — mirrors ProductLifecycleFinancials (ledger read model). */
export interface BranchLedgerSummary {
  branch: ReportBranchContext | null;
  period: { from: string; to: string } | null;
  sales: ProductLifecycleFinancialBlock;
  returns: ProductLifecycleFinancialBlock;
  shrinkage: ProductLifecycleFinancialBlock;
  netPosition: ProductLifecycleFinancialBlock;
  cogs: ProductLifecycleFinancialBlock;
  /** False when API only returns legacy totals (totalRevenue) without ledger P&L fields. */
  hasLedgerFinancials: boolean;
}

export interface StaffReportRow {
  staffId?: string;
  userId?: string;
  name: string;
  branchId?: string;
  branchName?: string;
  totalSales: string;
  transactions: number;
}

export interface RevenueTrendPoint {
  name: string;
  value: number;
}
