import { pickString } from "@/lib/api/normalize";
import type { HubOrganization, HubUser } from "@/lib/types/domain";

/** `GET/PATCH /organizations/me` may return the entity or `{ data: entity }`. */
export function unwrapOrganizationPayload(data: unknown): HubOrganization {
  if (data && typeof data === "object" && "data" in data) {
    const inner = (data as { data: unknown }).data;
    if (inner && typeof inner === "object") {
      return inner as HubOrganization;
    }
  }
  return data as HubOrganization;
}

export interface MeResponse {
  user: HubUser;
  organization: HubOrganization | null;
  defaultBranchId: string | null;
}

function parseDefaultBranchId(o: Record<string, unknown>): string | null {
  return pickString(o, "defaultBranchId", "default_branch_id") ?? null;
}

export function parseMePayload(data: unknown): MeResponse {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid /users/me response");
  }
  const o = data as Record<string, unknown>;
  const defaultBranchId = parseDefaultBranchId(o);
  if ("user" in o && o.user && typeof o.user === "object") {
    const user = o.user as HubUser;
    const organization =
      (o.organization as HubOrganization | undefined) ??
      user.organization ??
      null;
    return { user, organization, defaultBranchId };
  }
  const user = data as HubUser;
  return {
    user,
    organization: user.organization ?? null,
    defaultBranchId,
  };
}
