import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubOrganization } from "@/lib/types/domain";
import axios from "axios";

export type OrganizationPatch = Partial<
  Pick<
    HubOrganization,
    | "name"
    | "phone"
    | "email"
    | "businessType"
    | "businessLocation"
    | "taxEnabled"
    | "expiryAlertEnabled"
    | "expiryReminderMonths"
    | "maxStaffDiscountPercent"
    | "maxStaffDiscountAmount"
    | "alertOwnerOnExcessDiscount"
  >
> & { defaultTaxRate?: number | string | null };

export async function patchOrganization(body: OrganizationPatch) {
  try {
    const res = await api.patch(endpoints.organizations.me, body);
    return res.data as HubOrganization;
  } catch (e) {
    if (
      axios.isAxiosError(e) &&
      e.response?.status === 400 &&
      typeof e.response.data === "object" &&
      e.response.data !== null &&
      Array.isArray((e.response.data as { message?: unknown }).message) &&
      (e.response.data as { message: unknown[] }).message.some(
        (m) => typeof m === "string" && m.includes("should not exist"),
      )
    ) {
      const fallback: OrganizationPatch = {
        name: body.name,
        phone: body.phone,
        email: body.email,
        businessType: body.businessType,
        businessLocation: body.businessLocation,
      };
      const res = await api.patch(endpoints.organizations.me, fallback);
      return res.data as HubOrganization;
    }
    throw e;
  }
}
