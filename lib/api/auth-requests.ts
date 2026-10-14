import { api } from "@/lib/api/client";
import { bareApi } from "@/lib/api/bare-client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeTokensPayload, pickString } from "@/lib/api/normalize";
import { withPasswordChangeFlags } from "@/lib/auth/password-change";
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

/** Clears temporary-password flags after the user sets a permanent password. */
export async function changePasswordRequest(body: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await api.post(endpoints.auth.changePassword, body);
}

function normalizeAuthEnvelope(raw: Record<string, unknown>): {
  accessToken: string;
  refreshToken?: string;
  user: HubUser;
  organization: HubOrganization | null;
  defaultBranchId: string | null;
} {
  const tokens = normalizeTokensPayload(raw);
  const userRaw = (raw.user ?? raw.data) as Record<string, unknown> | undefined;
  if (!userRaw || typeof userRaw !== "object" || !("id" in userRaw)) {
    throw new Error("Invalid auth payload: missing user");
  }
  const baseUser = userRaw as unknown as HubUser;
  // Flags may sit on the user object and/or the envelope root.
  const user = withPasswordChangeFlags(
    withPasswordChangeFlags(baseUser, userRaw),
    raw,
  );
  const organization =
    (raw.organization as HubOrganization | undefined) ??
    (user.organization as HubOrganization | undefined) ??
    null;
  const defaultBranchId =
    pickString(raw, "defaultBranchId", "default_branch_id") ?? null;
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user,
    organization,
    defaultBranchId,
  };
}
