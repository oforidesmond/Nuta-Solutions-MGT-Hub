import { endpoints } from "@/lib/api/endpoints";
import { api } from "@/lib/api/client";
import {
  platformGet,
  platformPatch,
  platformPost,
} from "@/lib/api/platform/_pagination";
import type {
  CreateOfflineLicenseCustomerDto,
  OfflineActivationCodeResponse,
  OfflineLicenseBackupSummary,
  OfflineLicenseCustomer,
  OfflineLicenseUnlockResponse,
  UpdateOfflineLicenseCustomerDto,
} from "@/lib/types/offline-license";

function parseContentDispositionFilename(header: string): string | null {
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(header);
  const raw = plain?.[1] ?? plain?.[2];
  return raw ? raw.trim().replace(/^"|"$/g, "") : null;
}

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

export async function fetchOfflineLicenseBackup(
  customerId: string,
): Promise<OfflineLicenseBackupSummary> {
  return platformGet<OfflineLicenseBackupSummary>(
    endpoints.platform.offlineLicenseBackup(customerId),
  );
}

/** Binary download in browser; throws on non-2xx. */
export async function downloadOfflineLicenseBackup(customerId: string): Promise<void> {
  const res = await api.get<Blob>(endpoints.platform.offlineLicenseBackupDownload(customerId), {
    responseType: "blob",
  });
  const header = res.headers["content-disposition"] ?? res.headers["Content-Disposition"];
  const parsed = typeof header === "string" ? parseContentDispositionFilename(header) : null;
  const filename = parsed ?? `offline_backup_${customerId}.json`;
  const blob = res.data;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
