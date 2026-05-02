"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Smartphone } from "lucide-react";
import { fetchPlatformDevicesPage } from "@/lib/api/platform/devices";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeviceStatus } from "@/lib/types/platform";

const STATUS_CLASS: Record<DeviceStatus, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SUSPENDED: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  REVOKED: "bg-destructive/10 text-destructive",
};

const STATUS_LABEL: Record<DeviceStatus, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
};

export default function OrganizationDevicesPage() {
  const params = useParams<{ id: string }>();
  const organizationId = typeof params?.id === "string" ? params.id : "";
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useQuery({
    queryKey: ["platform", "devices", { organizationId, page, limit }],
    queryFn: () => fetchPlatformDevicesPage({ organizationId, page, limit }),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) return <Skeleton className="h-72 rounded-xl" />;
  if (query.isError) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {handleApiError(query.error)}
        </p>
      </Card>
    );
  }

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Smartphone className="size-10" aria-hidden />}
        title="No devices for this organization"
        description="Devices register when staff sign in on a mobile device."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="px-4">Device</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Last seen</TableHead>
              <TableHead>Registered</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => {
              const ownerName = d.user
                ? [d.user.firstName, d.user.lastName].filter(Boolean).join(" ").trim() ||
                  d.user.email ||
                  "—"
                : "—";
              return (
                <TableRow key={d.id}>
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/platform/devices/${d.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {d.deviceName ?? d.deviceModel ?? d.deviceUuid.slice(0, 8)}
                    </Link>
                    <p className="font-mono text-[0.7rem] text-muted-foreground">
                      {d.deviceUuid}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("border-transparent", STATUS_CLASS[d.status])}
                    >
                      {STATUS_LABEL[d.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ownerName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.lastSeenAt ? formatDate(d.lastSeenAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {d.registeredAt ? formatDate(d.registeredAt) : formatDate(d.createdAt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {meta ? (
        <PaginationBar
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
