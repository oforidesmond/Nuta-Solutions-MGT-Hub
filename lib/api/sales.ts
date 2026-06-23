import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubSale, HubSaleLine, VarianceReason } from "@/lib/types/domain";
import type {
  PaginatedSalesResponse,
  SalesExportParams,
  SalesListParams,
  SalesStatsPayload,
  SalesVarianceListParams,
} from "@/lib/types/sales";

const VARIANCE_LIMIT_MAX = 100;

function pickStringy(
  r: Record<string, unknown>,
  ...keys: string[]
): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" || typeof v === "number") return String(v);
  }
  return undefined;
}

function pickAmount(
  r: Record<string, unknown>,
  ...keys: string[]
): string | number | null | undefined {
  for (const k of keys) {
    const v = r[k];
    if (v === null) return null;
    if (typeof v === "string" || typeof v === "number") return v;
  }
  return undefined;
}

function pickBoolean(
  r: Record<string, unknown>,
  ...keys: string[]
): boolean | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

function normalizeSaleLine(raw: unknown): HubSaleLine {
  if (!raw || typeof raw !== "object") return { hasStockVariance: false };
  const r = raw as Record<string, unknown>;
  const product =
    r.product && typeof r.product === "object" ? (r.product as Record<string, unknown>) : null;
  const reason = (r.varianceReason ?? r.variance_reason) as VarianceReason | null | undefined;
  return {
    id: pickStringy(r, "id"),
    productId: pickStringy(r, "productId", "product_id") ?? null,
    productName:
      pickStringy(r, "productName", "product_name") ??
      (product ? (pickStringy(product, "name") ?? null) : null) ??
      null,
    productSku:
      pickStringy(r, "productSku", "product_sku") ??
      (product ? (pickStringy(product, "sku") ?? null) : null) ??
      null,
    quantity: pickAmount(r, "quantity"),
    unitPrice: pickAmount(r, "unitPrice", "unit_price"),
    lineTotal: pickAmount(r, "lineTotal", "line_total", "totalAmount", "total_amount"),
    hasStockVariance: pickBoolean(r, "hasStockVariance", "has_stock_variance") ?? false,
    varianceReason: reason ?? null,
    varianceNote: (pickStringy(r, "varianceNote", "variance_note") ?? null) as string | null,
    varianceApprovedById:
      (pickStringy(r, "varianceApprovedById", "variance_approved_by_id") ?? null) as string | null,
    varianceApprovedAt:
      (pickStringy(r, "varianceApprovedAt", "variance_approved_at") ?? null) as string | null,
    varianceApprovedStaffId:
      (pickStringy(r, "varianceApprovedStaffId", "variance_approved_staff_id") ??
        null) as string | null,
  };
}

/** Normalize snake_case sale fields from the API into HubSale, including items[] + variance. */
export function normalizeSale(raw: unknown): HubSale {
  if (!raw || typeof raw !== "object") {
    return { id: "", totalAmount: 0 };
  }
  const r = raw as Record<string, unknown>;
  const createdByRaw = r.createdBy ?? r.created_by;
  const createdBy =
    createdByRaw && typeof createdByRaw === "object"
      ? (createdByRaw as HubSale["createdBy"])
      : undefined;

  const itemsRaw = r.items;
  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normalizeSaleLine) : undefined;
  const itemsHaveVariance = items?.some((i) => i.hasStockVariance) ?? false;

  return {
    id: String(r.id ?? ""),
    totalAmount: (r.totalAmount ?? r.total_amount ?? 0) as string | number,
    subtotal: pickAmount(r, "subtotal"),
    discountAmount: pickAmount(r, "discountAmount", "discount_amount"),
    paymentMethod: (r.paymentMethod ?? r.payment_method ?? null) as string | null,
    branchId: (r.branchId ?? r.branch_id ?? null) as string | null,
    branchName: (r.branchName ?? r.branch_name ?? null) as string | null,
    soldAt: (r.soldAt ?? r.sold_at) as string | null | undefined,
    syncedAt: (r.syncedAt ?? r.synced_at) as string | null | undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | null | undefined,
    createdBy,
    createdById: (r.createdById ?? r.created_by_id) as string | undefined,
    receiptNumber: (r.receiptNumber ?? r.receipt_number) as string | undefined,
    receiptNumberMobile: (r.receiptNumberMobile ?? r.receipt_number_mobile ?? null) as string | null,
    isDelayedSync: pickBoolean(r, "isDelayedSync", "is_delayed_sync"),
    hasStockVariance:
      pickBoolean(r, "hasStockVariance", "has_stock_variance") ?? itemsHaveVariance,
    items,
  };
}

