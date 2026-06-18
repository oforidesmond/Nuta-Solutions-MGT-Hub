import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { unwrapList } from "@/lib/api/response";
import type {
  HubProduct,
  HubStockAdjustment,
  PageMeta,
  PriceScope,
  ProductPriceContext,
} from "@/lib/types/domain";
import type { HubInventoryEvent, HubTemporaryItem } from "@/lib/types/phase2";

/** Backend validation cap for `GET /products` `limit` query param. */
export const PRODUCTS_API_LIMIT_MAX = 100;

export type ProductSortBy = "name" | "createdAt" | "stockQuantity" | "sellingPrice";

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  sortBy?: ProductSortBy;
  sortOrder?: "asc" | "desc";
};

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

/** Backward-compatible: all products (paginated at API max). */
export async function fetchProducts(): Promise<HubProduct[]> {
  return fetchAllProducts();
}

/** Fetch every page of products (respects API `limit` cap). */
export async function fetchAllProducts(
  params: Omit<ProductQueryParams, "page" | "limit"> = {},
): Promise<HubProduct[]> {
  const collected: HubProduct[] = [];
  let page = 1;
  for (;;) {
    const { items, meta } = await fetchProductsPaginated({
      ...params,
      page,
      limit: PRODUCTS_API_LIMIT_MAX,
    });
    collected.push(...items);
    if (items.length === 0) break;
    if (typeof meta.totalPages === "number" && page >= meta.totalPages) break;
    if (items.length < PRODUCTS_API_LIMIT_MAX) break;
    page += 1;
  }
  return collected;
}

export async function fetchProductsPaginated(
  params: ProductQueryParams = {},
): Promise<{ items: HubProduct[]; meta: PageMeta }> {
  const page = params.page ?? 1;
  const requestedLimit = params.limit ?? 20;
  const limit = Math.min(Math.max(1, requestedLimit), PRODUCTS_API_LIMIT_MAX);
  const res = await api.get(endpoints.products, {
    params: {
      page,
      limit,
      search: params.search || undefined,
      categoryId: params.categoryId || undefined,
      lowStock: params.lowStock === true ? true : undefined,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
    },
  });
  return unwrapList<HubProduct>(res.data, page, limit);
}

export async function fetchProduct(id: string): Promise<HubProduct> {
  const res = await api.get(endpoints.productById(id));
  return unwrapEntity<HubProduct>(res.data);
}

/** Fetch a product with effective stock/prices for a specific branch context. */
export async function fetchProductAtBranch(
  id: string,
  branchId: string,
): Promise<HubProduct> {
  const res = await api.get(endpoints.productById(id), {
    headers: { "X-Branch-Id": branchId },
  });
  return unwrapEntity<HubProduct>(res.data);
}

export type ProductWriteBody = {
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  /** When API accepts free-text category (Prisma-style). */
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  taxRate?: number;
  customTaxRate?: number;
  taxable?: boolean;
  initialStock?: number;
  stockQuantity?: number;
  currentStock?: number;
  reorderLevel?: number;
  unit?: string;
  unitOfMeasure?: string;
  isActive?: boolean;
};

export async function createProduct(body: ProductWriteBody): Promise<HubProduct> {
  const res = await api.post(endpoints.products, body);
  return unwrapEntity<HubProduct>(res.data);
}

export async function updateProduct(
  id: string,
  body: Partial<ProductWriteBody>,
): Promise<HubProduct> {
  const res = await api.patch(endpoints.productById(id), body);
  return unwrapEntity<HubProduct>(res.data);
}

export async function deleteProduct(id: string): Promise<void> {
  await api.delete(endpoints.productById(id));
}

export async function duplicateProduct(id: string): Promise<HubProduct> {
  const res = await api.post(endpoints.productDuplicate(id), {});
  return unwrapEntity<HubProduct>(res.data);
}

