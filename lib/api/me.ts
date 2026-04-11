import type { HubOrganization, HubUser } from "@/lib/types/domain";

export interface MeResponse {
  user: HubUser;
  organization: HubOrganization | null;
}

export function parseMePayload(data: unknown): MeResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid /users/me response");
  }
  const o = data as Record<string, unknown>;
  if ("user" in o && o.user && typeof o.user === "object") {
    const user = o.user as HubUser;
    const organization =
      (o.organization as HubOrganization | undefined) ??
      user.organization ??
      null;
    return { user, organization };
  }
  const user = data as HubUser;
  return {
    user,
    organization: user.organization ?? null,
  };
}
