export interface StockTakeUser {
  id: string;
  email: string;
  staffId: string | null;
  branchId: string | null;
}

export interface StockTakeProduct {
  id: string;
  name: string;
  sku: string | null;
}

export interface StockTakeRow {
  id: string;
  quantityBefore: string;
  quantityAfter: string;
  quantityChange: string;
  reason: string | null;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: string;
  /** Negative = loss, positive = gain (decimal string from API). */
  financialImpact: string | null;
  /** Negative = shortage, positive = overage; null e.g. when system stock was 0. */
  variancePercentage: string | null;
  product: StockTakeProduct;
  user: StockTakeUser | null;
}

/** Aggregates for the current list query (same date/branch filters as rows). */
export interface StockTakesSummary {
  totalFinancialImpact: string;
  totalShrinkageCost: string;
  totalOverageCost: string;
  averageVariancePercentage: string;
}

export interface StockTakesListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedStockTakes {
  data: StockTakeRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Present when API returns summary; omitted on older backends. */
  summary: StockTakesSummary | null;
}

export interface CreateStockTakePayload {
  productId: string;
  physicalCount: number;
  notes?: string;
}
