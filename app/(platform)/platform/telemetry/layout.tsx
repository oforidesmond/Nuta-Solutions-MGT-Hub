"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SUB_NAV = [
  { href: "/platform/telemetry", label: "Overview", match: "exact" as const },
  { href: "/platform/telemetry/crashes", label: "Crash reports" },
  { href: "/platform/telemetry/performance", label: "Performance" },
  { href: "/platform/telemetry/device-health", label: "Device health" },
];

export default function TelemetryLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav
        aria-label="Telemetry sections"
        className="flex flex-wrap gap-1 rounded-lg border border-border/40 bg-card p-1"
      >
        {SUB_NAV.map((item) => {
          const active =
            item.match === "exact"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
