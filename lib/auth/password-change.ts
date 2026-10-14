import type { HubUser } from "@/lib/types/domain";

function pickBooleanFlag(
  raw: Record<string, unknown>,
  camel: string,
  snake: string,
): boolean | undefined {
  const a = raw[camel];
  const b = raw[snake];
  if (typeof a === "boolean") return a;
  if (typeof b === "boolean") return b;
  return undefined;
}

/** Read temp-password / force-change flags from login or /users/me payloads. */
export function pickPasswordChangeFlags(raw: Record<string, unknown>): {
  isTemporaryPassword?: boolean;
  needsPasswordChange?: boolean;
} {
  return {
    isTemporaryPassword: pickBooleanFlag(
      raw,
      "isTemporaryPassword",
      "is_temporary_password",
    ),
    needsPasswordChange: pickBooleanFlag(
      raw,
      "needsPasswordChange",
      "needs_password_change",
    ),
  };
}

export function userNeedsPasswordChange(
  user: HubUser | null | undefined,
): boolean {
  if (!user) return false;
  return user.isTemporaryPassword === true || user.needsPasswordChange === true;
}

/** Apply password-change flags onto a normalized HubUser without dropping other fields. */
export function withPasswordChangeFlags(
  user: HubUser,
  raw: Record<string, unknown>,
): HubUser {
  const flags = pickPasswordChangeFlags(raw);
  return {
    ...user,
    ...(flags.isTemporaryPassword !== undefined
      ? { isTemporaryPassword: flags.isTemporaryPassword }
      : {}),
    ...(flags.needsPasswordChange !== undefined
      ? { needsPasswordChange: flags.needsPasswordChange }
      : {}),
  };
}
