"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Database,
  RotateCw,
  Smartphone,
  TrendingUp,
} from "lucide-react";
import { fetchPlatformDeviceDetails } from "@/lib/api/platform/devices";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { StatCard } from "@/components/platform/stat-card";
import { DeviceActionsMenu } from "@/components/platform/devices/device-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import type { DeviceStatus } from "@/lib/types/platform";

const STATUS_LABEL: Record<DeviceStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
};

export default function PlatformDeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const query = useQuery({
    queryKey: ["platform", "devices", id],
    queryFn: () => fetchPlatformDeviceDetails(id),
    enabled: Boolean(id),
  });

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-md" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Could not load device
          </h2>
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" />
            Try again
          </Button>
          <Link href="/platform/devices" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to devices
          </Link>
        </div>
      </Card>
    );
  }

  const { device, activity: rawActivity } = query.data;
  const activity = {
    salesCount: Number(rawActivity?.salesCount ?? 0),
    backupsCount: Number(rawActivity?.backupsCount ?? 0),
    crashesCount: Number(rawActivity?.crashesCount ?? 0),
    recentSales: rawActivity?.recentSales ?? [],
  };
  const title = device.deviceName ?? device.deviceModel ?? device.deviceUuid.slice(0, 12);
  const ownerName = device.user
    ? [device.user.firstName, device.user.lastName].filter(Boolean).join(" ").trim() ||
      device.user.email ||
      "—"
    : "—";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/platform/devices"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Devices
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">{title}</h1>
              <Badge variant="outline">{STATUS_LABEL[device.status]}</Badge>
            </div>
            <p className="font-mono text-xs text-muted-foreground">{device.deviceUuid}</p>
            <p className="text-sm text-muted-foreground">
              Registered {device.registeredAt ? formatDate(device.registeredAt) : "—"}
              {device.lastSeenAt ? ` · Last seen ${formatDate(device.lastSeenAt)}` : ""}
            </p>
          </div>
          <DeviceActionsMenu device={device} variant="header" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Sales" value={activity.salesCount.toLocaleString()} icon={TrendingUp} />
        <StatCard label="Backups" value={activity.backupsCount.toLocaleString()} icon={Database} />
        <StatCard
          label="Crashes"
          value={activity.crashesCount.toLocaleString()}
          icon={Smartphone}
          warning={activity.crashesCount > 0}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="Device">
          <InfoRow label="Model" value={device.deviceModel ?? "—"} />
          <InfoRow label="OS" value={device.deviceOs ?? "—"} />
          <InfoRow label="Fingerprint" value={device.fingerprintHash ?? "—"} mono />
          {device.revokedAt ? (
            <InfoRow label="Revoked" value={formatDate(device.revokedAt)} highlight />
          ) : null}
          {device.revokedReason ? (
            <InfoRow label="Revoke reason" value={device.revokedReason} />
          ) : null}
        </InfoCard>

        <InfoCard title="Assignment">
          <InfoRow
            label="Organization"
            value={
              device.organization ? (
                <Link
                  href={`/platform/organizations/${device.organization.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {device.organization.name}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <InfoRow
            label="Owner"
            value={
              device.userId ? (
                <Link
                  href={`/platform/users/${device.userId}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {ownerName}
                </Link>
              ) : (
                ownerName
              )
            }
          />
        </InfoCard>
      </div>

      <Card className="gap-3 p-4">
        <h2 className="font-heading text-sm font-semibold text-foreground">Recent sales</h2>
        {activity.recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent sales for this device.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="px-3">Receipt</TableHead>
                  <TableHead className="px-3">Amount</TableHead>
                  <TableHead className="px-3">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-3 font-mono text-xs">{s.receiptNumber ?? "—"}</TableCell>
                    <TableCell className="px-3 text-sm">
                      {formatCurrency(Number(s.totalAmount || 0))}
                    </TableCell>
                    <TableCell className="px-3 text-xs text-muted-foreground">
                      {s.soldAt ? formatDate(s.soldAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
