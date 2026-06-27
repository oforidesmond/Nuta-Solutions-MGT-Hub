export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "STAFF"
  | "SALES_AGENT"
  | string;

export interface HubUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  organizationId?: string | null;
  organization?: HubOrganization | null;
}

export interface HubOrganization {
  id: string;
  name: string;
  businessType?: string | null;
  businessLocation?: string | null;
  phone?: string | null;
  email?: string | null;
  currency?: string;
  defaultTaxRate?: string | number | null;
  taxEnabled?: boolean;
  expiryReminderMonths?: number | null;
  expiryAlertEnabled?: boolean;
  maxStaffDiscountPercent?: string | number | null;
  maxStaffDiscountAmount?: string | number | null;
  alertOwnerOnExcessDiscount?: boolean;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Category from GET /categories (API may use UUID id + name + productCount). */
export interface HubCategory {
  id: string;
  name: string;
  description?: string | null;
  productCount?: number;
}

export interface HubProduct {
  id: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  /** Longer text (API / Prisma) */
  description?: string | null;
  categoryId?: string | null;
  /** String (legacy) or nested category from API. */
  category?: HubCategory | string | null;
  /** Effective prices for the active branch (override if set, else org default). */
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
  /** Org-wide default prices from the product. */
  orgCostPrice?: string | number | null;
  orgSellingPrice?: string | number | null;
  /** Active branch override, or null if none. */
  branchCostPriceOverride?: string | number | null;
  branchSellingPriceOverride?: string | number | null;
  /** true when either branch price override is set. */
  hasBranchPriceOverride?: boolean;
  /** Same as currentStock in Prisma; APIs may use stockQuantity */
  currentStock?: string | number | null;
  stockQuantity?: string | number | null;
  reorderLevel?: string | number | null;
  unit?: string | null;
  unitOfMeasure?: string | null;
  taxable?: boolean;
  customTaxRate?: string | number | null;
  taxRate?: string | number | null;
  isActive?: boolean;
  /** Nearest batch expiry or server-computed status */
  expirySummary?: string | null;
  nearestExpiryDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  batches?: HubBatch[];
  /** Summary rows from GET /products/expiring-soon. */
  expiringBatches?: HubExpiringBatch[];
}

export interface HubExpiringBatch {
  id?: string;
  batchNumber?: string | null;
  remainingQuantity?: string | number | null;
  expiryDate?: string | null;
  daysUntilExpiry?: number | null;
}

/** GET /products/:id/price-context - everything the price-edit modal needs. */
export interface ProductPriceContext {
  productId: string;
  orgCostPrice?: string | null;
  orgSellingPrice?: string | null;
  /** null if no branch override. */
  branchCostPrice?: string | null;
  branchSellingPrice?: string | null;
  effectiveCostPrice?: string | null;
  effectiveSellingPrice?: string | null;
  activeBranchId?: string | null;
}

/** Scope flag for price writes (required when a price field is present). */
export type PriceScope = "ORG" | "BRANCH";

export interface HubBatch {
  id: string;
  productId?: string;
  batchNumber?: string | null;
  quantity?: string | number | null;
  remainingQuantity?: string | number | null;
  expiryDate?: string | null;
  manufacturedDate?: string | null;
  isExpired?: boolean;
  notes?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  /** Flat product name from list endpoints when `product` is not nested. */
  productName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  product?: Pick<HubProduct, "id" | "name" | "sku"> | null;
}

/** Nested leg on conversion-related adjustments from GET /inventory/adjustments */
export interface HubLinkedAdjustmentSummary {
  id: string;
  type?: string;
  quantityChange?: string | number | null;
  product?: { id: string; name: string; sku: string | null };
}

export interface HubStockAdjustment {
  id: string;
  type?: string;
  quantityBefore?: string | number | null;
  quantityAfter?: string | number | null;
  quantityChange?: string | number | null;
  reason?: string | null;
  notes?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  createdAt?: string | null;
  user?: { id: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  linkedAdjustmentId?: string | null;
  linkedAdjustment?: HubLinkedAdjustmentSummary | null;
  product?: { id: string; name: string; sku?: string | null };
}

/** Stock variance reasons - exact API enum literals. Mirror mobile copy via VARIANCE_REASON_LABELS. */
export type VarianceReason =
  | "PHYSICAL_STOCK_PRESENT"
  | "PACK_BROKEN"
  | "STOCK_NOT_RECEIVED"
  | "EMERGENCY_SALE"
  | "SYSTEM_ERROR"
  | "OTHER";

/** A single sale line as serialized by the API (financials remain strings). */
export interface HubSaleLine {
  id?: string;
  productId?: string | null;
  productName?: string | null;
  productSku?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  lineTotal?: string | number | null;
  /** True only for lines that sold short vs system stock at sync time. */
  hasStockVariance?: boolean;
  varianceReason?: VarianceReason | null;
  varianceNote?: string | null;
  varianceApprovedById?: string | null;
  varianceApprovedAt?: string | null;
  /** Human-readable staffProfile.staffId (e.g. STF-001) when resolvable. */
  varianceApprovedStaffId?: string | null;
}

export interface HubSale {
  id: string;
  totalAmount: string | number;
  /** Pre-tax/discount subtotal when API emits it. */
  subtotal?: string | number | null;
  /** Order-level discount amount when API emits it. */
  discountAmount?: string | number | null;
  paymentMethod?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  soldAt?: string | null;
  /** When the sale was persisted/synced server-side - required for delayed-sync UI. */
  syncedAt?: string | null;
  createdAt?: string | null;
  createdBy?: { id: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  createdById?: string;
  /** From `receipt_number` / `receiptNumber` on the API after normalization. */
  receiptNumber?: string;
  /** Mobile-issued receipt alias (`receipt_number_mobile`). */
  receiptNumberMobile?: string | null;
  /** Server-flagged delayed sync passthrough (when API includes it on serializeSale). */
  isDelayedSync?: boolean;
  /** True if any line on the sale was recorded as a stock variance. */
  hasStockVariance?: boolean;
  /** True when the sale was voided (stock restored, ledger reversed). */
  isVoided?: boolean;
  voidedAt?: string | null;
  voidReason?: string | null;
  /** Present on `GET /sales`, `GET /sales/with-variances`, and `GET /sales/:id`. */
  items?: HubSaleLine[];
}

/** Optional Phase 3 block when backend extends `GET /dashboard/summary`. */
export interface DashboardReliabilitySummary {
  backupsLast7DaysCount?: number;
  backupsLast7DaysLatestReceivedAt?: string | null;
  storageCriticalLast24hCount?: number;
  storageCriticalLast7DaysCount?: number;
  databaseIssuesLast7DaysCount?: number;
  crashesLast24hCount?: number;
  crashesLast24hFatalCount?: number;
  latestCriticalStorageAt?: string | null;
}

export interface DashboardSummary {
  /** Active branch context for this summary (GET /dashboard/summary). */
  branch?: { id: string; name: string; isDefault?: boolean } | null;
  /** All-time count of recorded sales/transactions - not monetary. */
  totalSales: number;
  /** All-time revenue (decimals); never substitute `totalSales` for currency KPIs. */
  totalRevenue: number;
  /** Active catalogue SKUs; prefer over `inventoryCount` when backend provides it (`inventoryCount` may be units on hand). */
  totalActiveProducts?: number;
  inventoryCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  todaySales?: number;
  todayRevenue?: number;
  /** Optional when API grows */
  inventoryValue?: number;
  /** Phase 3 - may be nested under `reliability` or flattened with snake_case from API */
  reliability?: DashboardReliabilitySummary | null;
}
