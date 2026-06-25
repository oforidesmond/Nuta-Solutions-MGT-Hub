import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import {
  shrinkageConcernLabel,
  shrinkageScoreToConcern,
  type ShrinkageConcern,
} from "@/lib/types/product-lifecycle";

export type OrgInsightPeriod = OrgAnalyticsPeriod;

export interface OrgInsightProductRow {
  productId?: string | null;
  productName?: string | null;
  name?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  lossAmount?: string | null;
  shrinkageScore?: number | null;
  concernLevel?: ShrinkageConcern | string | null;
  stockValue?: string | null;
  returnRate?: string | null;
  returnCount?: number | null;
  [key: string]: unknown;
}

export interface OrgInsightStaffRow {
  userId?: string | null;
  staffId?: string | null;
  name?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  accountabilityIndex?: number | null;
  lossAmount?: string | null;
  eventCount?: number | null;
  [key: string]: unknown;
}

export interface OrgInsightBatchRow {
  batchId?: string | null;
  batchNumber?: string | null;
  productId?: string | null;
  productName?: string | null;
  branchName?: string | null;
  roi?: string | null;
  revenue?: string | null;
  cost?: string | null;
  [key: string]: unknown;
}

export interface OrgInsightIncidentRow {
  label?: string | null;
  description?: string | null;
  window?: string | null;
  count?: number | null;
  lossAmount?: string | null;
  [key: string]: unknown;
}

export interface OrgInsightShrinkage {
  period?: { from: string; to: string };
  items: OrgInsightProductRow[];
  totalLoss?: string | null;
  highConcernCount?: number | null;
  [key: string]: unknown;
}

export interface OrgInsightSlowStock {
  period?: { from: string; to: string };
  items: OrgInsightProductRow[];
  totalValue?: string | null;
  [key: string]: unknown;
}

export interface OrgInsightReturnRates {
  period?: { from: string; to: string };
  items: OrgInsightProductRow[];
  [key: string]: unknown;
}

export interface OrgInsightTransferLeakage {
  period?: { from: string; to: string };
  items: OrgInsightProductRow[];
  [key: string]: unknown;
}

export interface OrgInsightBatchPerformance {
  period?: { from: string; to: string };
  items: OrgInsightBatchRow[];
  [key: string]: unknown;
}

export interface OrgInsightVarianceSales {
  period?: { from: string; to: string };
  items: OrgInsightProductRow[];
  [key: string]: unknown;
}

export interface OrgInsightIncidentPatterns {
  period?: { from: string; to: string };
  items: OrgInsightIncidentRow[];
  [key: string]: unknown;
}

export interface OrgInsightStaffAccountability {
  period?: { from: string; to: string };
  items: OrgInsightStaffRow[];
  [key: string]: unknown;
}

export type OrgInsightDetailState =
  | { kind: "shrinkage"; data: OrgInsightShrinkage }
  | { kind: "slowStock"; data: OrgInsightSlowStock }
  | { kind: "returns"; data: OrgInsightReturnRates }
  | { kind: "transfer"; data: OrgInsightTransferLeakage }
  | { kind: "batch"; data: OrgInsightBatchPerformance }
  | { kind: "variance"; data: OrgInsightVarianceSales }
  | { kind: "incidents"; data: OrgInsightIncidentPatterns }
  | { kind: "staff"; data: OrgInsightStaffAccountability };

export function formatInsightMoney(
  value: string | number | null | undefined,
  currency: string,
): string {
  if (value == null) return "-";
  return formatCurrency(toNumericAmount(value), currency);
}

export function accountabilityReviewLabel(index: number | null | undefined): string {
  if (index == null || !Number.isFinite(index)) return "Normal activity";
  if (index >= 70) return "Worth a review";
  if (index >= 40) return "Some activity to check";
  return "Normal activity";
}

export function productConcernLabel(row: OrgInsightProductRow): string {
  if (row.concernLevel && ["low", "medium", "high"].includes(String(row.concernLevel))) {
    return shrinkageConcernLabel(row.concernLevel as ShrinkageConcern);
  }
  return shrinkageConcernLabel(shrinkageScoreToConcern(row.shrinkageScore));
}

export function rowDisplayName(row: { name?: string | null; productName?: string | null }): string {
  return row.productName ?? row.name ?? "Unknown";
}
