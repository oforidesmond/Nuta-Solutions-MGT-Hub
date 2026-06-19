import type {
  ProductNameValidationResult,
  ProductNameViolation,
} from "@/lib/types/catalog-assist";

/** Keep in sync with backend product-naming.types.ts */
export const PRODUCT_NAME_MAX_LENGTH = 200;

const LOWERCASE_UNITS = new Set(["g", "kg", "ml", "l", "cl", "oz", "lb"]);

/** Known tokens that keep their canonical casing. */
const ALLOWLIST_TOKENS = [
  "iPhone",
  "SPF",
  "McDonald's",
  "18V",
  "Coca-Cola",
  "USB",
  "HDMI",
  "Wi-Fi",
  "LED",
  "UV",
] as const;

const FORBIDDEN_CHAR_PATTERN = /[\x00-\x1f<>|]/;

const SIZE_TOKEN_PATTERN = /^\d+\s?(g|kg|ml|l|cl|oz|lb)$/i;
const PACK_TOKEN_PATTERN = /^(pack of \d+|\d+ pack|\d+ pieces)$/i;

const DEFAULT_HUMAN_MESSAGE =
  "Product names use Title Case and follow Brand + Product Name + Key Attributes.";

function buildHumanMessage(violations: ProductNameViolation[]): string {
  if (violations.length === 0) return "";
  if (violations.includes("REQUIRED")) return "Product name is required.";
  if (violations.includes("TOO_LONG")) {
    return `Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer.`;
  }
  if (violations.includes("FORBIDDEN_CHARACTERS")) {
    return "Product name contains characters that are not allowed.";
  }
  if (violations.includes("WHITESPACE")) {
    return "Remove extra spaces at the start, end, or between words.";
  }
  if (violations.includes("BRAND_POSITION")) {
    return "Start with the brand name, then the product name, then size or pack (e.g. Vaseline Aloe Pomade 500g).";
  }
  if (violations.includes("ATTRIBUTE_ORDER")) {
    return "Put size or pack at the end (e.g. Vaseline Aloe Pomade 500g, not Vaseline 500g Aloe).";
  }
  return DEFAULT_HUMAN_MESSAGE;
}

function findAllowlistForm(token: string): string | null {
  const lower = token.toLowerCase();
  for (const allowed of ALLOWLIST_TOKENS) {
    if (lower === allowed.toLowerCase()) return allowed;
  }
  return null;
}

function capitalizeSegment(segment: string): string {
  if (!segment) return segment;
  const allowlisted = findAllowlistForm(segment);
  if (allowlisted) return allowlisted;
  const lower = segment.toLowerCase();
  if (LOWERCASE_UNITS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Title-case a single token, preserving hyphens and apostrophes. */
function titleCaseToken(token: string): string {
  if (token.includes("-")) {
    return token.split("-").map((part) => capitalizeSegment(part)).join("-");
  }
  if (token.includes("'")) {
    const [head, ...tail] = token.split("'");
    const suffix = tail.join("'");
    return `${capitalizeSegment(head)}'${suffix.toLowerCase()}`;
  }
  return capitalizeSegment(token);
}

export function normalizeProductName(name: string): string {
  const collapsed = name.trim().replace(/\s+/g, " ");
  if (!collapsed) return "";
  return collapsed.split(" ").map(titleCaseToken).join(" ");
}

function isAttributeToken(token: string): boolean {
  return SIZE_TOKEN_PATTERN.test(token.trim()) || PACK_TOKEN_PATTERN.test(token.trim());
}

function isAllCapsViolation(name: string): boolean {
  const letters = name.replace(/[^a-zA-Z]/g, "");
  if (letters.length < 2) return false;
  if (letters !== letters.toUpperCase()) return false;
  for (const allowed of ALLOWLIST_TOKENS) {
    if (name.trim().toUpperCase() === allowed.toUpperCase()) return false;
  }
  return true;
}

function hasTitleCaseViolation(name: string): boolean {
  if (isAllCapsViolation(name)) return true;
  const normalized = normalizeProductName(name);
  return normalized !== name.trim().replace(/\s+/g, " ");
}

function hasBrandPositionViolation(tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  return isAttributeToken(tokens[0]!);
}

function hasAttributeOrderViolation(tokens: string[]): boolean {
  if (tokens.length < 2) return false;

  let i = tokens.length - 1;
  while (i >= 0 && isAttributeToken(tokens[i]!)) {
    i -= 1;
  }

  const productTokens = tokens.slice(0, i + 1);
  if (productTokens.length <= 1) return false;

  const afterBrand = productTokens.slice(1);
  return afterBrand.some((token) => isAttributeToken(token));
}

export function violationLabel(code: ProductNameViolation): string {
  switch (code) {
    case "REQUIRED":
      return "Name is required.";
    case "TITLE_CASE":
      return "Use Title Case for each word (units like g and ml stay lowercase).";
    case "BRAND_POSITION":
      return "Brand name must come first.";
    case "ATTRIBUTE_ORDER":
      return "Size or pack belongs at the end.";
    case "WHITESPACE":
      return "Remove extra spaces.";
    case "TOO_LONG":
      return `Keep the name under ${PRODUCT_NAME_MAX_LENGTH} characters.`;
    case "FORBIDDEN_CHARACTERS":
      return "Remove unsupported characters.";
    default:
      return DEFAULT_HUMAN_MESSAGE;
  }
}

export function validateProductName(name: string): ProductNameValidationResult {
  const violations: ProductNameViolation[] = [];

  if (!name || name.trim().length === 0) {
    violations.push("REQUIRED");
    return {
      valid: false,
      violations,
      humanMessage: buildHumanMessage(violations),
    };
  }

  if (FORBIDDEN_CHAR_PATTERN.test(name)) {
    violations.push("FORBIDDEN_CHARACTERS");
  }

  if (name !== name.trim() || /\s{2,}/.test(name)) {
    violations.push("WHITESPACE");
  }

  if (name.length > PRODUCT_NAME_MAX_LENGTH) {
    violations.push("TOO_LONG");
  }

  const collapsed = name.trim().replace(/\s+/g, " ");
  const tokens = collapsed.split(" ").filter(Boolean);

  if (hasBrandPositionViolation(tokens)) {
    violations.push("BRAND_POSITION");
  }

  if (hasAttributeOrderViolation(tokens)) {
    violations.push("ATTRIBUTE_ORDER");
  }

  if (hasTitleCaseViolation(collapsed)) {
    violations.push("TITLE_CASE");
  }

  const suggestedName = normalizeProductName(collapsed);
  const valid = violations.length === 0;

  return {
    valid,
    normalizedDraft: collapsed,
    suggestedName: valid ? undefined : suggestedName !== collapsed ? suggestedName : undefined,
    violations,
    humanMessage: buildHumanMessage(violations),
  };
}
