export interface InventoryLogListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  staffId?: string;
  /** e.g. BULK_TO_SINGLES - server returns only that adjustment type */
  type?: string;
}

export interface PaginatedInventoryRows<T = Record<string, unknown>> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
