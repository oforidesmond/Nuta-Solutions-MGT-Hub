import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubSale } from "@/lib/types/domain";
import type {
  PaginatedSalesResponse,
  SalesExportParams,
  SalesListParams,
  SalesStatsPayload,
} from "@/lib/types/sales";

/** Normalize snake_case sale fields from the API into HubSale. */
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

  return {
    id: String(r.id ?? ""),
    totalAmount: (r.totalAmount ?? r.total_amount ?? 0) as string | number,
    soldAt: (r.soldAt ?? r.sold_at) as string | null | undefined,
    syncedAt: (r.syncedAt ?? r.synced_at) as string | null | undefined,
    createdAt: (r.createdAt ?? r.created_at) as string | null | undefined,
    createdBy,
    createdById: (r.createdById ?? r.created_by_id) as string | undefined,
    receiptNumber: (r.receiptNumber ?? r.receipt_number) as string | undefined,
  };
}

function unwrapSalesRows(resData: unknown): { rows: unknown[]; meta: Record<string, unknown> } {
  if (Array.isArray(resData)) {
    return { rows: resData, meta: {} };
  }
  if (resData && typeof resData === "object") {
    const o = resData as Record<string, unknown>;
    if (Array.isArray(o.data)) {
      return { rows: o.data, meta: o };
    }
    if (Array.isArray(o.sales)) {
      return { rows: o.sales, meta: o };
    }
  }
  return { rows: [], meta: {} };
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
      branchId: params.branchId,
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
  params: Pick<SalesListParams, "startDate" | "endDate" | "staffId" | "branchId" | "paymentMethod"> = {},
): Promise<SalesStatsPayload> {
  const res = await api.get(endpoints.salesStats, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      staffId: params.staffId,
      branchId: params.branchId,
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
      branchId: params.branchId,
      paymentMethod: params.paymentMethod,
    },
    responseType: "blob",
  });
  return res.data as Blob;
}
