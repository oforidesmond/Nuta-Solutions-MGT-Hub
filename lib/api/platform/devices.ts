import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  DeviceListParams,
  PaginatedResponse,
  PlatformDevice,
  PlatformDeviceDetails,
  RevokeDeviceDto,
  SuspendDeviceDto,
  UnsuspendDeviceDto,
} from "@/lib/types/platform";

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
  return unwrapPaginated<PlatformDevice>(raw);
}

export async function fetchPlatformDeviceDetails(
  id: string,
): Promise<PlatformDeviceDetails> {
  return platformGet<PlatformDeviceDetails>(endpoints.platform.deviceById(id));
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
