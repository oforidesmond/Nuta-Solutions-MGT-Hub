import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import { toNumericAmount } from "@/lib/format";

/** Ledger entry categories from ProductLedgerEntry.category (API enum). */
export type ProductLedgerCategory =
  | "SALE"
  | "VARIANCE_SALE"
  | "RETURN"
  | "SALE_VOID"
  | "STOCK_TAKE"
  | "DISCREPANCY"
  | "DAMAGE_EXPIRY"
  | "BATCH_EXPIRY"
  | "RECEIPT"
  | "INITIAL_STOCK"
  | "MANUAL_ADJUSTMENT"
  | "PRICE_CHANGE"
  | "PRODUCT_METADATA"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "CONVERSION_IN"
  | "CONVERSION_OUT"
  | string;

export type ActivityFilterChip = "all" | "sold" | "received" | "problems";

export type LedgerCategoryTone = "positive" | "negative" | "neutral" | "loss";

export type ShrinkageConcern = "low" | "medium" | "high";

export type ProductInsightPeriod = OrgAnalyticsPeriod;

export interface ProductLedgerQuantity {
  delta: string;
  before: string;
  after: string;
}

export interface ProductLedgerFinancial {
  revenue: string | null;
  cogs: string | null;
  grossProfit: string | null;
  loss: string | null;
}

export interface ProductLedgerActor {
  id: string;
  name: string;
  staffId?: string | null;
}

export interface ProductLedgerBranch {
  id: string;
  name: string;
}

export interface ProductLedgerReferences {
  saleId?: string | null;
  receiptNumber?: string | null;
  batchId?: string | null;
  transferId?: string | null;
  conversionId?: string | null;
  discrepancyId?: string | null;
}

export interface ProductLedgerEntry {
  id: string;
  occurredAt: string;
  recordedAt?: string;
  category: ProductLedgerCategory;
  sourceType?: string;
  summary: string;
  quantity: ProductLedgerQuantity;
  financial: ProductLedgerFinancial;
  actor?: ProductLedgerActor | null;
  branch?: ProductLedgerBranch | null;
  references?: ProductLedgerReferences;
  flags?: {
    hasStockVariance?: boolean;
    varianceReason?: string | null;
  };
  metadata?: Record<string, unknown>;
}

export interface ProductLifecyclePage {
  product: { id: string; name: string };
  data: ProductLedgerEntry[];
  nextCursor?: string;
}

export interface ProductLifecycleFinancialBlock {
  revenue?: string | null;
  cogs?: string | null;
  grossProfit?: string | null;
  loss?: string | null;
  count?: number | null;
  quantity?: string | null;
  [key: string]: string | number | null | undefined;
}

export interface ProductLifecycleFinancials {
  period?: { from: string; to: string };
  sales?: ProductLifecycleFinancialBlock;
  returns?: ProductLifecycleFinancialBlock;
  shrinkage?: ProductLifecycleFinancialBlock;
  netPosition?: ProductLifecycleFinancialBlock;
  inventory?: ProductLifecycleFinancialBlock;
  [key: string]: unknown;
}

export interface ProductLifecycleInvestigation {
  product: { id: string; name: string };
  netQuantityChange?: string;
  accountability?: {
    actorUserId: string;
    actorName: string;
    netQuantityChange?: string;
    lossAmount?: string | null;
    eventCount?: number;
  }[];
  highlights?: string[];
  data: ProductLedgerEntry[];
  nextCursor?: string;
}

export interface ProductLifecycleStockBalancePoint {
  occurredAt: string;
  stockAfter: string;
  ledgerEntryId?: string;
}

export interface ProductLifecycleStockBalance {
  product: { id: string; name: string };
  branch: { id: string; name: string };
  points: ProductLifecycleStockBalancePoint[];
}

export interface ProductInsightVelocity {
  daysSinceLastSale?: number | null;
  status?: "active" | "slow" | "dead" | string;
  avgDailySales?: string | null;
  period?: { from: string; to: string };
  [key: string]: unknown;
}

export interface ProductInsightShrinkage {
  score?: number | null;
  concernLevel?: ShrinkageConcern | string;
  lossAmount?: string | null;
  incidentCount?: number | null;
  period?: { from: string; to: string };
  [key: string]: unknown;
}

