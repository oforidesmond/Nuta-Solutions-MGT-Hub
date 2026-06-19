import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { CatalogAssistResponse } from "@/lib/types/catalog-assist";

export type CatalogAssistParams = {
  draftName: string;
  excludeProductId?: string;
};

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function fetchCatalogAssist(
  params: CatalogAssistParams,
): Promise<CatalogAssistResponse> {
  const res = await api.get(endpoints.productsCatalogAssist, {
    params: {
      draftName: params.draftName,
      ...(params.excludeProductId
        ? { excludeProductId: params.excludeProductId }
        : {}),
    },
  });
  return unwrapEntity<CatalogAssistResponse>(res.data);
}
