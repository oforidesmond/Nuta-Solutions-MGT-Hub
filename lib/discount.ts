export const DiscountErrorCode = {
  DISCOUNT_NOT_ALLOWED: "DISCOUNT_NOT_ALLOWED",
  DISCOUNT_EXCEEDS_LIMIT: "DISCOUNT_EXCEEDS_LIMIT",
} as const;

export type DiscountErrorCode =
  (typeof DiscountErrorCode)[keyof typeof DiscountErrorCode];

export type DiscountLimitViolation = {
  code: DiscountErrorCode;
  message: string;
  max_discount_percent: number;
  discount_percent_applied?: number;
};

export type NumericInput = number | string | null | undefined;

function toNumber(value: NumericInput): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Staff override when set (including 0); otherwise org limit. Never treats 0 as unset. */
export function resolveEffectiveDiscountLimitPercent(
  customLimit: NumericInput,
  orgLimit: NumericInput,
): number | null {
  const custom = toNumber(customLimit);
  const org = toNumber(orgLimit);
  const raw = custom != null ? custom : org;
  return raw;
}

export function toStaffDiscountSettings(effectiveLimit: number | null) {
  return {
    max_discount_percent: effectiveLimit ?? 0,
    discount_enabled: effectiveLimit != null && effectiveLimit > 0,
  };
}

export function computeDiscountPercent(
  discountAmount: number,
  subtotal: number,
): number {
  if (subtotal <= 0) {
    return discountAmount > 0 ? 100 : 0;
  }
  return (discountAmount / subtotal) * 100;
}

export function validateDiscountWithinLimit(input: {
  discountAmount: number;
  subtotal: number;
  effectiveLimitPercent: number | null;
}): DiscountLimitViolation | null {
  const { discountAmount, subtotal, effectiveLimitPercent } = input;

  if (discountAmount <= 0) {
    return null;
  }

  if (subtotal <= 0) {
    return {
      code: DiscountErrorCode.DISCOUNT_NOT_ALLOWED,
      message: "Discounts are not allowed on this sale.",
      max_discount_percent: effectiveLimitPercent ?? 0,
    };
  }

  if (effectiveLimitPercent === 0) {
    return {
      code: DiscountErrorCode.DISCOUNT_NOT_ALLOWED,
      message: "Discounts are not allowed for your account.",
      max_discount_percent: 0,
    };
  }

  if (effectiveLimitPercent == null) {
    return null;
  }

  const discountPercentApplied = computeDiscountPercent(discountAmount, subtotal);
  if (discountPercentApplied > effectiveLimitPercent) {
    const appliedRounded = Math.round(discountPercentApplied * 100) / 100;
    const limitRounded = Math.round(effectiveLimitPercent * 100) / 100;
    return {
      code: DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT,
      message: `Discount of ${appliedRounded}% exceeds your allowed limit of ${limitRounded}%.`,
      max_discount_percent: limitRounded,
      discount_percent_applied: appliedRounded,
    };
  }

  return null;
}

export function formatDiscountLimitLabel(limit: number | null): string {
  if (limit == null) return "No org cap";
  if (limit === 0) return "Disabled";
  const rounded = Math.round(limit * 100) / 100;
  return `${rounded}%`;
}

/** Validate org/staff percent cap input (0–100, max 2 decimal places). */
export function parseDiscountPercentInput(
  raw: string,
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }

  const n = Number(trimmed);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Enter a valid number." };
  }
  if (n < 0 || n > 100) {
    return { ok: false, message: "Discount limit must be between 0 and 100." };
  }
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(n - rounded) > 1e-9) {
    return { ok: false, message: "Use at most two decimal places." };
  }
  return { ok: true, value: rounded };
}

export function isDiscountSyncError(errorCode: string | null | undefined): boolean {
  if (!errorCode) return false;
  return (
    errorCode === DiscountErrorCode.DISCOUNT_NOT_ALLOWED ||
    errorCode === DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT
  );
}

export function readAmountFromPayload(
  payload: Record<string, unknown> | null | undefined,
  keys: string[],
): number | null {
  if (!payload) return null;
  for (const key of keys) {
    const v = payload[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}
