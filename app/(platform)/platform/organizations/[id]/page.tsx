"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Clock,
  DollarSign,
  Package,
  Smartphone,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { fetchOrganizationDetails } from "@/lib/api/platform/organizations";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { StatCard } from "@/components/platform/stat-card";
import { PlanBadge } from "@/components/platform/plan-badge";
import { StatusBadge } from "@/components/platform/status-badge";
import { formatCurrency, formatDate } from "@/lib/format";
import type { PlatformOrgPlanSummary, PlatformOrgStats } from "@/lib/types/platform";

function toNumber(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diffMs = Date.now() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export default function OrganizationOverviewPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const query = useQuery({
    queryKey: ["platform", "organizations", id],
    queryFn: () => fetchOrganizationDetails(id),
    enabled: Boolean(id),
  });

  if (query.isPending || !query.data) {
    return <OverviewSkeleton />;
  }
  if (query.isError) {
    return null;
  }

  const { organization: org, stats, plan } = query.data;

  return (
    <div className="space-y-6">
      <section
        aria-label="Organization summary"
        className="grid gap-4 md:grid-cols-3"
      >
        <InfoCard title="Organization">
          <InfoRow label="Business type" value={org.businessType ?? undefined} />
          <InfoRow label="Location" value={org.businessLocation ?? undefined} />
          <InfoRow label="Email" value={org.email ?? undefined} />
          <InfoRow label="Phone" value={org.phone ?? undefined} />
          <InfoRow label="Currency" value={org.currency ?? undefined} />
        </InfoCard>

        <InfoCard title="Plan & billing">
          <InfoRow label="Plan type" value={<PlanBadge plan={plan.type} />} />
          <InfoRow label="Status" value={<StatusBadge status={plan.status} />} />
          <InfoRow
            label="Sales count"
            value={
              <span className="tabular-nums">
                {plan.salesCount.toLocaleString()}
                {plan.salesLimit ? (
                  <span className="text-muted-foreground">
                    {" / "}
                    {plan.salesLimit.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-muted-foreground"> (unlimited)</span>
                )}
              </span>
            }
          />
          <InfoRow label="Trial start" value={plan.trialStartDate ? formatDate(plan.trialStartDate) : undefined} />
          <InfoRow label="Trial end" value={plan.trialEndDate ? formatDate(plan.trialEndDate) : undefined} />
          {plan.daysRemaining != null ? (
            <InfoRow
              label="Days remaining"
              value={`${plan.daysRemaining}`}
              highlight={plan.daysRemaining < 7}
            />
          ) : null}
        </InfoCard>

        <InfoCard title="Settings">
          <InfoRow label="Tax enabled" value={org.taxEnabled ? "Yes" : "No"} />
          <InfoRow label="Default tax rate" value={`${toNumber(org.defaultTaxRate)}%`} />
          <InfoRow
            label="Max staff discount"
            value={
              org.maxStaffDiscountPercent != null
                ? `${toNumber(org.maxStaffDiscountPercent)}%`
                : "None"
            }
          />
          <InfoRow
            label="Expiry alerts"
            value={org.expiryAlertEnabled ? "Enabled" : "Disabled"}
          />
          <InfoRow
            label="Expiry reminder months"
            value={org.expiryReminderMonths != null ? `${org.expiryReminderMonths}` : undefined}
          />
        </InfoCard>
      </section>

      <StatsGrid stats={stats} plan={plan} currency={org.currency ?? undefined} />
    </div>
  );
}

function StatsGrid({
  stats,
  currency,
}: {
  stats: PlatformOrgStats;
  plan: PlatformOrgPlanSummary;
  currency?: string;
}) {
  return (
    <section
      aria-label="Headline stats"
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      <StatCard
        label="Total users"
        value={stats.totalUsers.toLocaleString()}
        subtitle={`${stats.activeUsers.toLocaleString()} active`}
        icon={Users}
      />
      <StatCard label="Products" value={stats.totalProducts.toLocaleString()} icon={Package} />
      <StatCard
        label="Total sales"
        value={stats.totalSales.toLocaleString()}
        subtitle={`${stats.activeSales.toLocaleString()} in last 30 days`}
        icon={TrendingUp}
      />
      <StatCard
        label="Total revenue"
        value={formatCurrency(toNumber(stats.totalRevenue), currency ?? "GHS")}
        icon={DollarSign}
      />
      <StatCard label="Active devices" value={stats.activeDevices.toLocaleString()} icon={Smartphone} />
      <StatCard
        label="Suspended devices"
        value={stats.suspendedDevices.toLocaleString()}
        warning={stats.suspendedDevices > 0}
        icon={AlertCircle}
      />
      <StatCard label="Revoked devices" value={stats.revokedDevices.toLocaleString()} icon={XCircle} />
      <StatCard
        label="Last activity"
        value={formatRelative(stats.lastActivity)}
        icon={Clock}
      />
    </section>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
