import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubOrganization } from "@/lib/types/domain";

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

export async function patchOrganization(id: string, body: OrganizationPatch) {
  const res = await api.patch(endpoints.organizations.byId(id), body);
  return res.data as HubOrganization;
}