export function ledgerCategoryLabel(category: ProductLedgerCategory): string {
  const map: Record<string, string> = {
    SALE: "Sold",
    VARIANCE_SALE: "Sold without scanning",
    RETURN: "Customer return",
    SALE_VOID: "Sale cancelled",
    RECEIPT: "Stock received",
    INITIAL_STOCK: "Stock received",
    STOCK_TAKE: "Stock count",
    DISCREPANCY: "Stock count — short or extra",
    DAMAGE_EXPIRY: "Damaged or expired",
    BATCH_EXPIRY: "Damaged or expired",
    PRICE_CHANGE: "Price change",
    PRODUCT_METADATA: "Product updated",
    TRANSFER_IN: "Stock received",
    TRANSFER_OUT: "Stock transfer out",
    CONVERSION_IN: "Pack conversion in",
    CONVERSION_OUT: "Pack conversion out",
    MANUAL_ADJUSTMENT: "Stock adjustment",
    TRANSFER: "Stock transfer",
    CONVERSION: "Pack conversion",
  };
  return map[category] ?? category.replace(/_/g, " ").toLowerCase();
}

export function ledgerCategoryTone(category: ProductLedgerCategory): LedgerCategoryTone {
  switch (category) {
    case "SALE":
    case "VARIANCE_SALE":
      return "positive";
    case "RETURN":
    case "SALE_VOID":
      return "negative";
    case "DISCREPANCY":
    case "DAMAGE_EXPIRY":
    case "BATCH_EXPIRY":
    case "STOCK_TAKE":
      return "loss";
    default:
      return "neutral";
  }
}

export function shrinkageScoreToConcern(score: number | null | undefined): ShrinkageConcern {
  if (score == null || !Number.isFinite(score)) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function shrinkageConcernLabel(concern: ShrinkageConcern): string {
  switch (concern) {
    case "high":
      return "High concern";
    case "medium":
      return "Medium concern";
    default:
      return "Low concern";
  }
}

export function velocityStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case "slow":
      return "Slow seller";
    case "dead":
      return "No recent sales";
    case "active":
      return "Selling well";
    default:
      return "Sales activity";
  }
}

export function activityFilterChipToCategories(
  chip: ActivityFilterChip,
): ProductLedgerCategory[] | undefined {
  switch (chip) {
    case "sold":
      return ["SALE", "RETURN", "SALE_VOID", "VARIANCE_SALE"];
    case "received":
      return [
        "RECEIPT",
        "INITIAL_STOCK",
        "TRANSFER_IN",
        "CONVERSION_IN",
        "MANUAL_ADJUSTMENT",
      ];
    case "problems":
      return [
        "STOCK_TAKE",
        "DISCREPANCY",
        "DAMAGE_EXPIRY",
        "BATCH_EXPIRY",
        "MANUAL_ADJUSTMENT",
      ];
    default:
      return undefined;
  }
}

/** Refines API category matches when one category spans multiple chips (e.g. manual adjustments). */
export function activityEntryMatchesChip(
  entry: ProductLedgerEntry,
  chip: ActivityFilterChip,
): boolean {
  if (chip === "all") return true;

  const categories = activityFilterChipToCategories(chip);
  if (!categories?.includes(entry.category)) return false;

  if (entry.category === "MANUAL_ADJUSTMENT") {
    const delta = toNumericAmount(entry.quantity?.delta);
    if (chip === "received") return delta > 0;
    if (chip === "problems") return delta < 0;
  }

  return true;
}

/** Current calendar month as ISO date strings (YYYY-MM-DD). */
export function currentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  return { from: toIso(start), to: toIso(end) };
}

/** Human-readable signed quantity for accountability / investigation rows. */
export function formatLedgerQuantityDelta(delta: string | number | null | undefined): string {
  if (delta == null || delta === "") return "No change";
  const n = toNumericAmount(delta);
  const abs = Math.abs(n);
  const formatted = Number.isInteger(abs)
    ? String(abs)
    : abs.toFixed(3).replace(/\.?0+$/, "");
  if (n > 0) return `+${formatted} units`;
  if (n < 0) return `−${formatted} units`;
  return "No change";
}
