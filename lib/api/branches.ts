import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubBranchOption } from "@/lib/types/staff";

function unwrapBranches(data: unknown): HubBranchOption[] {
  if (Array.isArray(data)) return data as HubBranchOption[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as HubBranchOption[];
    if (Array.isArray(o.branches)) return o.branches as HubBranchOption[];
  }
  return [];
}

/** Optional — used for StaffProfile.branchId on forms. */
export async function fetchBranchesList(): Promise<HubBranchOption[]> {
  const res = await api.get(endpoints.branches);
  return unwrapBranches(res.data);
}
