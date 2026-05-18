import type { HubNotification } from "@/lib/types/phase2";

/** Display name stamped on platform super-admin broadcasts (server + client). */
export const PLATFORM_SUPPORT_DISPLAY_NAME = "NutaSolutions Support";

/** `metadata.source` for rows created via `POST /platform/notifications/broadcast`. */
export const PLATFORM_SUPPORT_SOURCE = "platform_support";

type NotificationLike = Pick<HubNotification, "metadata"> & {
  senderName?: string | null;
};

function readSenderDisplayName(metadata: Record<string, unknown> | null | undefined): string | null {
  const sender = metadata?.sender;
  if (!sender || typeof sender !== "object") return null;
  const displayName = (sender as Record<string, unknown>).displayName;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}

/** True when the notification was sent from the platform super-admin console. */
export function isPlatformSupportNotification(n: NotificationLike): boolean {
  if (n.metadata?.source === PLATFORM_SUPPORT_SOURCE) return true;
  if (readSenderDisplayName(n.metadata) === PLATFORM_SUPPORT_DISPLAY_NAME) return true;
  if (n.senderName === PLATFORM_SUPPORT_DISPLAY_NAME) return true;
  return false;
}

export function getPlatformSupportDisplayName(n: NotificationLike): string | null {
  return isPlatformSupportNotification(n) ? PLATFORM_SUPPORT_DISPLAY_NAME : null;
}
