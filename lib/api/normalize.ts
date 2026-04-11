export function pickString(
  obj: Record<string, unknown>,
  camel: string,
  snake: string,
): string | undefined {
  const a = obj[camel];
  const b = obj[snake];
  if (typeof a === "string") return a;
  if (typeof b === "string") return b;
  return undefined;
}

export function normalizeTokensPayload(data: Record<string, unknown>): {
  accessToken: string;
  refreshToken?: string;
} {
  const accessToken = pickString(data, "accessToken", "access_token");
  const refreshToken = pickString(data, "refreshToken", "refresh_token");
  if (!accessToken) throw new Error("Missing accessToken in auth response");
  return { accessToken, refreshToken };
}
