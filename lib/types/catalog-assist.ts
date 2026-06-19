/** Layer 1 naming violation codes — mirror backend product-naming.types.ts */
export type ProductNameViolation =
  | "REQUIRED"
  | "TITLE_CASE"
  | "BRAND_POSITION"
  | "ATTRIBUTE_ORDER"
  | "WHITESPACE"
  | "TOO_LONG"
  | "FORBIDDEN_CHARACTERS";

export interface ProductNameValidationResult {
  valid: boolean;
  normalizedDraft?: string;
  suggestedName?: string;
  violations: ProductNameViolation[];
  humanMessage: string;
}

export interface CatalogAssistReferenceProduct {
  id: string;
  name: string;
  categoryId: string | null;
}

export type CatalogAssistSource = "catalog_pattern" | "rules_only";

export interface CatalogAssistResponse {
  draftName: string;
  suggestedName: string | null;
  suggestedCategoryId: string | null;
  suggestedCategoryName: string | null;
  confidence: number;
  source: CatalogAssistSource;
  validation: ProductNameValidationResult;
  referenceProducts: CatalogAssistReferenceProduct[];
  categoryHint: string | null;
}

/** 400 body when backend rejects a product name on save. */
export interface ProductNameInvalidPayload {
  statusCode: number;
  code: "PRODUCT_NAME_INVALID";
  message: string;
  violations: ProductNameViolation[];
  suggestedName?: string;
}

export interface ProductNameInvalidError {
  message: string;
  violations: ProductNameViolation[];
  suggestedName?: string;
}
