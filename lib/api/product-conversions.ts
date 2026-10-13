import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  ConversionExecutionResponse,
  CreateProductConversionBody,
  ExecuteBulkConversionBody,
  ProductConversion,
  ProductConversionsResponse,
  UpdateProductConversionBody,
} from "@/lib/types/conversions";
import type { HubStockAdjustment } from "@/lib/types/domain";

function unwrapEntity<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

function parseProductConversion(raw: unknown): ProductConversion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const ratio = o.conversionRatio;
  if (typeof ratio !== "string" && typeof ratio !== "number") return null;
  const isActive = Boolean(o.isActive);
  const child =
    o.childProduct && typeof o.childProduct === "object"
      ? (() => {
          const c = o.childProduct as Record<string, unknown>;
          if (typeof c.id !== "string" || typeof c.name !== "string") return undefined;
          return {
            id: c.id,
            name: c.name,
            sku: typeof c.sku === "string" || c.sku === null ? (c.sku as string | null) : null,
          };
        })()
      : undefined;
  const parent =
    o.parentProduct && typeof o.parentProduct === "object"
      ? (() => {
          const p = o.parentProduct as Record<string, unknown>;
          if (typeof p.id !== "string" || typeof p.name !== "string") return undefined;
          return {
            id: p.id,
            name: p.name,
            sku: typeof p.sku === "string" || p.sku === null ? (p.sku as string | null) : null,
          };
        })()
      : undefined;
  return {
    id: o.id,
    conversionRatio: String(ratio),
    isActive,
    autoConvertOnSale: o.autoConvertOnSale === true,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
    childProduct: child,
    parentProduct: parent,
  };
}

export async function fetchProductConversions(productId: string): Promise<ProductConversionsResponse> {
  const res = await api.get(endpoints.productConversionsByProductId(productId));
  const raw = res.data;
  const body =
    raw && typeof raw === "object" && "asParent" in raw
      ? (raw as Record<string, unknown>)
      : unwrapEntity<Record<string, unknown>>(raw);
  const root = body && typeof body === "object" ? body : {};
  const asParentRaw = Array.isArray(root.asParent) ? root.asParent : [];
  const asChildRaw = Array.isArray(root.asChild) ? root.asChild : [];
  return {
    asParent: asParentRaw.map(parseProductConversion).filter(Boolean) as ProductConversion[],
    asChild: asChildRaw.map(parseProductConversion).filter(Boolean) as ProductConversion[],
  };
}

export async function createProductConversion(
  data: CreateProductConversionBody,
): Promise<ProductConversion> {
  const res = await api.post(endpoints.productConversions, data);
  const row = parseProductConversion(unwrapEntity(res.data));
  if (!row) throw new Error("Invalid conversion response");
  return row;
}

export async function updateProductConversion(
  conversionId: string,
  data: UpdateProductConversionBody,
): Promise<ProductConversion> {
  const res = await api.patch(endpoints.productConversionById(conversionId), data);
  const row = parseProductConversion(unwrapEntity(res.data));
  if (!row) throw new Error("Invalid conversion response");
  return row;
}

export async function deleteProductConversion(conversionId: string): Promise<void> {
  await api.delete(endpoints.productConversionById(conversionId));
}

function parseAdjustment(raw: unknown): HubStockAdjustment {
  if (!raw || typeof raw !== "object") return { id: "" };
  return raw as HubStockAdjustment;
}

export async function executeBulkConversion(
  data: ExecuteBulkConversionBody,
): Promise<ConversionExecutionResponse> {
  const res = await api.post(endpoints.inventoryConvertBulk, data);
  const body = unwrapEntity<Record<string, unknown>>(res.data);
  return {
    parentAdjustment: parseAdjustment(body.parentAdjustment),
    childAdjustment: parseAdjustment(body.childAdjustment),
  };
}
