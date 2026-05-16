import { io, type Socket } from "socket.io-client";
import { getApiOrigin } from "@/lib/constants";
import type { NotificationBroadcastPayload } from "@/lib/types/notifications-realtime";
import type { NotificationRealtimePayload } from "@/lib/types/notifications-realtime";

export interface NotificationSocketCallbacks {
  onNew: (notification: NotificationRealtimePayload) => void;
  onBroadcast: (notification: NotificationBroadcastPayload) => void;
  onCountUpdated: () => void;
  onConnected: () => void;
  onDisconnected: (reason: string) => void;
  onError: (error: Error) => void;
}

class NotificationsSocket {
  private socket: Socket | null = null;
  private callbacks: NotificationSocketCallbacks | null = null;

  connect(accessToken: string, callbacks: NotificationSocketCallbacks) {
    this.disconnect();
    this.callbacks = callbacks;

    const apiOrigin = getApiOrigin();

    this.socket = io(`${apiOrigin}/notifications`, {
      path: "/socket.io/",
      transports: ["websocket", "polling"],
      auth: { token: accessToken },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      this.callbacks?.onConnected();
    });

    this.socket.on("disconnect", (reason) => {
      this.callbacks?.onDisconnected(reason);
    });

    this.socket.on("connect_error", (error) => {
      this.callbacks?.onError(error);
    });

    this.socket.on("notification:new", (data: NotificationRealtimePayload) => {
      this.callbacks?.onNew(data);
    });

    this.socket.on("notification:broadcast", (data: NotificationBroadcastPayload) => {
      this.callbacks?.onBroadcast(data);
    });

    this.socket.on("notification:count-updated", () => {
      this.callbacks?.onCountUpdated();
    });
  }

  reconnect(accessToken: string) {
    if (!this.callbacks) return;
    this.connect(accessToken, this.callbacks);
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const notificationsSocket = new NotificationsSocket();
