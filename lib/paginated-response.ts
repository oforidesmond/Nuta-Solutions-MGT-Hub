/** Parse standard paginated JSON: `{ data, page, limit, total, totalPages }`. */
export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function parsePaginatedBody<T>(
  body: unknown,
  mapRow: (row: unknown) => T,
): PaginatedResult<T> {
  if (!body || typeof body !== "object") {
    return { data: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  }
  const o = body as Record<string, unknown>;
  const rawList = Array.isArray(o.data) ? o.data : [];
  const page = typeof o.page === "number" ? o.page : Number(o.page) || 1;
  const limitRaw = typeof o.limit === "number" ? o.limit : Number(o.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : rawList.length || 20;
  const totalRaw = typeof o.total === "number" ? o.total : Number(o.total);
  const total = Number.isFinite(totalRaw) ? totalRaw : rawList.length;
  const totalPagesRaw =
    typeof o.totalPages === "number"
      ? o.totalPages
      : typeof o.total_pages === "number"
        ? o.total_pages
        : undefined;
  const totalPages =
    typeof totalPagesRaw === "number" && Number.isFinite(totalPagesRaw)
      ? totalPagesRaw
      : Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return {
    data: rawList.map((row) => mapRow(row)),
    page,
    limit,
    total,
    totalPages,
  };
}
