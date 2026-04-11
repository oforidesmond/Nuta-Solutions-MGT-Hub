import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubSale } from "@/lib/types/domain";

export async function fetchSales(): Promise<HubSale[]> {
  const res = await api.get(endpoints.sales);
  const data = res.data;
  if (Array.isArray(data)) return data as HubSale[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: HubSale[] }).data;
  }
  return (data as { sales?: HubSale[] }).sales ?? [];
}
