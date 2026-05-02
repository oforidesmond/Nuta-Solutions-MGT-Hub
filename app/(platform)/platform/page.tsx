"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Bell,
  Building2,
  DollarSign,
  RotateCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { fetchPlatformDashboard } from "@/lib/api/platform/dashboard";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { handleApiError } from "@/lib/api/errors";
import { MetricCard } from "@/components/platform/metric-card";
import { StatusCard, StatusItem } from "@/components/platform/status-card";
import { PlatformDashboardSkeleton } from "@/components/platform/dashboard-skeleton";
import type { PlanType } from "@/lib/types/platform";

const PLAN_ORDER: PlanType[] = ["FREE", "TRIAL", "PRO", "ENTERPRISE"];

const PLAN_LABEL: Record<PlanType, string> = {
  FREE: "Free",
  TRIAL: "Trial",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

const PLAN_TONE: Record<PlanType, "neutral" | "info" | "success" | "warning"> = {
  FREE: "neutral",
  TRIAL: "warning",
  PRO: "info",
  ENTERPRISE: "success",
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function PlatformDashboardPage() {
  const query = useQuery({
    queryKey: ["platform", "dashboard"],
    queryFn: fetchPlatformDashboard,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });

  if (query.isPending) {
    return <PlatformDashboardSkeleton />;
  }

  if (query.isError || !query.data) {
    return (
      <Card className="gap-4 p-6">
        <div className="space-y-1">
          <h2 className="font-heading text-base font-semibold text-foreground">
            Could not load platform overview
          </h2>
          <p className="text-sm text-muted-foreground">
            {handleApiError(query.error)}
          </p>
        </div>
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  const data = query.data;
  const revenue = toNumber(data.sales?.totalRevenue);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Platform Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Overview of all NutaPOS organizations across the platform.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Auto-refreshes every minute
          {query.isFetching ? " · refreshing…" : ""}
        </p>
      </div>

      {/* Metric cards */}
      <section
        aria-label="Headline metrics"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
      >
        <MetricCard
          title="Organizations"
          value={data.organizations.total.toLocaleString()}
          subtitle={`${data.organizations.active.toLocaleString()} active`}
          trend={
            data.growth?.newOrgsThisWeek
              ? `+${data.growth.newOrgsThisWeek} this week`
              : undefined
          }
          icon={Building2}
          tone="primary"
        />
        <MetricCard
          title="Users"
          value={data.users.total.toLocaleString()}
          subtitle={`${data.users.active.toLocaleString()} active`}
          trend={
            data.growth?.newUsersThisWeek
              ? `+${data.growth.newUsersThisWeek} this week`
              : undefined
          }
          icon={Users}
          tone="info"
        />
        <MetricCard
          title="Devices"
          value={data.devices.total.toLocaleString()}
          subtitle={`${data.devices.active.toLocaleString()} active`}
          icon={Smartphone}
          tone="success"
        />
        <MetricCard
          title="Revenue"
          value={formatCurrency(revenue)}
          subtitle={
            data.sales?.thisMonth
              ? `${data.sales.thisMonth.toLocaleString()} sales this month`
              : "Lifetime gross"
          }
          icon={DollarSign}
          tone="success"
        />
      </section>

      {/* Status cards */}
      <section
        aria-label="Status breakdown"
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        <StatusCard title="Organizations by status">
          <StatusItem
            label="Active"
            count={data.organizations.active}
            tone="success"
          />
          <StatusItem
            label="Suspended"
            count={data.organizations.suspended}
            tone={data.organizations.suspended > 0 ? "danger" : "neutral"}
            warning={data.organizations.suspended > 0}
          />
          <StatusItem
            label="Trial expired"
            count={data.organizations.trialExpired}
            tone={data.organizations.trialExpired > 0 ? "warning" : "neutral"}
          />
        </StatusCard>

        <StatusCard title="Plan distribution">
          {PLAN_ORDER.filter((p) => data.organizations.byPlan?.[p] !== undefined).map((plan) => (
            <StatusItem
              key={plan}
              label={PLAN_LABEL[plan]}
              count={data.organizations.byPlan?.[plan] ?? 0}
              tone={PLAN_TONE[plan]}
            />
          ))}
          {Object.keys(data.organizations.byPlan ?? {}).length === 0 ? (
            <p className="text-xs text-muted-foreground">No plan data yet.</p>
          ) : null}
        </StatusCard>

        <StatusCard title="Health alerts">
          <StatusItem
            label="Crashes (24h)"
            count={data.health.crashReportsLast24h}
            tone={data.health.crashReportsLast24h > 0 ? "danger" : "success"}
          />
          <StatusItem
            label="Performance issues"
            count={data.health.performanceIssues}
            tone={data.health.performanceIssues > 0 ? "warning" : "success"}
          />
          <StatusItem
            label="Storage warnings"
            count={data.health.storageWarnings}
            tone={data.health.storageWarnings > 0 ? "warning" : "success"}
          />
        </StatusCard>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions">
        <Card className="gap-3 p-5">
          <div>
            <h2 className="font-heading text-sm font-semibold text-foreground">
              Quick actions
            </h2>
            <p className="text-xs text-muted-foreground">
              Jump to the most common platform-admin workflows.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <QuickAction href="/platform/organizations" icon={Building2}>
              View all organizations
            </QuickAction>
            <QuickAction href="/platform/analytics" icon={TrendingUp}>
              View analytics
            </QuickAction>
            <QuickAction href="/platform/telemetry/crashes" icon={AlertTriangle}>
              Crash reports
            </QuickAction>
            <QuickAction href="/platform/audit" icon={Activity}>
              Audit log
            </QuickAction>
            <QuickAction href="/platform/notifications" icon={Bell}>
              Send announcement
            </QuickAction>
          </div>
        </Card>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof Building2;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        "gap-2",
      )}
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  );
}
