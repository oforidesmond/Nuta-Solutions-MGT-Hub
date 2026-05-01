import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  CreateStockTakePayload,
  PaginatedStockTakes,
  StockTakeRow,
  StockTakesListParams,
  StockTakesSummary,
} from "@/lib/types/stock-takes";

function unwrapPaginated(resData: unknown): { rows: unknown[]; meta: Record<string, unknown> } {
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

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

export function parseStockTakesSummary(raw: unknown): StockTakesSummary | null {
  const o = asRecord(raw);
  if (!o) return null;
  return {
    totalFinancialImpact: String(o.totalFinancialImpact ?? "0"),
    totalShrinkageCost: String(o.totalShrinkageCost ?? "0"),
    totalOverageCost: String(o.totalOverageCost ?? "0"),
    averageVariancePercentage: String(o.averageVariancePercentage ?? "0"),
  };
}

export function parseStockTakeRow(raw: unknown): StockTakeRow | null {
  const o = asRecord(raw);
  if (!o || typeof o.id !== "string") return null;
  const productRaw = asRecord(o.product);
  const userRaw = o.user == null ? null : asRecord(o.user);
  if (!productRaw || typeof productRaw.id !== "string" || typeof productRaw.name !== "string") return null;
  const sku = productRaw.sku == null ? null : String(productRaw.sku);
  const user: StockTakeRow["user"] =
    userRaw && typeof userRaw.id === "string"
      ? {
          id: userRaw.id,
          email: typeof userRaw.email === "string" ? userRaw.email : "",
          staffId: userRaw.staffId == null ? null : String(userRaw.staffId),
          branchId: userRaw.branchId == null ? null : String(userRaw.branchId),
        }
      : null;
  const fi = o.financialImpact;
  const vp = o.variancePercentage;
  return {
    id: o.id,
    quantityBefore: String(o.quantityBefore ?? ""),
    quantityAfter: String(o.quantityAfter ?? ""),
    quantityChange: String(o.quantityChange ?? ""),
    reason: o.reason == null ? null : String(o.reason),
    notes: o.notes == null ? null : String(o.notes),
    createdAt: String(o.createdAt ?? ""),
    financialImpact: fi == null || fi === "" ? null : String(fi),
    variancePercentage: vp == null || vp === "" ? null : String(vp),
    product: { id: productRaw.id, name: productRaw.name, sku },
    user,
  };
}

export async function fetchStockTakesPage(params: StockTakesListParams = {}): Promise<PaginatedStockTakes> {
  const res = await api.get(endpoints.inventoryStockTakes, {
    params: {
      startDate: params.startDate,
      endDate: params.endDate,
      branchId: params.branchId,
      organisationId: params.organisationId,
      page: params.page,
      limit: params.limit,
    },
  });
  const { rows, meta } = unwrapPaginated(res.data);
  const m = parseMeta(meta, rows.length);
  const data: StockTakeRow[] = [];
  for (const r of rows) {
    const row = parseStockTakeRow(r);
    if (row) data.push(row);
  }
  const summary = parseStockTakesSummary(meta.summary);
  return {
    data,
    page: m.page,
    limit: m.limit,
    total: m.total,
    totalPages: m.totalPages,
    summary,
  };
}

export async function createStockTake(payload: CreateStockTakePayload): Promise<StockTakeRow> {
  const res = await api.post(endpoints.inventoryStockTakes, {
    productId: payload.productId,
    physicalCount: payload.physicalCount,
    notes: payload.notes?.trim() ? payload.notes.trim() : undefined,
    branchId: payload.branchId,
  });
  const row = parseStockTakeRow(res.data);
  if (!row) throw new Error("Invalid stock take response");
  return row;
}
