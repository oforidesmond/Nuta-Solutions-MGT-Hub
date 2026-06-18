"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { refreshAccessToken } from "@/lib/api/refresh-access";
import { isAuthConnectError, isAuthRelatedDisconnect } from "@/lib/notifications/auth-reconnect";
import {
  isCriticalNotificationType,
  toastCriticalNotification,
} from "@/lib/notifications/critical-notification";
import { notificationToastDescription } from "@/lib/notifications/notification-toast-content";
import { PLATFORM_SUPPORT_SOURCE } from "@/lib/notifications/platform-support-notification";
import { clearDebounceInvalidateUnreadCount, debounceInvalidateUnreadCount } from "@/lib/notifications/debounce-invalidate";
import { mergeNotificationIntoList } from "@/lib/notifications/merge-notification-list";
import {
  notificationsListQueryKey,
  notificationsUnreadCountQueryKey,
  otherBranchUnreadQueryKeyPrefix,
} from "@/lib/notifications/query-keys";
import { notificationsSocket } from "@/lib/services/notifications-socket";
import {
  isAdminBroadcastDigest,
  type NotificationRealtimePayload,
} from "@/lib/types/notifications-realtime";
import type { HubNotification } from "@/lib/types/phase2";
import { useAuthStore } from "@/stores/auth-store";

interface NotificationsRealtimeContextValue {
  isSocketConnected: boolean;
}

const NotificationsRealtimeContext = createContext<NotificationsRealtimeContextValue>({
  isSocketConnected: false,
});

export function useNotificationsRealtime(): NotificationsRealtimeContextValue {
  return useContext(NotificationsRealtimeContext);
}

function maybeToastCritical(notification: NotificationRealtimePayload): void {
  if (isCriticalNotificationType(notification.type)) {
    toastCriticalNotification(notification.title, notification.message, {
      metadata: notification.senderName
        ? { source: PLATFORM_SUPPORT_SOURCE, sender: { displayName: notification.senderName } }
        : null,
      senderName: notification.senderName,
    });
  }
}

export function NotificationsRealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((s) => s.accessToken);
  const organizationId = useAuthStore((s) => s.organization?.id);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const listKey = useMemo(
    () => notificationsListQueryKey(activeBranchId),
    [activeBranchId],
  );
  const countKey = useMemo(
    () => notificationsUnreadCountQueryKey(activeBranchId),
    [activeBranchId],
  );
  const listKeyRef = useRef(listKey);
  listKeyRef.current = listKey;
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const reconnectInFlight = useRef(false);

  const syncFromRest = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: listKey });
    void queryClient.invalidateQueries({ queryKey: countKey });
    void queryClient.invalidateQueries({ queryKey: otherBranchUnreadQueryKeyPrefix });
  }, [queryClient, listKey, countKey]);

  const tryRefreshAndReconnect = useCallback(async () => {
    if (reconnectInFlight.current) return;
    reconnectInFlight.current = true;
    try {
      const next = await refreshAccessToken();
      if (next) notificationsSocket.reconnect(next);
    } finally {
      reconnectInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !organizationId) {
      notificationsSocket.disconnect();
      setIsSocketConnected(false);
      return;
    }

    notificationsSocket.connect(accessToken, {
      onNew: (notification) => {
        queryClient.setQueryData<HubNotification[]>(listKeyRef.current, (old) =>
          mergeNotificationIntoList(old, notification),
        );
        debounceInvalidateUnreadCount(queryClient);
        maybeToastCritical(notification);
      },

      onBroadcast: (payload) => {
        if (isAdminBroadcastDigest(payload)) {
          void queryClient.invalidateQueries({ queryKey: listKeyRef.current });
          const digestMessage =
            payload.recipientCount > 1
              ? `${payload.message} (${payload.recipientCount} recipients)`
              : payload.message;
          toast.info(payload.title, {
            description: notificationToastDescription(
              {
                metadata: {
                  source: payload.source ?? PLATFORM_SUPPORT_SOURCE,
                  sender: { displayName: payload.senderName ?? "NutaSolutions Support" },
                },
                message: digestMessage,
                senderName: payload.senderName,
              },
              digestMessage,
            ),
          });
        } else {
          queryClient.setQueryData<HubNotification[]>(listKeyRef.current, (old) =>
            mergeNotificationIntoList(old, payload),
          );
          maybeToastCritical(payload);
        }
        debounceInvalidateUnreadCount(queryClient);
      },

      onCountUpdated: () => {
        debounceInvalidateUnreadCount(queryClient);
      },

      onConnected: () => {
        setIsSocketConnected(true);
      },

      onDisconnected: async (reason) => {
        setIsSocketConnected(false);
        if (isAuthRelatedDisconnect(reason)) {
          await tryRefreshAndReconnect();
        }
      },

      onError: async (error) => {
        setIsSocketConnected(false);
        if (isAuthConnectError(error)) {
          await tryRefreshAndReconnect();
        }
      },
    });

    return () => {
      clearDebounceInvalidateUnreadCount();
      notificationsSocket.disconnect();
      setIsSocketConnected(false);
    };
  }, [accessToken, organizationId, queryClient, tryRefreshAndReconnect]);

  /** Branch switch: refresh inbox cache without tearing down the org-wide socket. */
  useEffect(() => {
    if (!accessToken || !organizationId) return;
    void queryClient.invalidateQueries({ queryKey: listKey });
    void queryClient.invalidateQueries({ queryKey: countKey });
  }, [accessToken, organizationId, queryClient, listKey, countKey]);

  useEffect(() => {
    if (!accessToken || !organizationId) return;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (!notificationsSocket.isConnected()) syncFromRest();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [accessToken, organizationId, syncFromRest]);

  const value = useMemo(
    () => ({ isSocketConnected }),
    [isSocketConnected],
  );

  return (
    <NotificationsRealtimeContext.Provider value={value}>
      {children}
    </NotificationsRealtimeContext.Provider>
  );
}
