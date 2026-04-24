import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { parseMePayload, type MeResponse } from "@/lib/api/me";
import type { HubOrganization, HubUser } from "@/lib/types/domain";

export type { MeResponse };

export async function fetchMe(): Promise<MeResponse> {
  const res = await api.get(endpoints.users.me);
  return parseMePayload(res.data);
}

export async function fetchOrganizationMe() {
  const res = await api.get(endpoints.organizations.me);
  return res.data as HubOrganization;
}

export interface CreateStaffInput {
  firstName: string;
  lastName?: string;
  phoneNumber: string;
  email?: string;
}

export async function createStaffRequest(body: CreateStaffInput) {
  const res = await api.post(endpoints.users.createStaff, {
    ...body,
    role: "STAFF",
  });
  return res.data as HubUser;
}

export async function fetchOrgUsers() {
  const res = await api.get(endpoints.users.list);
  const data = res.data;
  if (Array.isArray(data)) return data as HubUser[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: HubUser[] }).data;
  }
  return (data as { users?: HubUser[] }).users ?? [];
}
