"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { NotificationDetailSheet } from "@/components/notifications/notification-detail-sheet";
import type { HubNotification } from "@/lib/types/phase2";

interface NotificationDetailContextValue {
  openDetail: (notification: HubNotification) => void;
  closeDetail: () => void;
}

const NotificationDetailContext = createContext<NotificationDetailContextValue | null>(null);

export function NotificationDetailProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<HubNotification | null>(null);
  const [open, setOpen] = useState(false);

  const value: NotificationDetailContextValue = {
    openDetail(notification) {
      setSelected(notification);
      setOpen(true);
    },
    closeDetail() {
      setOpen(false);
    },
  };

  return (
    <NotificationDetailContext.Provider value={value}>
      {children}
      <NotificationDetailSheet
        notification={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </NotificationDetailContext.Provider>
  );
}

export function useNotificationDetailOpener(): NotificationDetailContextValue {
  const ctx = useContext(NotificationDetailContext);
  if (!ctx) {
    throw new Error("useNotificationDetailOpener must be used within NotificationDetailProvider");
  }
  return ctx;
}
