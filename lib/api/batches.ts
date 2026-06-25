import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { unwrapList } from "@/lib/api/response";
import type { HubBatch, PageMeta } from "@/lib/types/domain";
import type { BatchTrace } from "@/lib/types/batch-trace";

export type BatchListParams = {
  page?: number;
  limit?: number;
  productId?: string;
  from?: string;
  to?: string;
};

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function fetchBatches(params: BatchListParams = {}): Promise<{
  items: HubBatch[];
  meta: PageMeta;
}> {
  const page = params.page ?? 1;
  const limit = params.limit ?? 50;
  const res = await api.get(endpoints.batches, {
    params: {
      page,
      limit,
      productId: params.productId,
      from: params.from,
      to: params.to,
    },
  });
  return unwrapList<HubBatch>(res.data, page, limit);
}

export async function fetchBatch(id: string): Promise<HubBatch> {
  const res = await api.get(endpoints.batchById(id));
  return unwrapEntity<HubBatch>(res.data);
}

export async function fetchExpiringBatches(): Promise<HubBatch[]> {
  const res = await api.get(endpoints.batchesExpiring);
  return unwrapList<HubBatch>(res.data, 1, 100).items;
}

export async function fetchExpiredBatches(): Promise<HubBatch[]> {
  const res = await api.get(endpoints.batchesExpired);
  return unwrapList<HubBatch>(res.data, 1, 100).items;
}

export async function createBatch(body: Record<string, unknown>): Promise<HubBatch> {
  const res = await api.post(endpoints.batches, body);
  return unwrapEntity<HubBatch>(res.data);
}

export async function updateBatch(
  id: string,
  body: Record<string, unknown>,
): Promise<HubBatch> {
  const res = await api.patch(endpoints.batchById(id), body);
  return unwrapEntity<HubBatch>(res.data);
}

export async function deleteBatch(id: string): Promise<void> {
  await api.delete(endpoints.batchById(id));
}

export async function removeExpiredBatch(id: string): Promise<HubBatch> {
  const res = await api.post(endpoints.batchRemoveExpired(id), {});
  return unwrapEntity<HubBatch>(res.data);
}

function str(v: unknown): string | null {
  if (v == null) return null;
  return String(v);
}

function normalizeFinancials(
  raw: BatchTrace["financials"],
): BatchTrace["financials"] {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Record<string, unknown>;
  return {
    ...raw,
    spent: str(f.spent ?? f.totalCost ?? f.receivedValue ?? f.cost),
    soldFor: str(
      f.soldFor ?? f.totalRevenue ?? f.soldRevenue ?? f.revenue ?? f.soldValue,
    ),
    remaining: str(f.remaining ?? f.remainingValue ?? f.remaining_value),
  };
}

function deriveReceivedFromBatch(
  batch: Record<string, unknown>,
  financials: BatchTrace["financials"],
): BatchTrace["received"] {
  const quantity = batch.initialQuantity;
  if (quantity == null) return null;

  const unitCost = str(batch.costPriceAtPurchase);
  const totalCost =
    financials?.receivedValue ??
    financials?.totalCost ??
    financials?.spent ??
    (unitCost != null
      ? String(Number(quantity) * Number(unitCost))
      : null);

  return {
    occurredAt: str(batch.receivedAt),
    quantity: str(quantity),
    unitCost,
    totalCost: str(totalCost),
    summary: `Received ${quantity} units`,
  };
}

function normalizeBatchTrace(raw: unknown): BatchTrace {
  if (!raw || typeof raw !== "object") {
    return {
      batch: { id: "" },
      consumptions: [],
      writeOffs: [],
    };
  }
  const r = raw as Record<string, unknown>;
  const batch = (r.batch ?? {}) as Record<string, unknown>;
  const financials = normalizeFinancials(r.financials as BatchTrace["financials"]);
  const received =
    (r.received as BatchTrace["received"]) ??
    deriveReceivedFromBatch(batch, financials);
  const consumptions = Array.isArray(r.consumptions)
    ? r.consumptions
    : Array.isArray(r.sales)
      ? r.sales
      : [];
  const writeOffs = Array.isArray(r.writeOffs)
    ? r.writeOffs
    : Array.isArray(r.removed)
      ? r.removed
      : Array.isArray(r.write_offs)
        ? r.write_offs
        : [];

  return {
    batch: {
      id: String(batch.id ?? ""),
      batchNumber: str(batch.batchNumber),
      productId: str(batch.productId),
      productName: str(batch.productName ?? batch.product_name),
      expiryDate: str(batch.expiryDate),
      initialQuantity: str(batch.initialQuantity),
      remainingQuantity: str(batch.remainingQuantity),
      costPriceAtPurchase: str(batch.costPriceAtPurchase),
      receivedAt: str(batch.receivedAt),
    },
    received,
    consumptions: consumptions.map((c) => {
      const row = c as Record<string, unknown>;
      return {
        id: str(row.id) ?? undefined,
        saleId: str(row.saleId),
        receiptNumber: str(row.receiptNumber),
        quantityConsumed: str(row.quantityConsumed ?? row.quantity),
        unitCostAtConsumption: str(row.unitCostAtConsumption ?? row.unitCost),
        revenue: str(row.revenue),
        occurredAt: str(row.occurredAt),
        summary: str(row.summary),
      };
    }),
    writeOffs: writeOffs.map((w) => {
      const row = w as Record<string, unknown>;
      return {
        id: str(row.id) ?? undefined,
        category: str(row.category),
        quantity: str(row.quantity),
        lossAmount: str(row.lossAmount ?? row.loss),
        occurredAt: str(row.occurredAt),
        summary: str(row.summary),
      };
    }),
    financials,
  };
}

/** Branch-scoped batch receive → sales → write-offs trace (product + batch required). */
export async function fetchBatchTrace(
  productId: string,
  batchId: string,
): Promise<BatchTrace> {
  const res = await api.get(endpoints.productBatchTrace(productId, batchId));
  const data = res.data;
  if (data && typeof data === "object" && "data" in data) {
    return normalizeBatchTrace((data as { data: unknown }).data);
  }
  return normalizeBatchTrace(data);
}
