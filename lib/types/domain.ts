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
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
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
}

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
  createdAt?: string | null;
  updatedAt?: string | null;
  product?: Pick<HubProduct, "id" | "name" | "sku"> | null;
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
  createdAt?: string | null;
  user?: { id: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
}

export interface HubSale {
  id: string;
  totalAmount: string | number;
  soldAt?: string | null;
  /** When the sale was persisted/synced server-side — required for delayed-sync UI. */
  syncedAt?: string | null;
  createdAt?: string | null;
  createdBy?: { id: string; firstName?: string | null; lastName?: string | null; email?: string } | null;
  createdById?: string;
  /** From `receipt_number` / `receiptNumber` on the API after normalization. */
  receiptNumber?: string;
}

export interface DashboardSummary {
  totalSales: number;
  inventoryCount: number;
  lowStockCount: number;
  expiringSoonCount: number;
  /** Optional when API grows */
  todaySales?: number;
  inventoryValue?: number;
}
