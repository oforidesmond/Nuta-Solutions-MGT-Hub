import type { HubSale } from "@/lib/types/domain";

export interface SalesListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  staffId?: string;
  branchId?: string;
  paymentMethod?: string;
}

export type SalesExportParams = Pick<
  SalesListParams,
  "startDate" | "endDate" | "staffId" | "branchId" | "paymentMethod"
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
