"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { navSections } from "@/components/layout/nav-config";
import { canManageStockTakes } from "@/lib/inventory-access";
import { canSendStaffNotifications } from "@/lib/notifications/can-send-staff-notifications";
import { cn } from "@/lib/utils";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth-store";

type AppSidebarProps = { onNavigate?: () => void };

const STOCK_TAKE_HREF = "/inventory/stock-take";
const STAFF_NOTIFICATIONS_HREF = "/notifications";

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const showStockTake = canManageStockTakes(role);
  const showStaffNotifications = canSendStaffNotifications(role);

  const filteredSections = useMemo(
    () =>
      navSections.map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          if (!showStockTake && item.href === STOCK_TAKE_HREF) return false;
          if (!showStaffNotifications && item.href === STAFF_NOTIFICATIONS_HREF) return false;
          return true;
        }),
      })),
    [showStockTake, showStaffNotifications],
  );

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside
      className={cn(
        "flex w-60 shrink-0 flex-col gap-1 border-r border-border/30 p-3",
        "bg-sidebar/75 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/60",
      )}
    >
      <SidebarBrand title="Management Hub" />
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {filteredSections.map((section, si) => (
          <div key={si} className="space-y-1">
            {section.title ? (
              <p className="px-2 pb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
            ) : null}
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => onNavigate?.()}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
            {si < navSections.length - 1 ? <Separator className="my-2 opacity-40" /> : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