/**
 * Body for branch-scoped price updates. `priceScope` is required whenever a
 * price field is present. Use `null` with `priceScope: "BRANCH"` to clear a
 * branch override and fall back to the org default.
 */
export type ProductPricingBody = {
  costPrice?: number | null;
  sellingPrice?: number | null;
  priceScope?: PriceScope;
  taxRate?: number;
  reorderLevel?: number;
};

export async function updateProductPricing(
  id: string,
  body: ProductPricingBody,
): Promise<HubProduct> {
  const res = await api.patch(endpoints.productPricing(id), body);
  return unwrapEntity<HubProduct>(res.data);
}

/** Fetch org + branch prices for the price-edit modal. */
export async function fetchProductPriceContext(
  id: string,
): Promise<ProductPriceContext> {
  const res = await api.get(endpoints.productPriceContext(id));
  return unwrapEntity<ProductPriceContext>(res.data);
}

export async function fetchLowStockProducts(): Promise<HubProduct[]> {
  const res = await api.get(endpoints.productsLowStock);
  return unwrapList<HubProduct>(res.data, 1, 200).items;
}

export async function fetchExpiringSoonProducts(): Promise<HubProduct[]> {
  const res = await api.get(endpoints.productsExpiringSoon);
  return unwrapList<HubProduct>(res.data, 1, 200).items;
}

export async function fetchStockHistory(productId: string): Promise<HubStockAdjustment[]> {
  const res = await api.get(endpoints.productStockHistory(productId));
  const data = res.data;
  if (Array.isArray(data)) return data as HubStockAdjustment[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: HubStockAdjustment[] }).data;
  }
  return (
    (data as { history?: HubStockAdjustment[]; adjustments?: HubStockAdjustment[] })
      .history ??
    (data as { adjustments?: HubStockAdjustment[] }).adjustments ??
    []
  );
}

function normalizeTemporaryItem(raw: unknown): HubTemporaryItem {
  if (!raw || typeof raw !== "object") return { id: "" };
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    barcode: (r.barcode as string | null | undefined) ?? null,
    name: (r.name as string | null | undefined) ?? null,
    price:
      (r.price as string | number | null | undefined) ??
      ((r.sellingPrice ?? r.selling_price) as string | number | null | undefined) ??
      null,
    quantitySold:
      (r.quantitySold ?? r.quantity_sold ?? r.temporarySoldCount ?? r.temporary_sold_count) as
        | string
        | number
        | null
        | undefined,
    firstSoldAt:
      (r.firstSoldAt ?? r.first_sold_at ?? r.firstSold ?? r.first_sold) as
        | string
        | null
        | undefined,
    aggregateId: (r.aggregateId ?? r.aggregate_id) as string | null | undefined,
  };
}

export async function fetchTemporaryItems(): Promise<HubTemporaryItem[]> {
  const res = await api.get(endpoints.productsTemporary);
  const data = res.data;
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    list = (data as { data: unknown[] }).data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    list =
      Array.isArray(o.items)
        ? o.items
        : Array.isArray(o.temporaryItems)
          ? o.temporaryItems
          : [];
  }
  return list.map(normalizeTemporaryItem);
}

export type PromoteFromTemporaryBody = {
  name: string;
  cost_price: number;
  category_id: string;
  stock_quantity: number;
  barcode: string;
  selling_price: number;
};

export async function promoteFromTemporary(
  tempItemId: string,
  body: PromoteFromTemporaryBody,
): Promise<HubProduct> {
  const res = await api.post(endpoints.productFromTemporary(tempItemId), body);
  return unwrapEntity<HubProduct>(res.data);
}

export async function fetchInventoryEvents(productId: string): Promise<HubInventoryEvent[]> {
  const res = await api.get(endpoints.productInventoryEvents(productId));
  const data = res.data;
  if (Array.isArray(data)) return data as HubInventoryEvent[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: HubInventoryEvent[] }).data;
  }
  return (data as { events?: HubInventoryEvent[] }).events ?? [];
}
