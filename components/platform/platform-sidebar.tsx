"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { platformNavSections } from "@/components/platform/nav-config";
import { SidebarBrand } from "@/components/layout/sidebar-brand";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type PlatformSidebarProps = { onNavigate?: () => void };

export function PlatformSidebar({ onNavigate }: PlatformSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/platform") return pathname === "/platform";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const isMobileDrawer = Boolean(onNavigate);

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col gap-1 border-r border-border/30 p-3",
        "bg-sidebar/75 backdrop-blur-xl supports-[backdrop-filter]:bg-sidebar/60",
        isMobileDrawer ? "h-full min-h-0 w-full" : "w-60",
      )}
    >
      <SidebarBrand title="Platform Console" />
      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {platformNavSections.map((section, si) => (
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
            {si < platformNavSections.length - 1 ? (
              <Separator className="my-2 opacity-40" />
            ) : null}
          </div>
        ))}
      </nav>
    </aside>
  );
}
