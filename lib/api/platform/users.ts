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

function parseResetUserPasswordResponse(raw: unknown): ResetUserPasswordResponse {
  const root =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const nested =
    root.data && typeof root.data === "object" && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : root;
  const temp =
    nested.temporaryPassword ??
    nested.temporary_password ??
    root.temporaryPassword ??
    root.temporary_password;
  return {
    success: true,
    temporaryPassword:
      typeof temp === "string" && temp.trim() ? temp.trim() : undefined,
  };
}

export async function resetPlatformUserPassword(
  id: string,
  dto: ResetUserPasswordDto,
): Promise<ResetUserPasswordResponse> {
  const raw = await platformPost<unknown>(
    endpoints.platform.userResetPassword(id),
    dto,
  );
  return parseResetUserPasswordResponse(raw);
}
