"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, FlaskConical, HeartPulse } from "lucide-react";
import { fetchDeviceHealth, fetchCrashReports } from "@/lib/api/platform/telemetry";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/platform/stat-card";
import { cn } from "@/lib/utils";
import type { CrashReportsSummary, DeviceHealthResponse } from "@/lib/types/platform";

export default function TelemetryHubPage() {
  const health = useQuery({
    queryKey: ["platform", "telemetry", "device-health", "global"],
    queryFn: () => fetchDeviceHealth(undefined),
    staleTime: 60_000,
  });

  const crashes = useQuery({
    queryKey: ["platform", "telemetry", "crashes-summary-24h"],
    queryFn: () =>
      fetchCrashReports({
        page: 1,
        limit: 1,
      }),
    staleTime: 30_000,
  });

  const sum = crashes.data?.summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Telemetry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mobile reliability signals: crashes, latency percentiles, and staff-device storage / backup posture.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CrashStatCard loading={crashes.isPending} summary={sum} variant="fatal" />
        <CrashStatCard loading={crashes.isPending} summary={sum} variant="total" />
        <HealthPeek loading={health.isPending} data={health.data} />
        <Card className="flex flex-col justify-center gap-2 p-4">
          <h2 className="font-heading text-sm font-semibold text-foreground">Drill downs</h2>
          <p className="text-xs text-muted-foreground">Explore detailed tables and timelines.</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <NavCard
          href="/platform/telemetry/crashes"
          icon={FlaskConical}
          title="Crash reports"
          description="Stacks, severity, impacted orgs/users."
        />
        <NavCard
          href="/platform/telemetry/performance"
          icon={Cpu}
          title="Performance"
          description="Latency percentiles and slow traces."
        />
        <NavCard
          href="/platform/telemetry/device-health"
          icon={HeartPulse}
          title="Device health"
          description="SQLite storage warnings, backups, DB errors."
        />
      </div>
    </div>
  );
}

function CrashStatCard({
  loading,
  summary,
  variant,
}: {
  loading: boolean;
  summary?: CrashReportsSummary;
  variant: "total" | "fatal";
}) {
  if (loading || !summary) {
    return <Card className="h-28 animate-pulse bg-muted/40 p-4" />;
  }
  const value = variant === "fatal" ? summary.fatalCrashes : summary.totalCrashes;
  const label = variant === "fatal" ? "Fatal crashes (current filter)" : "Total crashes";
  const warn = variant === "fatal" && summary.fatalCrashes > 0;
  return (
    <StatCard
      label={label}
      value={value.toLocaleString()}
      subtitle="Last query window preview"
      icon={Activity}
      warning={warn}
    />
  );
}

function HealthPeek({
  loading,
  data,
}: {
  loading: boolean;
  data?: DeviceHealthResponse;
}) {
  if (loading || !data) {
    return <Card className="h-28 animate-pulse bg-muted/40 p-4" />;
  }
  const n =
    data.storage.totalWarnings +
    data.database.totalErrors +
    data.backups.devicesWithoutBackups;
  return (
    <StatCard
      label="Health heuristic"
      value={n.toLocaleString()}
      subtitle="Warning + backup gaps (not deduped)"
      icon={HeartPulse}
      warning={n > 0}
    />
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Activity;
  title: string;
  description: string;
}) {
  return (
    <Card className="gap-3 p-5">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <div className="space-y-1">
        <h2 className="font-heading text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Link href={href} className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
        Open
      </Link>
    </Card>
  );
}
