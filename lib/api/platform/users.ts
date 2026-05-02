import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  DeactivateUserDto,
  PaginatedResponse,
  PlatformUser,
  PlatformUserDetails,
  ResetUserPasswordDto,
  ResetUserPasswordResponse,
  UserListParams,
} from "@/lib/types/platform";

export async function fetchPlatformUsersPage(
  params: UserListParams = {},
): Promise<PaginatedResponse<PlatformUser>> {
  const raw = await platformGet<unknown>(endpoints.platform.users, {
    page: params.page,
    limit: params.limit,
    search: params.search,
    role: params.role,
    organizationId: params.organizationId,
    isActive: params.isActive,
  });
  return unwrapPaginated<PlatformUser>(raw);
}

export async function fetchPlatformUserDetails(id: string): Promise<PlatformUserDetails> {
  return platformGet<PlatformUserDetails>(endpoints.platform.userById(id));
}

export async function deactivatePlatformUser(
  id: string,
  dto: DeactivateUserDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(
    endpoints.platform.userDeactivate(id),
    dto,
  );
}

export async function resetPlatformUserPassword(
  id: string,
  dto: ResetUserPasswordDto,
): Promise<ResetUserPasswordResponse> {
  return platformPost<ResetUserPasswordResponse>(
    endpoints.platform.userResetPassword(id),
    dto,
  );
}
