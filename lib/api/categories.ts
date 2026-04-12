import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { unwrapList } from "@/lib/api/response";
import type { HubCategory, HubProduct } from "@/lib/types/domain";

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export async function fetchCategories(): Promise<HubCategory[]> {
  const res = await api.get(endpoints.categories);
  const { items } = unwrapList<HubCategory>(res.data, 1, 200);
  return items;
}

export async function fetchCategory(id: string): Promise<HubCategory> {
  const res = await api.get(endpoints.categoryById(id));
  return unwrapEntity<HubCategory>(res.data);
}

export async function fetchCategoryProducts(id: string): Promise<HubProduct[]> {
  const res = await api.get(endpoints.categoryProducts(id));
  return unwrapList<HubProduct>(res.data, 1, 200).items;
}

export async function createCategory(body: {
  name: string;
  description?: string;
}): Promise<HubCategory> {
  const res = await api.post(endpoints.categories, body);
  return unwrapEntity<HubCategory>(res.data);
}

export async function updateCategory(
  id: string,
  body: { name?: string; description?: string },
): Promise<HubCategory> {
  const res = await api.patch(endpoints.categoryById(id), body);
  return unwrapEntity<HubCategory>(res.data);
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete(endpoints.categoryById(id));
}
