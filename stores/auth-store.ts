import { create } from "zustand";
import { bareApi } from "@/lib/api/bare-client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeTokensPayload } from "@/lib/api/normalize";
import { parseMePayload, unwrapOrganizationPayload } from "@/lib/api/me";
import {
  getActiveBranchId,
  setActiveBranchId,
} from "@/lib/auth/branch-storage";
import { getRefreshToken, setRefreshToken } from "@/lib/auth/token-storage";
import type { HubOrganization, HubUser } from "@/lib/types/domain";

export type AuthStatus =
  | "idle"
  | "hydrating"
  | "authenticated"
  | "unauthenticated";

function resolveActiveBranchId(defaultBranchId: string | null): string | null {
  const persisted = getActiveBranchId();
  const active = persisted ?? defaultBranchId;
  setActiveBranchId(active);
  return active;
}

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  user: HubUser | null;
  organization: HubOrganization | null;
  activeBranchId: string | null;
  defaultBranchId: string | null;
  setAccessToken: (token: string | null) => void;
  setSession: (payload: {
    accessToken: string;
    refreshToken?: string;
    user: HubUser;
    organization?: HubOrganization | null;
    defaultBranchId?: string | null;
  }) => void;
  setOrganization: (organization: HubOrganization | null) => void;
  setActiveBranch: (branchId: string) => void;
  /** Shallow-merge fields onto the current user (e.g. clear password-change flags). */
  patchUser: (patch: Partial<HubUser>) => void;
  clearSession: () => void;
  bootstrap: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  accessToken: null,
  user: null,
  organization: null,
  activeBranchId: null,
  defaultBranchId: null,

  setAccessToken: (accessToken) => set({ accessToken }),

  setSession: ({
    accessToken,
    refreshToken,
    user,
    organization: orgInput,
    defaultBranchId = null,
  }) => {
    if (refreshToken) setRefreshToken(refreshToken);
    const organization = orgInput ?? user.organization ?? null;
    const activeBranchId = resolveActiveBranchId(defaultBranchId);
    set({
      accessToken,
      user,
      organization,
      defaultBranchId,
      activeBranchId,
      status: "authenticated",
    });
  },

  setOrganization: (organization) => set({ organization }),

  setActiveBranch: (branchId) => {
    setActiveBranchId(branchId);
    set({ activeBranchId: branchId });
  },

  patchUser: (patch) => {
    const current = get().user;
    if (!current) return;
    set({ user: { ...current, ...patch } });
  },

  clearSession: () => {
    setRefreshToken(null);
    setActiveBranchId(null);
    set({
      accessToken: null,
      user: null,
      organization: null,
      activeBranchId: null,
      defaultBranchId: null,
      status: "unauthenticated",
    });
  },

  bootstrap: async () => {
    set({ status: "hydrating" });
    const rt = getRefreshToken();
    if (!rt) {
      set({
        status: "unauthenticated",
        accessToken: null,
        activeBranchId: null,
        defaultBranchId: null,
      });
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
      const defaultBranchId = parsed.defaultBranchId ?? null;
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

      const activeBranchId = resolveActiveBranchId(defaultBranchId);

      set({
        accessToken: tokens.accessToken,
        user,
        organization,
        defaultBranchId,
        activeBranchId,
        status: "authenticated",
      });
    } catch {
      get().clearSession();
    }
  },
}));
