/**
 * Normalize Ghana phone numbers to E.164 (+233XXXXXXXXX).
 * Accepts local formats like 0241234567, (024) 123-4567, 241234567, +233241234567.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let national: string | null = null;

  if (digits.startsWith("233") && digits.length >= 12) {
    national = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    national = digits.slice(1);
  } else if (digits.length === 9) {
    national = digits;
  }

  if (!national || national.length !== 9) return null;

  return `+233${national}`;
}

export function parsePhoneInput(
  input: string,
): { ok: true; value: string } | { ok: false; message: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Please enter a phone number." };
  }

  const normalized = normalizePhoneNumber(trimmed);
  if (!normalized) {
    return {
      ok: false,
      message:
        "Enter a valid Ghana phone number (e.g. 024 123 4567 or +233 24 123 4567).",
    };
  }

  return { ok: true, value: normalized };
}

export function phonesEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = a ? normalizePhoneNumber(a) : null;
  const right = b ? normalizePhoneNumber(b) : null;
  return Boolean(left && right && left === right);
}
