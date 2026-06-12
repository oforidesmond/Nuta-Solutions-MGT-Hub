import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  CreateBranchBody,
  HubBranch,
  UpdateBranchBody,
} from "@/lib/types/branches";

function unwrapBranches(data: unknown): HubBranch[] {
  if (Array.isArray(data)) return data as HubBranch[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as HubBranch[];
    if (Array.isArray(o.branches)) return o.branches as HubBranch[];
  }
  return [];
}

function unwrapBranch(data: unknown): HubBranch {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (o.data && typeof o.data === "object") return o.data as HubBranch;
    if (typeof o.id === "string") return o as unknown as HubBranch;
  }
  return data as HubBranch;
}

export async function fetchBranchesList(): Promise<HubBranch[]> {
  const res = await api.get(endpoints.branches);
  return unwrapBranches(res.data);
}

export async function createBranch(body: CreateBranchBody): Promise<HubBranch> {
  const res = await api.post(endpoints.branches, body);
  return unwrapBranch(res.data);
}

export async function updateBranch(
  id: string,
  body: UpdateBranchBody,
): Promise<HubBranch> {
  const res = await api.patch(`${endpoints.branches}/${id}`, body);
  return unwrapBranch(res.data);
}
