import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubNotification, HubNotificationType } from "@/lib/types/phase2";

function unwrapNotifications(raw: unknown): HubNotification[] {
  if (Array.isArray(raw)) return raw.map(normalizeNotification);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.data ?? o.notifications ?? o.items ?? o.results;
    if (Array.isArray(list)) return list.map(normalizeNotification);
  }
  return [];
}

function parseAggregateCount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 1) {
    return Math.floor(raw);
  }
  return 1;
}

function unwrapNextCursor(raw: unknown): string | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const cursor = (raw as Record<string, unknown>).nextCursor;
  return typeof cursor === "string" && cursor.trim() ? cursor : undefined;
}

export function normalizeNotification(row: unknown): HubNotification {
  const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  const meta = r.metadata;
  const relatedEntityType =
    (r.relatedEntityType as string | undefined) ??
    (r.related_entity_type as string | undefined) ??
    null;
  const relatedEntityId =
    (r.relatedEntityId as string | undefined) ??
    (r.related_entity_id as string | undefined) ??
    null;
  const isRead =
    typeof r.isRead === "boolean"
      ? r.isRead
      : typeof r.read === "boolean"
        ? r.read
        : undefined;
  const aggregateCount = parseAggregateCount(r.aggregateCount ?? r.aggregate_count);

  return {
    id: String(r.id ?? ""),
    type: String(r.type ?? "UNKNOWN") as HubNotificationType,
    title: (r.title as string | null | undefined) ?? null,
    message: String(r.message ?? r.body ?? r.title ?? ""),
    isRead,
    read: isRead,
    readAt:
      (r.readAt as string | undefined) ??
      (r.read_at as string | undefined) ??
      null,
    createdAt:
      (r.createdAt as string | undefined) ??
      (r.created_at as string | undefined) ??
      null,
    actionUrl:
      (r.actionUrl as string | undefined) ??
      (r.action_url as string | undefined) ??
      null,
    actionLabel:
      (r.actionLabel as string | undefined) ??
      (r.action_label as string | undefined) ??
      null,
    relatedEntityType,
    relatedEntityId,
    metadata: meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null,
    dedupKey:
      (r.dedupKey as string | undefined) ??
      (r.dedup_key as string | undefined) ??
      null,
    aggregateCount,
    lastAggregatedAt:
      (r.lastAggregatedAt as string | undefined) ??
      (r.last_aggregated_at as string | undefined) ??
      null,
    expiresAt:
      (r.expiresAt as string | undefined) ??
      (r.expires_at as string | undefined) ??
      null,
  };
}

export interface NotificationsUnreadCountResponse {
  unreadCount: number;
  unreadByType: Partial<Record<HubNotificationType, number>>;
  hasCritical: boolean;
}

function normalizeUnreadCount(raw: unknown): NotificationsUnreadCountResponse {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const unreadByTypeRaw = r.unreadByType ?? r.unread_by_type;
  const unreadByType: Partial<Record<HubNotificationType, number>> = {};
  if (unreadByTypeRaw && typeof unreadByTypeRaw === "object") {
    for (const [k, v] of Object.entries(unreadByTypeRaw as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) {
        unreadByType[k as HubNotificationType] = v;
      }
    }
  }
  const unreadCountRaw = r.unreadCount ?? r.unread_count;
  return {
    unreadCount:
      typeof unreadCountRaw === "number" && Number.isFinite(unreadCountRaw)
        ? Math.max(0, unreadCountRaw)
        : 0,
    unreadByType,
    hasCritical: r.hasCritical === true || r.has_critical === true,
  };
}

export interface FetchNotificationsParams {
  unread?: boolean;
  limit?: number;
  cursor?: string;
}

export interface NotificationListResult {
  items: HubNotification[];
  nextCursor?: string;
}

export async function fetchNotifications(
  params: FetchNotificationsParams = {},
): Promise<HubNotification[]> {
  const result = await fetchNotificationsPage(params);
  return result.items;
}

export async function fetchNotificationsPage(
  params: FetchNotificationsParams = {},
): Promise<NotificationListResult> {
  const res = await api.get(endpoints.notifications, {
    params: {
      unread: params.unread === true ? true : undefined,
      limit: params.limit,
      cursor: params.cursor,
    },
  });
  return {
    items: unwrapNotifications(res.data),
    nextCursor: unwrapNextCursor(res.data),
  };
}

export async function fetchUnreadCount(): Promise<NotificationsUnreadCountResponse> {
  const res = await api.get(endpoints.notificationsUnreadCount);
  return normalizeUnreadCount(res.data);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(endpoints.notificationRead(id), {});
}

/** Map Socket.IO payload to HubNotification (defaults to unread, aggregateCount >= 1). */
export function notificationFromRealtimePayload(
  payload: Record<string, unknown> | object,
): HubNotification {
  const p = payload as Record<string, unknown>;
  return normalizeNotification({
    ...p,
    aggregateCount: p.aggregateCount ?? p.aggregate_count ?? 1,
    isRead: false,
    read: false,
    readAt: null,
    metadata: null,
    relatedEntityType: null,
    relatedEntityId: null,
  });
}
