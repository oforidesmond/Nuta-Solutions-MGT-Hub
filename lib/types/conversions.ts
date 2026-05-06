import type { HubStockAdjustment } from "@/lib/types/domain";

export interface ConversionProductRef {
  id: string;
  name: string;
  sku: string | null;
}

/** Row from GET /products/:productId/conversions */
export interface ProductConversion {
  id: string;
  conversionRatio: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  /** When this product is the parent (pack) */
  childProduct?: ConversionProductRef;
  /** When this product is the child (single) */
  parentProduct?: ConversionProductRef;
}

export interface ProductConversionsResponse {
  asParent: ProductConversion[];
  asChild: ProductConversion[];
}

export type ConversionDirection = "BULK_TO_SINGLES" | "SINGLES_TO_BULK";

export interface CreateProductConversionBody {
  parentProductId: string;
  childProductId: string;
  conversionRatio: number;
}

export interface UpdateProductConversionBody {
  conversionRatio?: number;
  isActive?: boolean;
}

export interface ExecuteBulkConversionBody {
  conversionId?: string;
  parentProductId?: string;
  childProductId?: string;
  quantity: number;
  direction: ConversionDirection;
  notes?: string;
  branchId?: string;
}

export interface ConversionExecutionResponse {
  parentAdjustment: HubStockAdjustment;
  childAdjustment: HubStockAdjustment;
}
