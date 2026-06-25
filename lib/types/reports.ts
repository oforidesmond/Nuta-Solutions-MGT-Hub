import type { ProductLifecycleFinancialBlock } from "@/lib/types/product-lifecycle";

export type RevenueTrendPeriod = "daily" | "weekly" | "monthly";
export type StaffReportPeriod = "7d" | "30d" | "90d" | "this_month";

export interface ReportSalesSummaryParams {
  startDate: string;
  endDate: string;
}

export interface ReportStaffPerformanceParams {
  period: StaffReportPeriod;
  startDate?: string;
  endDate?: string;
}

export interface ReportRevenueTrendsParams {
  period: RevenueTrendPeriod;
  startDate?: string;
  endDate?: string;
}

export interface ReportTopProductsParams {
  startDate: string;
  endDate: string;
  by?: "revenue" | "quantity";
  limit?: number;
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

export interface ReportTopProductRow {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: string;
  contributionPercent?: string | null;
}

export interface ReportTopProducts {
  period: { from: string; to: string } | null;
  products: ReportTopProductRow[];
}
