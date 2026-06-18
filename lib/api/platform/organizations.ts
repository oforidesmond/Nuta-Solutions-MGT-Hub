import { endpoints } from "@/lib/api/endpoints";
import {
  platformDelete,
  platformGet,
  platformPatch,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  DeleteOrganizationDto,
  OrganizationActivityParams,
  OrganizationListParams,
  PaginatedResponse,
  PlatformAuditEvent,
  PlatformOrganization,
  PlatformOrgDetails,
  SuspendOrganizationDto,
  UnsuspendOrganizationDto,
  UpdateOrganizationBranchLimitDto,
  UpdateOrganizationBranchLimitResult,
  UpdateOrganizationPlanDto,
} from "@/lib/types/platform";

export async function fetchOrganizationsPage(
  params: OrganizationListParams = {},
): Promise<PaginatedResponse<PlatformOrganization>> {
  const raw = await platformGet<unknown>(endpoints.platform.organizations, {
    page: params.page,
    limit: params.limit,
    search: params.search,
    planType: params.planType,
    planStatus: params.planStatus,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
  });
  return unwrapPaginated<PlatformOrganization>(raw);
}

export async function fetchOrganizationDetails(id: string): Promise<PlatformOrgDetails> {
  return platformGet<PlatformOrgDetails>(endpoints.platform.organizationById(id));
}

export async function updateOrganizationPlan(
  id: string,
  dto: UpdateOrganizationPlanDto,
): Promise<PlatformOrgDetails> {
  return platformPatch<PlatformOrgDetails>(
    endpoints.platform.organizationPlan(id),
    dto,
  );
}

export async function updateOrganizationBranchLimit(
  id: string,
  dto: UpdateOrganizationBranchLimitDto,
): Promise<UpdateOrganizationBranchLimitResult> {
  return platformPatch<UpdateOrganizationBranchLimitResult>(
    endpoints.platform.organizationBranchLimit(id),
    dto,
  );
}

export async function suspendOrganization(
  id: string,
  dto: SuspendOrganizationDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(
    endpoints.platform.organizationSuspend(id),
    dto,
  );
}

export async function unsuspendOrganization(
  id: string,
  dto: UnsuspendOrganizationDto,
): Promise<{ success: true }> {
  return platformPost<{ success: true }>(
    endpoints.platform.organizationUnsuspend(id),
    dto,
  );
}

export async function softDeleteOrganization(
  id: string,
  dto: DeleteOrganizationDto,
): Promise<{ success: true }> {
  return platformDelete<{ success: true }>(
    endpoints.platform.organizationById(id),
    dto,
  );
}

export async function fetchOrganizationActivity(
  id: string,
  params: OrganizationActivityParams = {},
): Promise<PaginatedResponse<PlatformAuditEvent>> {
  const raw = await platformGet<unknown>(
    endpoints.platform.organizationActivity(id),
    {
      eventType: params.eventType,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      limit: params.limit,
    },
  );
  return unwrapPaginated<PlatformAuditEvent>(raw);
}
