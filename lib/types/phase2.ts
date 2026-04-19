/** Phase 2 — staff mobile / Management Hub DTOs (align with Nest). */

export type HubNotificationType =
  | "TEMPORARY_ITEM_SOLD"
  | "RETURN_PROCESSED"
  | "STAFF_TIME_WARNING"
  | string;

export interface HubNotification {
  id: string;
  type: HubNotificationType;
  title?: string | null;
  message: string;
  read?: boolean;
  createdAt?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface HubTemporaryItem {
  id: string;
  barcode?: string | null;
  name?: string | null;
  price?: string | number | null;
  quantitySold?: string | number | null;
  firstSoldAt?: string | null;
  aggregateId?: string | null;
}

export type HubInventoryEventType = "SALE" | "RETURN" | "ADJUSTMENT" | "RESTOCK" | string;

export interface HubInventoryEvent {
  id: string;
  eventType?: HubInventoryEventType;
  quantityChange?: string | number | null;
  createdAt?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  staff?: { id: string; firstName?: string | null; lastName?: string | null } | null;
  staffId?: string | null;
  notes?: string | null;
}

export interface HubReturnLine {
  productId?: string;
  productName?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
}

export interface HubReturnDetail {
  id: string;
  originalSaleId: string;
  refundAmount?: string | number | null;
  refundMethod?: string | null;
  /** Fallback when backend only exposes original sale payment method */
  paymentMethod?: string | null;
  returnedItems?: HubReturnLine[];
  staffName?: string | null;
  createdAt?: string | null;
  /** Original sale snapshot when API embeds it */
  originalSale?: {
    id?: string;
    totalAmount?: string | number | null;
    soldAt?: string | null;
    receiptNumber?: string | null;
    items?: Array<{
      productId?: string;
      name?: string | null;
      quantity?: string | number | null;
      unitPrice?: string | number | null;
    }>;
  } | null;
}

export interface HubAnalyticsPerformanceRow {
  deviceModel?: string | null;
  metric?: string | null;
  avgDurationMs?: number | null;
  sampleCount?: number | null;
}

export interface HubAnalyticsCrashRow {
  id?: string;
  error?: string | null;
  deviceModel?: string | null;
  createdAt?: string | null;
  isFatal?: boolean | null;
}
