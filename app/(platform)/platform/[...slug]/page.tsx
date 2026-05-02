"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Construction } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { platformNavSections } from "@/components/platform/nav-config";
import { cn } from "@/lib/utils";

/**
 * Phase 1 placeholder for not-yet-built platform sub-routes (Organizations,
 * Users, Devices, Analytics, Telemetry, Audit, Notifications). Subsequent
 * phases will replace each surface with its real page; this catch-all
 * exists so the sidebar navigation works end-to-end without 404s.
 */
export default function PlatformComingSoonPage() {
  const params = useParams<{ slug?: string[] }>();
  const slug = Array.isArray(params?.slug) ? params!.slug.join("/") : "";
  const fullPath = slug ? `/platform/${slug}` : "/platform";
  const label = labelForPath(fullPath) ?? prettifyLast(slug) ?? "This area";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Platform Console
        </p>
        <h1 className="mt-1 font-heading text-2xl font-semibold text-foreground">
          {label}
        </h1>
      </div>
      <EmptyState
        icon={<Construction className="size-10" aria-hidden />}
        title={`${label} is coming soon`}
        description="The backend for this surface is live, and the UI ships in a follow-up phase. Use the dashboard for the platform overview in the meantime."
      />
      <div className="flex justify-center">
        <Link
          href="/platform"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function labelForPath(path: string): string | null {
  for (const section of platformNavSections) {
    for (const item of section.items) {
      if (item.href === path) return item.label;
    }
  }
  return null;
}

function prettifyLast(slug: string): string | null {
  if (!slug) return null;
  const last = slug.split("/").filter(Boolean).pop() ?? "";
  if (!last) return null;
  return last
    .split(/[-_]/g)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
