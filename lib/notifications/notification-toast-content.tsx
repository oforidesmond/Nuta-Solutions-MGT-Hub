import type { ReactNode } from "react";
import { PlatformSupportSenderLabel } from "@/components/notifications/platform-support-sender-label";
import { isPlatformSupportNotification } from "@/lib/notifications/platform-support-notification";
import type { HubNotification } from "@/lib/types/phase2";

type ToastLike = Pick<HubNotification, "metadata" | "message"> & {
  senderName?: string | null;
};

export function notificationToastDescription(
  notification: ToastLike,
  message?: string,
): ReactNode | undefined {
  const body = message ?? notification.message;
  if (!isPlatformSupportNotification(notification)) {
    return body || undefined;
  }

  return (
    <div className="flex flex-col gap-2 pt-0.5">
      <PlatformSupportSenderLabel variant="compact" />
      {body ? <p className="text-sm leading-snug text-muted-foreground">{body}</p> : null}
    </div>
  );
}
