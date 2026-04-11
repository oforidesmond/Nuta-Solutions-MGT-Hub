import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubProduct } from "@/lib/types/domain";

export async function fetchProducts(): Promise<HubProduct[]> {
  const res = await api.get(endpoints.products);
  const data = res.data;
  if (Array.isArray(data)) return data as HubProduct[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: HubProduct[] }).data;
  }
  return (data as { products?: HubProduct[] }).products ?? [];
}
