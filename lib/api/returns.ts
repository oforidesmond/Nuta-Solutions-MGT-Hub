import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubReturnDetail } from "@/lib/types/phase2";
import type { PaginatedReturnsResponse, ReturnsListParams } from "@/lib/types/returns";

/** Single return line item for a sale (legacy hub route). */
export async function fetchReturnDetail(saleId: string, returnId: string): Promise<HubReturnDetail> {
  const res = await api.get(endpoints.saleReturn(saleId, returnId));
  return res.data as HubReturnDetail;
}

function unwrapListPayload(resData: unknown): { rows: unknown[]; meta: Record<string, unknown> } {
  if (Array.isArray(resData)) return { rows: resData, meta: {} };
  if (resData && typeof resData === "object") {
    const o = resData as Record<string, unknown>;
    if (Array.isArray(o.data)) return { rows: o.data, meta: o };
    if (Array.isArray(o.items)) return { rows: o.items, meta: o };
  }
  return { rows: [], meta: {} };
}

function parseMeta(meta: Record<string, unknown>, dataLen: number) {
  const page = Number(meta.page ?? 1) || 1;
  const limit = Number(meta.limit ?? (dataLen || 20)) || 20;
  const total = Number(meta.total ?? meta.totalCount ?? dataLen) || 0;
  const totalPages =
    Number(meta.totalPages ?? meta.total_pages) ||
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
  return { page, limit, total, totalPages };
}

export async function fetchReturnsPage(
  params: ReturnsListParams = {},
): Promise<PaginatedReturnsResponse> {
  const res = await api.get(endpoints.returns, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit: params.limit,
      staffId: params.staffId,
      branchId: params.branchId,
    },
  });
  const { rows, meta } = unwrapListPayload(res.data);
  const m = parseMeta(meta, rows.length);
  return {
    data: rows.map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : {})),
    page: m.page,
    limit: m.limit,
    total: m.total,
    totalPages: m.totalPages,
  };
}
