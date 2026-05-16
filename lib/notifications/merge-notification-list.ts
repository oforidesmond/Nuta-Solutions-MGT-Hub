import { notificationFromRealtimePayload } from "@/lib/api/notifications";
import type { HubNotification } from "@/lib/types/phase2";
import type { NotificationRealtimePayload } from "@/lib/types/notifications-realtime";

const MAX_LIST_ITEMS = 100;

/** Upsert by id; preserve metadata from REST when WS payload omits it. */
export function mergeNotificationIntoList(
  list: HubNotification[] | undefined,
  payload: NotificationRealtimePayload,
): HubNotification[] {
  const incoming = notificationFromRealtimePayload(payload);
  if (!list?.length) return [incoming];

  const index = list.findIndex((n) => n.id === incoming.id);
  if (index === -1) {
    return [incoming, ...list].slice(0, MAX_LIST_ITEMS);
  }

  const existing = list[index];
  const merged: HubNotification = {
    ...existing,
    ...incoming,
    title: incoming.title ?? existing.title,
    message: incoming.message ?? existing.message,
    aggregateCount: incoming.aggregateCount,
    metadata: existing.metadata ?? incoming.metadata,
    relatedEntityType: incoming.relatedEntityType ?? existing.relatedEntityType,
    relatedEntityId: incoming.relatedEntityId ?? existing.relatedEntityId,
    isRead: existing.isRead === true ? true : incoming.isRead,
    read: existing.isRead === true ? true : incoming.read,
    readAt: existing.readAt ?? incoming.readAt,
  };

  const next = [...list];
  next[index] = merged;
  return next;
}
