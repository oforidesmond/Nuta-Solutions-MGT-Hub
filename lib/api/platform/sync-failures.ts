import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  PaginatedResponse,
  PlatformSyncFailure,
  PlatformSyncFailureDetail,
  PlatformSyncFailureListParams,
  ResolvePlatformSyncFailureDto,
} from "@/lib/types/platform";

export async function fetchPlatformSyncFailuresPage(
  params: PlatformSyncFailureListParams,
): Promise<PaginatedResponse<PlatformSyncFailure>> {
  const raw = await platformGet<unknown>(endpoints.platform.syncFailures, {
    organizationId: params.organizationId,
    status: params.status,
    errorCode: params.errorCode,
    entityType: params.entityType,
    from: params.from,
    to: params.to,
    page: params.page,
    limit: params.limit,
  });
  return unwrapPaginated<PlatformSyncFailure>(raw);
}

export async function fetchPlatformSyncFailureById(
  id: string,
): Promise<PlatformSyncFailureDetail> {
  return platformGet<PlatformSyncFailureDetail>(endpoints.platform.syncFailureById(id));
}

export async function resolvePlatformSyncFailure(
  id: string,
  dto: ResolvePlatformSyncFailureDto,
): Promise<PlatformSyncFailureDetail> {
  return platformPost<PlatformSyncFailureDetail>(
    endpoints.platform.syncFailureResolve(id),
    dto,
  );
}
