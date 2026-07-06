import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePhoneNumber,
  parsePhoneInput,
  phonesEquivalent,
} from "./phone";

describe("normalizePhoneNumber", () => {
  it("normalizes local 0-prefixed numbers", () => {
    assert.equal(normalizePhoneNumber("0243248781"), "+233243248781");
    assert.equal(normalizePhoneNumber("(024) 324-8781"), "+233243248781");
  });

  it("normalizes 9-digit numbers without leading zero", () => {
    assert.equal(normalizePhoneNumber("243248781"), "+233243248781");
  });

  it("keeps +233 E.164 format", () => {
    assert.equal(normalizePhoneNumber("+233243248781"), "+233243248781");
    assert.equal(normalizePhoneNumber("233243248781"), "+233243248781");
  });

  it("rejects invalid lengths", () => {
    assert.equal(normalizePhoneNumber("02432"), null);
    assert.equal(normalizePhoneNumber(""), null);
  });
});

describe("parsePhoneInput", () => {
  it("returns normalized value for valid input", () => {
    const result = parsePhoneInput("0243248781");
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value, "+233243248781");
  });

  it("rejects empty input", () => {
    const result = parsePhoneInput("   ");
    assert.equal(result.ok, false);
  });
});

describe("phonesEquivalent", () => {
  it("matches different formats of the same number", () => {
    assert.equal(phonesEquivalent("0243248781", "+233243248781"), true);
    assert.equal(phonesEquivalent("0243248781", "0241111111"), false);
  });
});
