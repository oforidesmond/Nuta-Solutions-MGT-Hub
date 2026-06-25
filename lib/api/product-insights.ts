import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { cleanQueryParams } from "@/lib/api/query-params";
import type {
  ProductInsightShrinkage,
  ProductInsightVelocity,
} from "@/lib/types/product-lifecycle";
import { currentMonthDateRange } from "@/lib/types/product-lifecycle";

export type ProductInsightQueryParams = {
  from?: string;
  to?: string;
  branchId?: string;
};

export type ProductInsightDateRangeOptions = {
  /** When false, omit from/to (e.g. velocity snapshot). Default true. */
  includeDateRange?: boolean;
};

function unwrap<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

async function fetchProductInsight<T>(
  productId: string,
  insight: string,
  params: ProductInsightQueryParams = {},
  options: ProductInsightDateRangeOptions = {},
): Promise<T> {
  const includeDateRange = options.includeDateRange !== false;
  const range =
    params.from && params.to
      ? { from: params.from, to: params.to }
      : currentMonthDateRange();

  const res = await api.get(endpoints.productInsight(productId, insight), {
    params: cleanQueryParams({
      from: includeDateRange ? range.from : undefined,
      to: includeDateRange ? range.to : undefined,
      branchId: params.branchId,
    }),
  });
  return unwrap<T>(res.data);
}

export function fetchProductInsightVelocity(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<ProductInsightVelocity> {
  return fetchProductInsight<ProductInsightVelocity>(productId, "velocity", params, {
    includeDateRange: false,
  });
}

export function fetchProductInsightShrinkage(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<ProductInsightShrinkage> {
  return fetchProductInsight<ProductInsightShrinkage>(productId, "shrinkage", params);
}

export function fetchProductInsightVarianceSales(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<unknown> {
  return fetchProductInsight(productId, "variance-sales", params);
}

export function fetchProductInsightReturns(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<unknown> {
  return fetchProductInsight(productId, "returns", params);
}

export function fetchProductInsightMarginErosion(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<unknown> {
  return fetchProductInsight(productId, "margin-erosion", params);
}

export function fetchProductInsightPriceDrift(
  productId: string,
  params: ProductInsightQueryParams = {},
): Promise<unknown> {
  return fetchProductInsight(productId, "price-drift", params);
}
