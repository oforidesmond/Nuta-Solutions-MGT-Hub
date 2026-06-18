import { resolveNotificationHref } from "@/lib/navigation/notification-href";
import type { HubNotification } from "@/lib/types/phase2";

export interface NotificationAction {
  href: string;
  label: string;
}

function labelFromPath(href: string): string {
  const path = href.split("?")[0] ?? href;
  if (path === "/" || path === "") return "Go to dashboard";
  if (path.startsWith("/sales/") && path.includes("/return/")) return "View return";
  if (path.startsWith("/sales/")) return "View sale";
  if (path === "/sales") return "Open sales";
  if (path.startsWith("/returns")) return "Open returns";
  if (path.startsWith("/products/")) return "View product";
  if (path.startsWith("/inventory/temporary-items")) return "Review temporary items";
  if (path.startsWith("/inventory/alerts")) return "View low stock";
  if (path.startsWith("/inventory/adjustments")) return "View stock movements";
  if (path === "/products/expiring") return "View expiring products";
  if (path === "/products") return "Open products";
  if (path.startsWith("/staff/")) return "View staff member";
  if (path === "/staff") return "Open staff";
  if (path.startsWith("/branches")) return "Open branches";
  if (path.startsWith("/settings")) return "Open settings";
  return "Open";
}

/** Primary deep-link action for a notification, if any. */
export function resolveNotificationAction(n: HubNotification): NotificationAction | null {
  const href = resolveNotificationHref(n);
  if (!href) {
    if (n.type === "BRANCH_STOCK_VARIANCE") {
      return { href: "/sales", label: "Open sales" };
    }
    return null;
  }

  const label = n.actionLabel?.trim() || labelFromPath(href);
  return { href, label };
}

export function displayNotificationType(n: HubNotification): string {
  if (n.type === "OTHER" && n.metadata?.originalType && typeof n.metadata.originalType === "string") {
    return n.metadata.originalType;
  }
  return n.type.replace(/_/g, " ");
}

export function hubManualSenderDisplayName(n: HubNotification): string | null {
  const sender = n.metadata?.sender;
  if (!sender || typeof sender !== "object") return null;
  const displayName = (sender as Record<string, unknown>).displayName;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : null;
}
