import type { PageMeta } from "@/lib/types/domain";

const emptyMeta = (page: number, limit: number): PageMeta => ({
  page,
  limit,
  total: 0,
  totalPages: 0,
});

/** Normalize { data, meta } | { products } | plain array responses. */
export function unwrapList<T>(raw: unknown, fallbackPage = 1, fallbackLimit = 20): {
  items: T[];
  meta: PageMeta;
} {
  if (raw == null) {
    return { items: [], meta: emptyMeta(fallbackPage, fallbackLimit) };
  }
  if (Array.isArray(raw)) {
    const n = raw.length;
    return {
      items: raw as T[],
      meta: {
        page: fallbackPage,
        limit: fallbackLimit,
        total: n,
        totalPages: n === 0 ? 0 : Math.max(1, Math.ceil(n / fallbackLimit)),
      },
    };
  }
  if (typeof raw !== "object") {
    return { items: [], meta: emptyMeta(fallbackPage, fallbackLimit) };
  }
  const o = raw as Record<string, unknown>;
  const data = o.data ?? o.items ?? o.products ?? o.results;
  const items = Array.isArray(data) ? (data as T[]) : [];
  const metaRaw = o.meta as Partial<PageMeta> | undefined;
  if (metaRaw && typeof metaRaw.page === "number") {
    const limit = metaRaw.limit ?? fallbackLimit;
    const total = metaRaw.total ?? items.length;
    const totalPages =
      metaRaw.totalPages ??
      (total === 0 ? 0 : Math.max(1, Math.ceil(total / limit)));
    return {
      items,
      meta: {
        page: metaRaw.page,
        limit,
        total,
        totalPages,
      },
    };
  }
  const total = typeof o.total === "number" ? o.total : items.length;
  const limit = typeof o.limit === "number" ? o.limit : fallbackLimit;
  const page = typeof o.page === "number" ? o.page : fallbackPage;
  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.max(1, Math.ceil(total / limit)),
    },
  };
}
