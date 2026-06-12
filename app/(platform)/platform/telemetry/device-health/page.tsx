"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { fetchDeviceHealth } from "@/lib/api/platform/telemetry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import { handleApiError } from "@/lib/api/errors";

function formatApproxAge(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "-";
  const h = ms / (60 * 60 * 1000);
  if (h < 48) return `${h.toFixed(1)} hours`;
  return `${(h / 24).toFixed(1)} days`;
}

export default function DeviceHealthPage() {
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);

  const query = useQuery({
    queryKey: ["platform", "telemetry", "device-health", organizationId ?? "all"],
    queryFn: () => fetchDeviceHealth(organizationId),
  });

  const data = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Device health</h1>
        <p className="text-sm text-muted-foreground">
          Staff-device storage warnings, database errors, and backup coverage (optional tenant filter).
        </p>
      </div>

      <Card className="p-4">
        <OrgFilterPicker organizationId={organizationId} onOrganizationIdChange={setOrganizationId} />
      </Card>

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="h-48 animate-pulse bg-muted/40" />
          <Card className="h-48 animate-pulse bg-muted/40" />
          <Card className="h-48 animate-pulse bg-muted/40" />
        </div>
      ) : query.isError ? (
        <Card className="gap-3 p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" aria-hidden />
            Retry
          </Button>
        </Card>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard title="Storage">
            <InfoRow label="Warnings" value={data.storage.totalWarnings} />
            <InfoRow label="Critical" value={data.storage.criticalWarnings} highlight={data.storage.criticalWarnings > 0} />
            <InfoRow
              label="Below threshold devices"
              value={data.storage.devicesBelowThreshold}
            />
          </InfoCard>
          <InfoCard title="Database">
            <InfoRow label="Unhealthy devices" value={data.database.unhealthyDevices} />
            <InfoRow label="Recorded errors" value={data.database.totalErrors} highlight={data.database.totalErrors > 0} />
          </InfoCard>
          <InfoCard title="Backups">
            <InfoRow label="With backup" value={data.backups.devicesWithBackups} />
            <InfoRow
              label="Without backup"
              value={data.backups.devicesWithoutBackups}
              highlight={data.backups.devicesWithoutBackups > 0}
            />
            <InfoRow
              label="Avg backup age"
              value={formatApproxAge(data.backups.averageBackupAgeMs)}
            />
          </InfoCard>
        </div>
      ) : null}
    </div>
  );
}
