import { bareApi } from "@/lib/api/bare-client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeTokensPayload, pickString } from "@/lib/api/normalize";
import type { HubOrganization, HubUser } from "@/lib/types/domain";

export async function loginRequest(email: string, password: string) {
  const res = await bareApi.post<Record<string, unknown>>(endpoints.auth.login, {
    email,
    password,
  });
  return normalizeAuthEnvelope(res.data as Record<string, unknown>);
}

export async function consumeHandoffRequest(code: string) {
  const res = await bareApi.post<Record<string, unknown>>(
    endpoints.auth.handoffConsume,
    { code },
  );
  return normalizeAuthEnvelope(res.data as Record<string, unknown>);
}

function normalizeAuthEnvelope(raw: Record<string, unknown>): {
  accessToken: string;
  refreshToken?: string;
  user: HubUser;
  organization: HubOrganization | null;
  defaultBranchId: string | null;
} {
  const tokens = normalizeTokensPayload(raw);
  const user = (raw.user ?? raw.data) as HubUser | undefined;
  if (!user || typeof user !== "object" || !("id" in user)) {
    throw new Error("Invalid auth payload: missing user");
  }
  const organization =
    (raw.organization as HubOrganization | undefined) ??
    (user.organization as HubOrganization | undefined) ??
    null;
  const defaultBranchId =
    pickString(raw, "defaultBranchId", "default_branch_id") ?? null;
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: user as HubUser,
    organization,
    defaultBranchId,
  };
}
