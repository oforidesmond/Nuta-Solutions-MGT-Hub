import { bareApi } from "@/lib/api/bare-client";
import { normalizeTokensPayload } from "@/lib/api/normalize";
import { getRefreshToken, setRefreshToken } from "@/lib/auth/token-storage";
import { useAuthStore } from "@/stores/auth-store";

let inFlight: Promise<string | null> | null = null;

/**
 * Single-flight refresh: concurrent 401s share one /auth/refresh call.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (inFlight) return inFlight;

  const rt = getRefreshToken();
  if (!rt) return Promise.resolve(null);

  inFlight = (async () => {
    const res = await bareApi.post<Record<string, unknown>>("/auth/refresh", {
      refreshToken: rt,
    });
    const { accessToken, refreshToken } = normalizeTokensPayload(
      res.data as Record<string, unknown>,
    );
    useAuthStore.getState().setAccessToken(accessToken);
    if (refreshToken) setRefreshToken(refreshToken);
    return accessToken;
  })()
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
