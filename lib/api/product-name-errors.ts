import axios, { type AxiosError } from "axios";
import { getApiErrorCode } from "@/lib/api/error-codes";
import type {
  ProductNameInvalidError,
  ProductNameInvalidPayload,
  ProductNameViolation,
} from "@/lib/types/catalog-assist";

function isViolationArray(value: unknown): value is ProductNameViolation[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "string" && item.length > 0)
  );
}

/** Extract structured product-name validation errors for inline field UX. */
export function getProductNameInvalidError(error: unknown): ProductNameInvalidError | null {
  if (!axios.isAxiosError(error)) return null;
  if (getApiErrorCode(error) !== "PRODUCT_NAME_INVALID") return null;

  const ax = error as AxiosError<ProductNameInvalidPayload>;
  const data = ax.response?.data;
  if (!data) return null;

  const raw = data.message;
  const message = Array.isArray(raw) ? raw.join(", ") : raw;
  const violations = isViolationArray(data.violations) ? data.violations : [];

  return {
    message:
      typeof message === "string" && message.length > 0
        ? message
        : "Product names use Title Case and follow Brand + Product Name + Key Attributes.",
    violations,
    suggestedName:
      typeof data.suggestedName === "string" && data.suggestedName.length > 0
        ? data.suggestedName
        : undefined,
  };
}
