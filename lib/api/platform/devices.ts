import { endpoints } from "@/lib/api/endpoints";
import { pickString } from "@/lib/api/normalize";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  DeviceListParams,
  DeviceStatus,
  PaginatedResponse,
  PlatformDevice,
  PlatformDeviceActivity,
  PlatformDeviceDetails,
  PlatformUserOrgSlim,
  RevokeDeviceDto,
  SuspendDeviceDto,
  UnsuspendDeviceDto,
} from "@/lib/types/platform";

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function normalizePlatformOrg(raw: unknown): PlatformUserOrgSlim | null {
  const o = asRecord(raw);
  const id = o.id;
  const name = o.name;
  if (typeof id !== "string" || typeof name !== "string") return null;
  return {
    id,
    name,
    planType: o.planType as PlatformUserOrgSlim["planType"],
    planStatus: o.planStatus as PlatformUserOrgSlim["planStatus"],
    currency: (o.currency as string | null) ?? null,
  };
}

function formatDeviceOs(
  deviceOs: unknown,
  deviceOsVersion: unknown,
): string | null {
  const os = typeof deviceOs === "string" ? deviceOs.trim() : "";
  const version = typeof deviceOsVersion === "string" ? deviceOsVersion.trim() : "";
  if (os && version) return `${os} ${version}`;
  if (os) return os;
  if (version) return version;
  return null;
}

export function normalizePlatformDevice(
  raw: unknown,
  rootOrganization?: PlatformUserOrgSlim | null,
): PlatformDevice {
  const o = asRecord(raw);
  const userRaw = asRecord(o.user);
  const organization =
    normalizePlatformOrg(o.organization) ??
    normalizePlatformOrg(userRaw.organization) ??
    rootOrganization ??
    null;

  return {
    id: String(o.id ?? ""),
    deviceUuid: String(o.deviceUuid ?? ""),
    deviceName: (o.deviceName as string | null | undefined) ?? null,
    deviceModel: (o.deviceModel as string | null | undefined) ?? null,
    deviceOs: formatDeviceOs(o.deviceOs, o.deviceOsVersion),
    fingerprintHash: (o.fingerprintHash as string | null | undefined) ?? null,
    status: (o.status as DeviceStatus) ?? "ACTIVE",
    organizationId: String(
      o.organizationId ?? userRaw.organizationId ?? organization?.id ?? "",
    ),
    userId: (o.userId as string | null | undefined) ?? null,
    lastSeenAt:
      pickString(o, "lastSeenAt", "last_seen_at") ??
      pickString(o, "lastActiveAt", "last_active_at") ??
      null,
    registeredAt:
      pickString(o, "registeredAt", "registered_at") ??
      pickString(o, "firstRegisteredAt", "first_registered_at") ??
      null,
    revokedAt: (o.revokedAt as string | null | undefined) ?? null,
    revokedReason: (o.revokedReason as string | null | undefined) ?? null,
    createdAt: String(o.createdAt ?? ""),
    updatedAt: (o.updatedAt as string | null | undefined) ?? null,
    organization,
    user: userRaw.id
      ? {
          id: String(userRaw.id),
          firstName: (userRaw.firstName as string | null | undefined) ?? null,
          lastName: (userRaw.lastName as string | null | undefined) ?? null,
          email: (userRaw.email as string | null | undefined) ?? null,
        }
      : null,
  };
}

function normalizePlatformDeviceActivity(raw: unknown): PlatformDeviceActivity {
  const o = asRecord(raw);
  return {
    salesCount: Number(o.salesCount ?? 0),
    backupsCount: Number(o.backupsCount ?? o.backupCount ?? 0),
    crashesCount: Number(o.crashesCount ?? o.crashCount ?? 0),
    recentSales: Array.isArray(o.recentSales)
      ? (o.recentSales as PlatformDeviceActivity["recentSales"])
      : [],
  };
}

export function normalizePlatformDeviceDetails(raw: unknown): PlatformDeviceDetails {
  const envelope = asRecord(raw);
  const rootOrganization = normalizePlatformOrg(envelope.organization);
  return {
    device: normalizePlatformDevice(envelope.device ?? envelope, rootOrganization),
    activity: normalizePlatformDeviceActivity(envelope.activity),
  };
}

export async function fetchPlatformDevicesPage(
  params: DeviceListParams = {},
): Promise<PaginatedResponse<PlatformDevice>> {
  const raw = await platformGet<unknown>(endpoints.platform.devices, {
    page: params.page,
    limit: params.limit,
    organizationId: params.organizationId,
    userId: params.userId,
    status: params.status,
    search: params.search,
  });
  const page = unwrapPaginated<unknown>(raw);
  return {
    ...page,
    data: page.data.map((row) => normalizePlatformDevice(row)),
  };
}

export async function fetchPlatformDeviceDetails(
  id: string,
): Promise<PlatformDeviceDetails> {
  const raw = await platformGet<unknown>(endpoints.platform.deviceById(id));
  return normalizePlatformDeviceDetails(raw);
}

export async function revokePlatformDevice(
  id: string,
  dto: RevokeDeviceDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(endpoints.platform.deviceRevoke(id), dto);
}

export async function suspendPlatformDevice(
  id: string,
  dto: SuspendDeviceDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(
    endpoints.platform.deviceSuspend(id),
    dto,
  );
}

export async function unsuspendPlatformDevice(
  id: string,
  dto: UnsuspendDeviceDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(
    endpoints.platform.deviceUnsuspend(id),
    dto,
  );
}
