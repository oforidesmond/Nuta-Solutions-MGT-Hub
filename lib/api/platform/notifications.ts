import { endpoints } from "@/lib/api/endpoints";
import {
  platformGet,
  platformPost,
  unwrapPaginated,
} from "@/lib/api/platform/_pagination";
import type {
  BroadcastNotificationDto,
  BroadcastNotificationResponse,
  NotificationListParams,
  PaginatedResponse,
  PlatformNotification,
} from "@/lib/types/platform";

export async function fetchPlatformNotificationsPage(
  params: NotificationListParams = {},
): Promise<PaginatedResponse<PlatformNotification>> {
  const raw = await platformGet<unknown>(endpoints.platform.notifications, {
    page: params.page,
    limit: params.limit,
    organizationId: params.organizationId,
    type: params.type,
    isRead: params.isRead,
  });
  return unwrapPaginated<PlatformNotification>(raw);
}

export async function broadcastPlatformNotification(
  dto: BroadcastNotificationDto,
): Promise<BroadcastNotificationResponse> {
  return platformPost<BroadcastNotificationResponse>(
    endpoints.platform.notificationsBroadcast,
    dto,
  );
}
