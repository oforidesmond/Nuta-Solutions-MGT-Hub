import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { unwrapList } from "@/lib/api/response";
import type { HubBatch, PageMeta } from "@/lib/types/domain";

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
