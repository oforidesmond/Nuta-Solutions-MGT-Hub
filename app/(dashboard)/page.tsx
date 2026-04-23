"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import {
  Package,
  LineChart,
  Boxes,
  Plus,
  CloudUpload,
  HardDrive,
  Database,
  Bug,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { fetchReliabilityHomeSummary, mergeReliabilityForHome } from "@/lib/api/staff-reliability";
import { formatCurrency, formatDate } from "@/lib/format";
import { canViewStaffReliability } from "@/lib/operations-access";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardSummary } from "@/lib/types/domain";
import type { ReliabilityHomeSummary } from "@/lib/types/staff-reliability";
import { cn } from "@/lib/utils";

export default function DashboardHomePage() {
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dedicatedReliability, setDedicatedReliability] = useState<ReliabilityHomeSummary | null | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState(true);

  const canReliability = canViewStaffReliability(user?.role);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const allowReliability = canViewStaffReliability(useAuthStore.getState().user?.role);
      try {
        const s = await fetchDashboardSummary();
        if (cancelled) return;
        setSummary(s);
        if (allowReliability) {
          try {
            const d = await fetchReliabilityHomeSummary();
            if (!cancelled) setDedicatedReliability(d);
          } catch (e) {
            if (!cancelled) setDedicatedReliability(null);
            if (!cancelled && axios.isAxiosError(e)) {
              const s = e.response?.status;
              if (s === 404) {
                toast.error(
                  "GET /dashboard/reliability-summary returned 404. Check NEXT_PUBLIC_API_URL and API deploy.",
                );
              } else if (s === 403) {
                toast.error(
                  "You cannot load the reliability summary (403). Use an organisation admin or manager with a tenant JWT.",
                );
              }
            }
          }
        } else if (!cancelled) {
          setDedicatedReliability(undefined);
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not load your dashboard. Check your connection.");
          setSummary({
            totalSales: 0,
            inventoryCount: 0,
            lowStockCount: 0,
            expiringSoonCount: 0,
          });
          setDedicatedReliability(undefined);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const businessName = organization?.name ?? "your shop";
  const signedInAs =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "there";

  const reliabilityMerged =
    canReliability && summary
      ? mergeReliabilityForHome(dedicatedReliability === undefined ? null : dedicatedReliability, summary)
      : null;
  const reliabilityMetaMissing =
    canReliability &&
    summary &&
    dedicatedReliability === null &&
    !summary.reliability;

  const criticalRecent = Boolean(
    reliabilityMerged &&
      (() => {
        const iso =
          reliabilityMerged.latestCriticalStorageAt ??
          (reliabilityMerged.storageLastLevel === "critical"
            ? reliabilityMerged.storageLastOccurredAt
            : null);
        if (!iso) return false;
        const t = new Date(iso).getTime();
        if (!Number.isFinite(t)) return false;
        const age = Date.now() - t;
        return age >= 0 && age < 24 * 60 * 60 * 1000;
      })(),
  );

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {businessName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{signedInAs}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Money from sales"
              value={formatCurrency(summary?.totalSales ?? 0, organization?.currency)}
              hint="All recorded sales added together"
            />
            <MetricCard
              title="Items you sell"
              value={String(summary?.inventoryCount ?? 0)}
              hint="Active products in your catalog"
            />
            <MetricCard
              title="Running low or out"
              value={String(summary?.lowStockCount ?? 0)}
              hint="Needs restocking soon"
              badgeCount={summary?.lowStockCount ?? 0}
              badgeTone="destructive"
            />
            <MetricCard
              title="Expiry warnings"
              value={String(summary?.expiringSoonCount ?? 0)}
              hint="Batches expiring in the next 90 days"
              badgeCount={summary?.expiringSoonCount ?? 0}
              badgeTone="warning"
            />
          </>
        )}
      </div>

      {canReliability && !loading && reliabilityMerged ? (
        <div className="space-y-4">
          {criticalRecent ? (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm dark:bg-destructive/15">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
              <div>
                <p className="font-medium text-destructive">Critical low storage on a staff device</p>
                <p className="mt-1 text-muted-foreground">
                  Latest critical event at{" "}
                  {formatDate(
                    reliabilityMerged.latestCriticalStorageAt ?? reliabilityMerged.storageLastOccurredAt,
                  )}
                  . Review{" "}
                  <Link href="/operations/device-storage-warnings" className="font-medium underline underline-offset-2">
                    storage warnings
                  </Link>
                  .
                </p>
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Staff devices and reliability</h2>
            {reliabilityMetaMissing ? (
              <p className="text-xs text-muted-foreground">
                Reliability summary could not be loaded (see toast). Confirm{" "}
                <code className="rounded bg-muted px-1">GET /api/v1/dashboard/reliability-summary</code> is deployed
                and your account is <span className="font-medium">ADMIN</span> or{" "}
                <span className="font-medium">MANAGER</span> for this organisation. Operations list pages use separate
                GET routes.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReliabilityLinkCard
              href="/operations/device-backups"
              title="Device backups (7d)"
              value={String(reliabilityMerged.backupsLast7DaysCount)}
              hint={
                reliabilityMerged.backupsLast7DaysLatestReceivedAt
                  ? `Latest received ${formatDate(reliabilityMerged.backupsLast7DaysLatestReceivedAt)}`
                  : "No recent uploads recorded in summary"
              }
              icon={CloudUpload}
            />
            <ReliabilityLinkCard
              href="/operations/device-storage-warnings"
              title="Low storage (critical)"
              value={String(reliabilityMerged.storageCriticalLast24hCount)}
              hint={
                reliabilityMerged.storageLastOccurredAt
                  ? `Last ${formatDate(reliabilityMerged.storageLastOccurredAt)} (${reliabilityMerged.storageLastLevel ?? "—"})`
                  : "No recent low-storage events in summary"
              }
              icon={HardDrive}
              badgeCount={reliabilityMerged.storageCriticalLast24hCount}
              badgeTone="destructive"
            />
            <ReliabilityLinkCard
              href="/operations/database-warnings"
              title="Database issues (7d)"
              value={String(reliabilityMerged.databaseIssuesLast7DaysCount)}
              hint={
                reliabilityMerged.databaseLastUnhealthyAt
                  ? `Last unhealthy ${formatDate(reliabilityMerged.databaseLastUnhealthyAt)}`
                  : "Integrity or health reports from SQLite"
              }
              icon={Database}
              badgeCount={reliabilityMerged.databaseIssuesLast7DaysCount}
              badgeTone="warning"
            />
            <ReliabilityLinkCard
              href="/operations/mobile-crashes"
              title="Crash reports (24h)"
              value={String(reliabilityMerged.crashesLast24hCount)}
              hint={
                reliabilityMerged.crashesLastOccurredAt
                  ? `Last ${formatDate(reliabilityMerged.crashesLastOccurredAt)}${
                      reliabilityMerged.crashesLastWasFatal === true
                        ? " (fatal)"
                        : reliabilityMerged.crashesLastWasFatal === false
                          ? " (non-fatal)"
                          : ""
                    } · ${reliabilityMerged.crashesLast24hFatalCount} fatal in 24h`
                  : `${reliabilityMerged.crashesLast24hFatalCount} fatal in last 24 hours`
              }
              icon={Bug}
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/products/new" />}>
            <Plus className="size-4" aria-hidden />
            Add product
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/inventory" />}>
            <Boxes className="size-4" aria-hidden />
            Stock overview
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/products" />}>
            <Package className="size-4" aria-hidden />
            View products
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/reports" />}>
            <LineChart className="size-4" aria-hidden />
            Reports
          </Button>
        </div>
      </div>
    </div>
  );
}

function ReliabilityLinkCard({
  href,
  title,
  value,
  hint,
  icon: Icon,
  badgeCount,
  badgeTone = "neutral",
}: {
  href: string;
  title: string;
  value: string;
  hint: string;
  icon: typeof CloudUpload;
  badgeCount?: number;
  badgeTone?: "neutral" | "destructive" | "warning";
}) {
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;
  return (
    <Link href={href} className="block">
      <Card className="relative h-full border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
        {showBadge ? (
          <Badge
            className={cn(
              "absolute right-3 top-3 min-w-7 justify-center px-1.5 text-xs font-semibold tabular-nums",
              badgeTone === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
              badgeTone === "warning" &&
                "border-amber-600/50 bg-amber-500 text-amber-950 dark:bg-amber-500 dark:text-amber-950",
            )}
            variant={badgeTone === "destructive" ? "destructive" : "secondary"}
          >
            {badgeCount! > 99 ? "99+" : badgeCount}
          </Badge>
        ) : null}
        <CardHeader className="relative pb-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  hint,
  badgeCount,
  badgeTone = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  badgeCount?: number;
  badgeTone?: "neutral" | "destructive" | "warning";
}) {
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;
  return (
    <Card className="relative border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
      {showBadge ? (
        <Badge
          className={cn(
            "absolute right-3 top-3 min-w-7 justify-center px-1.5 text-xs font-semibold tabular-nums",
            badgeTone === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
            badgeTone === "warning" &&
              "border-amber-600/50 bg-amber-500 text-amber-950 dark:bg-amber-500 dark:text-amber-950",
          )}
          variant={badgeTone === "destructive" ? "destructive" : "secondary"}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </Badge>
      ) : null}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
