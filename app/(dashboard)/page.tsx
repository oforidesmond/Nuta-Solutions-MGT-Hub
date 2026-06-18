"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Package,
  LineChart,
  Boxes,
  Plus,
  Mail,
  CloudUpload,
  HardDrive,
  Database,
  Bug,
  AlertTriangle,
  PackageX,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { fetchSalesWithVariancesPage } from "@/lib/api/sales";
import { FORCED_SALES_UI } from "@/lib/copy/forced-sales-ui";
import { fetchReliabilityHomeSummary, mergeReliabilityForHome } from "@/lib/api/staff-reliability";
import { formatCurrency, formatDate, toNumericAmount } from "@/lib/format";
import { formatRelativeUpdated } from "@/lib/format-relative-updated";
import { canViewStaffReliability } from "@/lib/operations-access";
import { POLL_DASHBOARD_MS, refetchIntervalWhenVisible } from "@/lib/query/poll-intervals";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { SendStaffNotificationModal } from "@/components/notifications/send-staff-notification-modal";
import { canSendStaffNotifications } from "@/lib/notifications/can-send-staff-notifications";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function DashboardHomePage() {
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);
  const canReliability = canViewStaffReliability(user?.role);
  const canNotifyStaff = canSendStaffNotifications(user?.role);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const activeBranchId = useActiveBranchId();

  const summaryQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "dashboard", "summary"),
    queryFn: fetchDashboardSummary,
    refetchInterval: () => refetchIntervalWhenVisible(POLL_DASHBOARD_MS),
  });

  const reliabilityQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "dashboard", "reliability-summary"),
    queryFn: fetchReliabilityHomeSummary,
    enabled: canReliability,
    refetchInterval: () => refetchIntervalWhenVisible(POLL_DASHBOARD_MS),
  });

  const variance7dRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const toIso = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    return { startDate: toIso(start), endDate: toIso(end) };
  }, []);

  const varianceQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "dashboard", "variance-7d", variance7dRange),
    queryFn: () =>
      fetchSalesWithVariancesPage({
        startDate: variance7dRange.startDate,
        endDate: variance7dRange.endDate,
        page: 1,
        limit: 1,
      }),
    refetchInterval: () => refetchIntervalWhenVisible(POLL_DASHBOARD_MS),
  });

  const businessName = organization?.name ?? "your shop";
  const signedInAs =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "there";

  const summary = summaryQuery.data ?? null;

  const totalRevenueNumber = summary ? toNumericAmount(summary.totalRevenue) : 0;
  const activeCatalogCount =
    summary != null
      ? (summary.totalActiveProducts ?? summary.inventoryCount ?? 0)
      : 0;

  const revenueHint = useMemo(() => {
    if (!summary) return "";
    const parts: string[] = [];
    if (summary.todayRevenue != null || summary.todaySales != null) {
      const tr =
        summary.todayRevenue != null ? toNumericAmount(summary.todayRevenue) : null;
      const ts = summary.todaySales != null ? summary.todaySales : null;
      if (tr != null) parts.push(`Today: ${formatCurrency(tr, organization?.currency)}`);
      if (ts != null) parts.push(`${ts} sales today`);
    }
    parts.push(`${summary.totalSales ?? 0} sales all-time`);
    return parts.join(" · ");
  }, [summary, organization?.currency]);

  const reliabilityMerged =
    canReliability && summary ? mergeReliabilityForHome(reliabilityQuery.data ?? null, summary) : null;
  const reliabilityMetaMissing =
    canReliability && summary && reliabilityQuery.isError && !summary.reliability;

  const criticalRecent = useMemo(() => {
    if (!reliabilityMerged) return false;
    const iso =
      reliabilityMerged.latestCriticalStorageAt ??
      (reliabilityMerged.storageLastLevel === "critical"
        ? reliabilityMerged.storageLastOccurredAt
        : null);
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return false;
    // eslint-disable-next-line react-hooks/purity -- relative age vs wall clock for ops banner
    const age = Date.now() - t;
    return age >= 0 && age < 24 * 60 * 60 * 1000;
  }, [reliabilityMerged]);

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {businessName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{signedInAs}</span>
        </p>
        {summary?.branch?.name ? (
          <p className="text-sm text-muted-foreground">
            Viewing{" "}
            <span className="font-medium text-foreground">{summary.branch.name}</span>
            {summary.branch.isDefault ? " (default branch)" : ""}
          </p>
        ) : null}
        {summaryQuery.dataUpdatedAt ? (
          <p className="text-xs text-muted-foreground">
            Dashboard data updated {formatRelativeUpdated(summaryQuery.dataUpdatedAt)}
          </p>
        ) : null}
      </div>

      <section aria-label="Key metrics">
        {summaryQuery.isError ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-4 text-sm">
            <p className="font-medium text-destructive">Could not load dashboard metrics.</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void summaryQuery.refetch()}>
              Retry metrics
            </Button>
          </div>
        ) : summaryQuery.isPending && !summary ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total revenue"
              value={formatCurrency(totalRevenueNumber, organization?.currency)}
              hint={revenueHint || "All-time revenue from recorded sales"}
            />
            <MetricCard
              title="Active products"
              value={String(activeCatalogCount)}
              hint="Items in your active catalogue"
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
          </div>
        )}
      </section>

      <section aria-label={FORCED_SALES_UI.sectionAria7d}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <VarianceLinkCard
            href="/sales"
            isLoading={varianceQuery.isPending && !varianceQuery.data}
            isError={varianceQuery.isError}
            value={varianceQuery.data?.total}
          />
        </div>
      </section>

      {canReliability && !summaryQuery.isPending ? (
        <div className="space-y-4">
          {reliabilityMetaMissing ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
              <p className="font-medium text-amber-900 dark:text-amber-100">Reliability summary unavailable.</p>
              <p className="mt-1 text-muted-foreground">
                Confirm <code className="rounded bg-muted px-1">GET /api/v1/dashboard/reliability-summary</code> is
                deployed and your role is ADMIN or MANAGER.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void reliabilityQuery.refetch()}
              >
                Retry reliability
              </Button>
            </div>
          ) : null}

          {reliabilityMerged ? (
            <>
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
                      <Link
                        href="/operations/device-storage-warnings"
                        className="font-medium underline underline-offset-2"
                      >
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
                    Reliability summary could not be loaded. Operations list pages use separate GET routes.
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
                      ? `Last ${formatDate(reliabilityMerged.storageLastOccurredAt)} (${reliabilityMerged.storageLastLevel ?? "-"})`
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
            </>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/products/new" />}>
            <Plus className="size-4" aria-hidden />
            Add product
          </Button>
          {canNotifyStaff ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 justify-center sm:min-w-[11rem]"
              onClick={() => setNotifyOpen(true)}
            >
              <Mail className="size-4" aria-hidden />
              Message staff
            </Button>
          ) : null}
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

      {canNotifyStaff ? (
        <SendStaffNotificationModal open={notifyOpen} onOpenChange={setNotifyOpen} />
      ) : null}
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

function VarianceLinkCard({
  href,
  isLoading,
  isError,
  value,
}: {
  href: string;
  isLoading: boolean;
  isError: boolean;
  value: number | undefined;
}) {
  const total = typeof value === "number" ? value : 0;
  const display = isLoading ? "…" : isError ? "-" : String(total);
  const hint = isError
    ? FORCED_SALES_UI.feedUnavailable
    : isLoading
      ? FORCED_SALES_UI.loadingCount
      : total > 0
        ? FORCED_SALES_UI.hasSellAnywayLine
        : FORCED_SALES_UI.noneIn7d;
  return (
    <Link href={href} className="block">
      <Card className="relative h-full border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
        {!isLoading && !isError && total > 0 ? (
          <Badge
            className="absolute right-3 top-3 min-w-7 justify-center border-amber-600/50 bg-amber-500 px-1.5 text-xs font-semibold tabular-nums text-amber-950 dark:bg-amber-500 dark:text-amber-950"
            variant="secondary"
          >
            {total > 99 ? "99+" : total}
          </Badge>
        ) : null}
        <CardHeader className="relative pb-2">
          <div className="flex items-center gap-2">
            <PackageX className="size-4 text-muted-foreground" aria-hidden />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {FORCED_SALES_UI.cardTitle7d}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight">{display}</p>
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
