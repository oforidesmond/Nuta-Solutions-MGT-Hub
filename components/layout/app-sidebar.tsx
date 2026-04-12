"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navSections } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

type AppSidebarProps = { onNavigate?: () => void };

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname();

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
      <div className="mb-4 px-2 pt-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">NutaPOS</p>
        <p className="text-sm font-semibold text-foreground">Management Hub</p>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto pb-4">
        {navSections.map((section, si) => (
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
