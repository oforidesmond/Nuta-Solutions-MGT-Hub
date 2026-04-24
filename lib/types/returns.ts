export interface ReturnsListParams {
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  staffId?: string;
  branchId?: string;
}

export interface PaginatedReturnsResponse<T = Record<string, unknown>> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
