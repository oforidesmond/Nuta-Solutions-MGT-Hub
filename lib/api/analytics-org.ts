import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";

/** Period values accepted by org-wide analytics endpoints. */
export type OrgAnalyticsPeriod = "today" | "week" | "month" | "quarter" | "year";

export interface OrgPeriodRange {
  from: string;
  to: string;
}

export interface OrgRevenue {
  totalRevenue: string;
  totalTransactions: number;
  averageOrderValue: string;
  period: OrgPeriodRange;
  breakdown: { date: string; revenue: string; transactions: number }[];
}

export interface OrgProfit {
  totalRevenue: string;
  totalCOGS: string;
  grossProfit: string;
  grossMargin: string;
  period: OrgPeriodRange;
}

export interface OrgTopProduct {
  productId: string;
  name: string;
  totalQuantitySold: number;
  totalRevenue: string;
  contributionPercent: string;
}

export interface OrgTopProducts {
  period: OrgPeriodRange;
  products: OrgTopProduct[];
}

export interface OrgLowStockBranch {
  branchId: string;
  branchName: string;
  currentStock: string;
  reorderLevel: string;
}

export interface OrgLowStockItem {
  productId: string;
  name: string;
  branches: OrgLowStockBranch[];
}

export interface OrgLowStock {
  items: OrgLowStockItem[];
  totalAffectedProducts: number;
}

export interface OrgBranchComparisonRow {
  branchId: string;
  branchName: string;
  revenue: string;
  transactions: number;
  averageOrderValue: string;
  grossProfit: string;
  grossMargin: string;
  topProduct: { name: string; revenue: string } | null;
  stockAlerts: number;
}

export interface OrgBranchComparison {
  period: OrgPeriodRange;
  branches: OrgBranchComparisonRow[];
  winner: { byRevenue: string | null; byMargin: string | null };
}

export interface OrgStaffRow {
  staffId: string;
  name: string;
  branchId: string;
  branchName: string;
  totalSales: string;
  transactions: number;
}

export interface OrgStaffPerformance {
  period: OrgPeriodRange;
  staff: OrgStaffRow[];
}

export interface OrgReturnsBranch {
  branchId: string;
  branchName: string;
  returns: number;
  returnRate: string | null;
}

export interface OrgReturnsSummary {
  totalReturns: number;
  returnRate: string | null;
  totalReturnValue: string;
  period: OrgPeriodRange;
  byBranch: OrgReturnsBranch[];
}

export interface OrgInventoryValueBranch {
  branchId: string;
  branchName: string;
  value: string;
  productCount: number;
}

export interface OrgInventoryValue {
  totalInventoryValue: string;
  byBranch: OrgInventoryValueBranch[];
}

export interface OrgSalesVelocityRow {
  productId: string;
  name: string;
  avgDailySales: string;
  daysOfStockLeft: number | null;
}

export interface OrgSalesVelocity {
  period: OrgPeriodRange;
  products: OrgSalesVelocityRow[];
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data && !("period" in data)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function fetchOrgRevenue(period: OrgAnalyticsPeriod): Promise<OrgRevenue> {
  const res = await api.get(endpoints.analyticsOrg.revenue, { params: { period } });
  return unwrap<OrgRevenue>(res.data);
}

export async function fetchOrgProfit(period: OrgAnalyticsPeriod): Promise<OrgProfit> {
  const res = await api.get(endpoints.analyticsOrg.profit, { params: { period } });
  return unwrap<OrgProfit>(res.data);
}

export async function fetchOrgTopProducts(
  period: OrgAnalyticsPeriod,
  by: "revenue" | "quantity",
  limit = 10,
): Promise<OrgTopProducts> {
  const res = await api.get(endpoints.analyticsOrg.topProducts, {
    params: { period, by, limit },
  });
  return unwrap<OrgTopProducts>(res.data);
}

export async function fetchOrgLowStock(): Promise<OrgLowStock> {
  const res = await api.get(endpoints.analyticsOrg.lowStock);
  return unwrap<OrgLowStock>(res.data);
}

export async function fetchOrgBranchComparison(
  period: OrgAnalyticsPeriod,
): Promise<OrgBranchComparison> {
  const res = await api.get(endpoints.analyticsOrg.branchComparison, {
    params: { period },
  });
  return unwrap<OrgBranchComparison>(res.data);
}

export async function fetchOrgStaffPerformance(
  period: OrgAnalyticsPeriod,
  limit = 10,
): Promise<OrgStaffPerformance> {
  const res = await api.get(endpoints.analyticsOrg.staffPerformance, {
    params: { period, limit },
  });
  return unwrap<OrgStaffPerformance>(res.data);
}

export async function fetchOrgReturnsSummary(
  period: OrgAnalyticsPeriod,
): Promise<OrgReturnsSummary> {
  const res = await api.get(endpoints.analyticsOrg.returnsSummary, {
    params: { period },
  });
  return unwrap<OrgReturnsSummary>(res.data);
}

export async function fetchOrgInventoryValue(): Promise<OrgInventoryValue> {
  const res = await api.get(endpoints.analyticsOrg.inventoryValue);
  return unwrap<OrgInventoryValue>(res.data);
}

export async function fetchOrgSalesVelocity(
  period: OrgAnalyticsPeriod,
  limit = 20,
): Promise<OrgSalesVelocity> {
  const res = await api.get(endpoints.analyticsOrg.salesVelocity, {
    params: { period, limit },
  });
  return unwrap<OrgSalesVelocity>(res.data);
}
