import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { arrayQueryParamsSerializer, cleanQueryParams } from "@/lib/api/query-params";
import type {
  ProductLedgerCategory,
  ProductLedgerEntry,
  ProductLifecycleFinancials,
  ProductLifecycleInvestigation,
  ProductLifecyclePage,
  ProductLifecycleStockBalance,
} from "@/lib/types/product-lifecycle";
import { currentMonthDateRange } from "@/lib/types/product-lifecycle";

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data && !("product" in data)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function normalizeLedgerEntry(raw: unknown): ProductLedgerEntry {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      occurredAt: "",
      category: "SALE",
      summary: "",
      quantity: { delta: "0", before: "0", after: "0" },
      financial: { revenue: null, cogs: null, grossProfit: null, loss: null },
    };
  }
  const r = raw as Record<string, unknown>;
  const qty = (r.quantity ?? {}) as Record<string, unknown>;
  const fin = (r.financial ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    occurredAt: String(r.occurredAt ?? ""),
    recordedAt: r.recordedAt != null ? String(r.recordedAt) : undefined,
    category: String(r.category ?? ""),
    sourceType: r.sourceType != null ? String(r.sourceType) : undefined,
    summary: String(r.summary ?? ""),
    quantity: {
      delta: String(qty.delta ?? "0"),
      before: String(qty.before ?? "0"),
      after: String(qty.after ?? "0"),
    },
    financial: {
      revenue: fin.revenue != null ? String(fin.revenue) : null,
      cogs: fin.cogs != null ? String(fin.cogs) : null,
      grossProfit: fin.grossProfit != null ? String(fin.grossProfit) : null,
      loss: fin.loss != null ? String(fin.loss) : null,
    },
    actor: r.actor as ProductLedgerEntry["actor"],
    branch: r.branch as ProductLedgerEntry["branch"],
    references: r.references as ProductLedgerEntry["references"],
    flags: r.flags as ProductLedgerEntry["flags"],
    metadata: r.metadata as Record<string, unknown> | undefined,
  };
}

function normalizeLifecyclePage(raw: unknown): ProductLifecyclePage {
  if (!raw || typeof raw !== "object") {
    return { product: { id: "", name: "" }, data: [] };
  }
  const r = raw as Record<string, unknown>;
  const product = (r.product ?? {}) as Record<string, unknown>;
  const list = Array.isArray(r.data) ? r.data : [];
  return {
    product: {
      id: String(product.id ?? ""),
      name: String(product.name ?? ""),
    },
    data: list.map(normalizeLedgerEntry),
    nextCursor: r.nextCursor != null ? String(r.nextCursor) : undefined,
  };
}

export type ProductLifecycleQueryParams = {
  branchId?: string;
  from?: string;
  to?: string;
  actorUserId?: string;
  actorUserIds?: string[];
  categories?: ProductLedgerCategory[];
  cursor?: string;
  limit?: number;
};

export type ProductLifecycleFinancialsParams = {
  branchId?: string;
  from?: string;
  to?: string;
};

export async function fetchProductLifecyclePage(
  productId: string,
  params: ProductLifecycleQueryParams = {},
): Promise<ProductLifecyclePage> {
  const res = await api.get(endpoints.productLifecycle(productId), {
    params: cleanQueryParams({
      branchId: params.branchId,
      from: params.from,
      to: params.to,
      actorUserId: params.actorUserId,
      actorUserIds: params.actorUserIds,
      categories: params.categories,
      cursor: params.cursor,
      limit: params.limit ?? 50,
    }),
    paramsSerializer: arrayQueryParamsSerializer,
  });
  return normalizeLifecyclePage(res.data);
}

export async function fetchProductLifecycleFinancials(
  productId: string,
  params: ProductLifecycleFinancialsParams = {},
): Promise<ProductLifecycleFinancials> {
  const range = currentMonthDateRange();
  const res = await api.get(endpoints.productLifecycleFinancials(productId), {
    params: cleanQueryParams({
      branchId: params.branchId,
      from: params.from ?? range.from,
      to: params.to ?? range.to,
    }),
  });
  return unwrapEntity<ProductLifecycleFinancials>(res.data);
}

export async function fetchProductLifecycleInvestigation(
  productId: string,
  params: ProductLifecycleQueryParams = {},
): Promise<ProductLifecycleInvestigation> {
  const res = await api.get(endpoints.productLifecycleInvestigation(productId), {
    params: cleanQueryParams({
      branchId: params.branchId,
      from: params.from,
      to: params.to,
      actorUserIds: params.actorUserIds,
      categories: params.categories,
      cursor: params.cursor,
      limit: params.limit ?? 50,
    }),
    paramsSerializer: arrayQueryParamsSerializer,
  });
  const raw = unwrapEntity<Record<string, unknown>>(res.data);
  const page = normalizeLifecyclePage(raw);
  return {
    product: page.product,
    netQuantityChange:
      raw.netQuantityChange != null ? String(raw.netQuantityChange) : undefined,
    accountability: Array.isArray(raw.accountability)
      ? (raw.accountability as ProductLifecycleInvestigation["accountability"])
      : undefined,
    highlights: Array.isArray(raw.highlights)
      ? (raw.highlights as string[])
      : undefined,
    data: page.data,
    nextCursor: page.nextCursor,
  };
}

export async function fetchProductLifecycleStockBalance(
  productId: string,
  params: { branchId?: string; from?: string; to?: string } = {},
): Promise<ProductLifecycleStockBalance> {
  const res = await api.get(endpoints.productLifecycleStockBalance(productId), {
    params: cleanQueryParams(params),
  });
  return unwrapEntity<ProductLifecycleStockBalance>(res.data);
}

export async function fetchProductLifecycleConversions(
  productId: string,
  params: { branchId?: string; from?: string; to?: string } = {},
): Promise<unknown> {
  const res = await api.get(endpoints.productLifecycleConversions(productId), {
    params: cleanQueryParams(params),
  });
  return unwrapEntity(res.data);
}
