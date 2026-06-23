import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDiscountPercent,
  DiscountErrorCode,
  formatDiscountLimitLabel,
  isDiscountSyncError,
  parseDiscountPercentInput,
  resolveEffectiveDiscountLimitPercent,
  toStaffDiscountSettings,
  validateDiscountWithinLimit,
} from "./discount";

describe("resolveEffectiveDiscountLimitPercent", () => {
  it("uses org limit when custom is null", () => {
    assert.equal(resolveEffectiveDiscountLimitPercent(null, 15), 15);
  });

  it("uses custom limit when set, including 0", () => {
    assert.equal(resolveEffectiveDiscountLimitPercent(0, 15), 0);
  });

  it("uses custom limit when higher than org", () => {
    assert.equal(resolveEffectiveDiscountLimitPercent(20, 15), 20);
  });

  it("returns null when both are null", () => {
    assert.equal(resolveEffectiveDiscountLimitPercent(null, null), null);
  });
});

describe("toStaffDiscountSettings", () => {
  it("enables discount when limit is positive", () => {
    assert.deepEqual(toStaffDiscountSettings(15), {
      max_discount_percent: 15,
      discount_enabled: true,
    });
  });

  it("disables discount when limit is 0 or null", () => {
    assert.equal(toStaffDiscountSettings(0).discount_enabled, false);
    assert.equal(toStaffDiscountSettings(null).discount_enabled, false);
  });
});

describe("computeDiscountPercent", () => {
  it("computes percent from amount and subtotal", () => {
    assert.equal(computeDiscountPercent(2, 10), 20);
  });
});

describe("validateDiscountWithinLimit", () => {
  it("passes when discount is zero", () => {
    assert.equal(
      validateDiscountWithinLimit({
        discountAmount: 0,
        subtotal: 100,
        effectiveLimitPercent: 15,
      }),
      null,
    );
  });

  it("rejects any discount when limit is 0", () => {
    const result = validateDiscountWithinLimit({
      discountAmount: 1,
      subtotal: 100,
      effectiveLimitPercent: 0,
    });
    assert.equal(result?.code, DiscountErrorCode.DISCOUNT_NOT_ALLOWED);
  });

  it("rejects when percent exceeds limit", () => {
    const result = validateDiscountWithinLimit({
      discountAmount: 20,
      subtotal: 100,
      effectiveLimitPercent: 15,
    });
    assert.equal(result?.code, DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT);
    assert.equal(result?.max_discount_percent, 15);
    assert.equal(result?.discount_percent_applied, 20);
  });
});

describe("formatDiscountLimitLabel", () => {
  it("formats labels", () => {
    assert.equal(formatDiscountLimitLabel(15), "15%");
    assert.equal(formatDiscountLimitLabel(0), "Disabled");
    assert.equal(formatDiscountLimitLabel(null), "No org cap");
  });
});

describe("parseDiscountPercentInput", () => {
  it("accepts empty as null", () => {
    assert.deepEqual(parseDiscountPercentInput(""), { ok: true, value: null });
  });

  it("rejects out of range", () => {
    assert.equal(parseDiscountPercentInput("101").ok, false);
  });
});

describe("isDiscountSyncError", () => {
  it("detects discount error codes", () => {
    assert.equal(isDiscountSyncError("DISCOUNT_EXCEEDS_LIMIT"), true);
    assert.equal(isDiscountSyncError("SALE_PRODUCT_MISSING"), false);
  });
});
