import type { HubSale, VarianceReason } from "@/lib/types/domain";

export interface SalesListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  staffId?: string;
  paymentMethod?: string;
}

export interface SalesVarianceListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  productId?: string;
  varianceReason?: VarianceReason;
}

export type SalesExportParams = Pick<
  SalesListParams,
  "startDate" | "endDate" | "staffId" | "paymentMethod"
>;

export interface PaginatedSalesResponse {
  data: HubSale[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Normalized from API; extra keys preserved for dashboard use. */
export type SalesStatsPayload = Record<string, unknown>;
