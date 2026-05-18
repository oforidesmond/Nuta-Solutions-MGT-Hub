/** Must match Astro only for handoff mint; Hub persists its own key after consume. */
export const REFRESH_TOKEN_STORAGE_KEY = "nutapos_hub_refresh_token";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";
}

/** API host for Socket.IO — strips `/api/v1` from `NEXT_PUBLIC_API_URL` when present. */
export function getApiOrigin(): string {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  return base.replace(/\/api\/v1$/i, "");
}

export function getHubBaseUrl(): string {
  return process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:5174";
}

export function getMarketingSiteUrl(): string {
  return process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:4321";
}
