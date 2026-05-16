import type { HubNotificationType } from "@/lib/types/phase2";

export interface NotificationRealtimePayload {
  id: string;
  organizationId: string;
  userId: string | null;
  type: HubNotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  /** Merged event count for deduped types; always >= 1. */
  aggregateCount: number;
  createdAt: string;
}

export interface NotificationAdminBroadcastDigestPayload {
  organizationId: string;
  bulk: true;
  type: HubNotificationType;
  title: string;
  message: string;
  recipientCount: number;
}

export interface NotificationCountUpdatedPayload {
  organizationId: string;
}

export type NotificationBroadcastPayload =
  | NotificationRealtimePayload
  | NotificationAdminBroadcastDigestPayload;

export function isAdminBroadcastDigest(
  p: NotificationBroadcastPayload,
): p is NotificationAdminBroadcastDigestPayload {
  return "bulk" in p && p.bulk === true;
}
