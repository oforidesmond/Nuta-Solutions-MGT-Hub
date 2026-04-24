export interface InventoryLogListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  staffId?: string;
}

export interface PaginatedInventoryRows<T = Record<string, unknown>> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
