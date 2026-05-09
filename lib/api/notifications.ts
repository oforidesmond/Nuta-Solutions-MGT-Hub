import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubNotification } from "@/lib/types/phase2";

function unwrapNotifications(raw: unknown): HubNotification[] {
  if (Array.isArray(raw)) return raw.map(normalizeNotification);
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.data ?? o.notifications ?? o.items ?? o.results;
    if (Array.isArray(list)) return list.map(normalizeNotification);
  }
  return [];
}

function normalizeNotification(row: unknown): HubNotification {
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
  return {
    id: String(r.id ?? ""),
    type: String(r.type ?? "UNKNOWN"),
    title: (r.title as string | null | undefined) ?? null,
    message: String(r.message ?? r.body ?? r.title ?? ""),
    read: typeof r.read === "boolean" ? r.read : typeof r.isRead === "boolean" ? r.isRead : undefined,
    createdAt:
      (r.createdAt as string | undefined) ??
      (r.created_at as string | undefined) ??
      null,
    actionUrl:
      (r.actionUrl as string | undefined) ??
      (r.action_url as string | undefined) ??
      null,
    relatedEntityType,
    relatedEntityId,
    metadata: meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null,
  };
}

export interface FetchNotificationsParams {
  unread?: boolean;
  limit?: number;
  cursor?: string;
}

export async function fetchNotifications(params: FetchNotificationsParams = {}): Promise<HubNotification[]> {
  const res = await api.get(endpoints.notifications, {
    params: {
      unread: params.unread === true ? true : undefined,
      limit: params.limit,
      cursor: params.cursor,
    },
  });
  return unwrapNotifications(res.data);
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(endpoints.notificationRead(id), {});
}
