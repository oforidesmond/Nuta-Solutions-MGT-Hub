import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  AuditEventsParams,
  PaginatedResponse,
  PlatformAuditEvent,
} from "@/lib/types/platform";

export async function fetchPlatformAuditEvents(
  params: AuditEventsParams = {},
): Promise<PaginatedResponse<PlatformAuditEvent>> {
  const raw = await platformGet<unknown>(endpoints.platform.auditEvents, {
    organizationId: params.organizationId,
    userId: params.userId,
    eventType: params.eventType,
    aggregateType: params.aggregateType,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page,
    limit: params.limit,
  });
  return unwrapPaginated<PlatformAuditEvent>(raw);
}
