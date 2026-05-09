import { create } from "zustand";
import { bareApi } from "@/lib/api/bare-client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeTokensPayload } from "@/lib/api/normalize";
import { parseMePayload, unwrapOrganizationPayload } from "@/lib/api/me";
import { getRefreshToken, setRefreshToken } from "@/lib/auth/token-storage";
import type { HubOrganization, HubUser } from "@/lib/types/domain";

export type AuthStatus =
  | "idle"
  | "hydrating"
  | "authenticated"
  | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: HubUser | null;
  organization: HubOrganization | null;
  setAccessToken: (token: string | null) => void;
  setSession: (payload: {
    accessToken: string;
    refreshToken?: string;
    user: HubUser;
    organization?: HubOrganization | null;
  }) => void;
  setOrganization: (organization: HubOrganization | null) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  accessToken: null,
  user: null,
  organization: null,

  setAccessToken: (accessToken) => set({ accessToken }),

  setSession: ({
    accessToken,
    refreshToken,
    user,
    organization: orgInput,
  }) => {
    if (refreshToken) setRefreshToken(refreshToken);
    const organization =
      orgInput ?? user.organization ?? null;
    set({
      accessToken,
      user,
      organization,
      status: "authenticated",
    });
  },

  setOrganization: (organization) => set({ organization }),

  clearSession: () => {
    setRefreshToken(null);
    set({
      accessToken: null,
      user: null,
      organization: null,
      status: "unauthenticated",
    });
  },

  bootstrap: async () => {
    set({ status: "hydrating" });
    const rt = getRefreshToken();
    if (!rt) {
      set({ status: "unauthenticated", accessToken: null });
      return;
    }
    try {
      const refreshRes = await bareApi.post<Record<string, unknown>>(
        endpoints.auth.refresh,
        { refreshToken: rt },
      );
      const tokens = normalizeTokensPayload(
        refreshRes.data as Record<string, unknown>,
      );
      if (tokens.refreshToken) setRefreshToken(tokens.refreshToken);

      const meRes = await bareApi.get(endpoints.users.me, {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });
      const parsed = parseMePayload(meRes.data);
      const user = parsed.user;
      let organization = parsed.organization;
      const oid = user.organizationId ?? organization?.id;
      if (oid) {
        try {
          const orgRes = await bareApi.get(endpoints.organizations.me, {
            headers: { Authorization: `Bearer ${tokens.accessToken}` },
          });
          organization = unwrapOrganizationPayload(orgRes.data);
        } catch {
          /* keep partial org from /users/me if present */
        }
      }

      set({
        accessToken: tokens.accessToken,
        user,
        organization,
        status: "authenticated",
      });
    } catch {
      get().clearSession();
    }
  },
}));