function unwrapSalesRows(resData: unknown): { rows: unknown[]; meta: Record<string, unknown> } {
  if (Array.isArray(resData)) {
    return { rows: resData, meta: {} };
  }
  if (resData && typeof resData === "object") {
    const o = resData as Record<string, unknown>;
    if (Array.isArray(o.data)) return { rows: o.data, meta: o };
    if (Array.isArray(o.sales)) return { rows: o.sales, meta: o };
  }
  return { rows: [], meta: {} };
}

/** For payloads where pagination lives under a `meta` envelope: `{ data, meta: { page, limit, total } }`. */
function unwrapSalesRowsWithMeta(resData: unknown): {
  rows: unknown[];
  meta: Record<string, unknown>;
} {
  if (resData && typeof resData === "object") {
    const o = resData as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      const m = o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : o;
      return { rows: o.data, meta: m };
    }
  }
  return unwrapSalesRows(resData);
}

export async function fetchSalesPage(params: SalesListParams = {}): Promise<PaginatedSalesResponse> {
  const res = await api.get(endpoints.sales, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit: params.limit,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      staffId: params.staffId,
      paymentMethod: params.paymentMethod,
    },
  });
  const { rows, meta } = unwrapSalesRows(res.data);
  const m = parsePageMeta(meta, rows.length);
  return {
    data: rows.map(normalizeSale),
    page: m.page,
    limit: m.limit,
    total: m.total,
    totalPages: m.totalPages,
  };
}

export async function fetchSalesWithVariancesPage(
  params: SalesVarianceListParams = {},
): Promise<PaginatedSalesResponse> {
  const requestedLimit = params.limit;
  const limit =
    typeof requestedLimit === "number" && requestedLimit > 0
      ? Math.min(requestedLimit, VARIANCE_LIMIT_MAX)
      : undefined;
  const res = await api.get(endpoints.salesWithVariances, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit,
      productId: params.productId,
      varianceReason: params.varianceReason,
    },
  });
  const { rows, meta } = unwrapSalesRowsWithMeta(res.data);
  const m = parsePageMeta(meta, rows.length);
  return {
    data: rows.map(normalizeSale),
    page: m.page,
    limit: m.limit,
    total: m.total,
    totalPages: m.totalPages,
  };
}

/**
 * `GET /api/v1/sales/:id` returns one element of the `GET /api/v1/sales` `data[]` shape
 * (same `serializeSale` body - `items[]` + variance fields included).
 */
export async function fetchSaleById(id: string): Promise<HubSale> {
  const res = await api.get(endpoints.saleById(id));
  const body = res.data;
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const o = body as Record<string, unknown>;
    if (o.data && typeof o.data === "object" && !Array.isArray(o.data)) {
      return normalizeSale(o.data);
    }
    if (o.sale && typeof o.sale === "object") {
      return normalizeSale(o.sale);
    }
  }
  return normalizeSale(body);
}

function parsePageMeta(meta: Record<string, unknown>, dataLen: number) {
  const page = Number(meta.page ?? 1) || 1;
  const limit = Number(meta.limit ?? (dataLen || 20)) || 20;
  const total = Number(meta.total ?? meta.totalCount ?? dataLen) || 0;
  const totalPages =
    Number(meta.totalPages ?? meta.total_pages) ||
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
  return { page, limit, total, totalPages };
}

export async function fetchSalesStats(
  params: Pick<SalesListParams, "startDate" | "endDate" | "staffId" | "paymentMethod"> = {},
): Promise<SalesStatsPayload> {
  const res = await api.get(endpoints.salesStats, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      staffId: params.staffId,
      paymentMethod: params.paymentMethod,
    },
  });
  return (res.data && typeof res.data === "object" ? res.data : {}) as SalesStatsPayload;
}

export async function downloadSalesExportBlob(params: SalesExportParams): Promise<Blob> {
  const res = await api.get(endpoints.salesExport, {
    params: {
      format: "csv",
      startDate: params.startDate,
      endDate: params.endDate,
      staffId: params.staffId,
      paymentMethod: params.paymentMethod,
    },
    responseType: "blob",
  });
  return res.data as Blob;
}
