import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPatch,
  platformPost,
} from "@/lib/api/platform/_pagination";
import type {
  CreateOfflineLicenseCustomerDto,
  OfflineActivationCodeResponse,
  OfflineLicenseCustomer,
  OfflineLicenseUnlockResponse,
  UpdateOfflineLicenseCustomerDto,
} from "@/lib/types/offline-license";

export async function fetchOfflineLicenseCustomers(): Promise<OfflineLicenseCustomer[]> {
  const raw = await platformGet<OfflineLicenseCustomer[] | { data: OfflineLicenseCustomer[] }>(
    endpoints.platform.offlineLicenseCustomers,
  );
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray(raw.data)) return raw.data;
  return [];
}

export async function createOfflineLicenseCustomer(
  dto: CreateOfflineLicenseCustomerDto,
): Promise<OfflineLicenseCustomer> {
  return platformPost<OfflineLicenseCustomer>(endpoints.platform.offlineLicenseCustomers, {
    name: dto.name.trim(),
    ...(dto.phone?.trim() ? { phone: dto.phone.trim() } : {}),
    ...(dto.email?.trim() ? { email: dto.email.trim() } : {}),
    ...(dto.amountGhs != null ? { amountGhs: dto.amountGhs } : {}),
    ...(dto.periodDays != null ? { periodDays: dto.periodDays } : {}),
    ...(dto.graceDays != null ? { graceDays: dto.graceDays } : {}),
    ...(dto.supportNotes?.trim() ? { supportNotes: dto.supportNotes.trim() } : {}),
  });
}

export async function updateOfflineLicenseCustomer(
  id: string,
  dto: UpdateOfflineLicenseCustomerDto,
): Promise<OfflineLicenseCustomer> {
  return platformPatch<OfflineLicenseCustomer>(endpoints.platform.offlineLicenseCustomer(id), dto);
}

export async function issueOfflineActivationCode(
  id: string,
): Promise<OfflineActivationCodeResponse> {
  return platformPost<OfflineActivationCodeResponse>(
    endpoints.platform.offlineLicenseActivationCode(id),
  );
}

export async function extendOfflineLicense(
  id: string,
  days: number,
): Promise<OfflineLicenseUnlockResponse> {
  return platformPost<OfflineLicenseUnlockResponse>(endpoints.platform.offlineLicenseExtend(id), {
    days,
  });
}

export async function markOfflineLicensePaid(
  id: string,
  periodDays?: number,
): Promise<OfflineLicenseUnlockResponse> {
  return platformPost<OfflineLicenseUnlockResponse>(
    endpoints.platform.offlineLicenseMarkPaid(id),
    periodDays != null ? { periodDays } : {},
  );
}

export async function revokeOfflineLicenseDevice(
  customerId: string,
  deviceId: string,
): Promise<{ ok: true }> {
  return platformPost<{ ok: true }>(
    endpoints.platform.offlineLicenseRevokeDevice(customerId, deviceId),
  );
}
