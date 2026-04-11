/** Must match Astro only for handoff mint; Hub persists its own key after consume. */
export const REFRESH_TOKEN_STORAGE_KEY = "nutapos_hub_refresh_token";

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export function getHubBaseUrl(): string {
  return process.env.NEXT_PUBLIC_HUB_URL ?? "http://localhost:5174";
}
