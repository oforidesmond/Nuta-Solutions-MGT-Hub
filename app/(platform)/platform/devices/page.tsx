"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCw, Smartphone } from "lucide-react";
import { fetchPlatformDevicesPage } from "@/lib/api/platform/devices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { DeviceFiltersBar } from "@/components/platform/devices/device-filters-bar";
import { DeviceActionsMenu } from "@/components/platform/devices/device-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformDevice, DeviceStatus } from "@/lib/types/platform";

const DEFAULT_LIMIT = 20;

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

export default function PlatformDevicesPage() {
  const searchParams = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<DeviceStatus[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>(
    () => searchParams.get("organizationId") ?? undefined,
  );
  const [userIdFilter, setUserIdFilter] = useState(
    () => searchParams.get("userId") ?? "",
  );

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== debouncedSearch) {
        setDebouncedSearch(trimmed);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  const userIdParam = userIdFilter.trim() || undefined;

  const params = {
    page,
    limit: DEFAULT_LIMIT,
    search: debouncedSearch || undefined,
    status: status.length > 0 ? status : undefined,
    organizationId,
    userId: userIdParam,
  };

  const query = useQuery({
    queryKey: ["platform", "devices", params],
    queryFn: () => fetchPlatformDevicesPage(params),
    placeholderData: keepPreviousData,
  });

  const meta = query.data?.meta;
  const rows = query.data?.data ?? [];

  function setFilterStatus(next: DeviceStatus[]) {
    setStatus(next);
    setPage(1);
  }

  function setFilterOrg(next: string | undefined) {
    setOrganizationId(next);
    setPage(1);
  }

  function setUserId(next: string) {
    setUserIdFilter(next);
    setPage(1);
  }

  function clearAll() {
    setSearch("");
    setDebouncedSearch("");
    setStatus([]);
    setOrganizationId(undefined);
    setUserIdFilter("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Devices</h1>
        <p className="text-sm text-muted-foreground">
          {meta
            ? `${meta.total.toLocaleString()} device${meta.total === 1 ? "" : "s"}`
            : "Loading…"}
        </p>
      </div>

      <DeviceFiltersBar
        search={search}
        onSearchChange={setSearch}
        status={status}
        onStatusChange={setFilterStatus}
        organizationId={organizationId}
        onOrganizationIdChange={setFilterOrg}
        userIdFilter={userIdFilter}
        onUserIdFilterChange={setUserId}
        onClearAll={clearAll}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <Card className="gap-4 p-6">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Could not load devices
            </h2>
            <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Try again
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Smartphone className="size-10" aria-hidden />}
          title="No devices found"
          description="Try different search terms or filters."
        />
      ) : (
        <>
          <DevicesTableDesktop rows={rows} />
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((d) => (
              <DeviceCardMobile key={d.id} device={d} />
            ))}
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
        </>
      )}
    </div>
  );
}

function deviceTitle(d: PlatformDevice): string {
  return d.deviceName ?? d.deviceModel ?? d.deviceUuid.slice(0, 8);
}

function DevicesTableDesktop({ rows }: { rows: PlatformDevice[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="px-4">Device</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Last seen</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((d) => {
            const owner = d.user
              ? [d.user.firstName, d.user.lastName].filter(Boolean).join(" ").trim() ||
                d.user.email ||
                "-"
              : "-";
            return (
              <TableRow key={d.id}>
                <TableCell className="px-4 py-3">
                  <Link
                    href={`/platform/devices/${d.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {deviceTitle(d)}
                  </Link>
                  <p className="font-mono text-[0.7rem] text-muted-foreground">{d.deviceUuid}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.organization ? (
                    <Link
                      href={`/platform/organizations/${d.organization.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {d.organization.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[d.status])}>
                    {STATUS_LABEL[d.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {d.userId ? (
                    <Link
                      href={`/platform/users/${d.userId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {owner}
                    </Link>
                  ) : (
                    owner
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {d.lastSeenAt ? formatDate(d.lastSeenAt) : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <DeviceActionsMenu device={d} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function DeviceCardMobile({ device }: { device: PlatformDevice }) {
  const owner = device.user
    ? [device.user.firstName, device.user.lastName].filter(Boolean).join(" ").trim() ||
      device.user.email ||
      "-"
    : "-";
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/platform/devices/${device.id}`}
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {deviceTitle(device)}
          </Link>
          <p className="font-mono text-[0.65rem] text-muted-foreground">{device.deviceUuid}</p>
          {device.organization ? (
            <Link
              href={`/platform/organizations/${device.organization.id}`}
              className="mt-1 block truncate text-xs text-primary underline-offset-4 hover:underline"
            >
              {device.organization.name}
            </Link>
          ) : null}
        </div>
        <DeviceActionsMenu device={device} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[device.status])}>
          {STATUS_LABEL[device.status]}
        </Badge>
        {device.userId ? (
          <Link
            href={`/platform/users/${device.userId}`}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            {owner}
          </Link>
        ) : (
          <span className="text-xs text-muted-foreground">{owner}</span>
        )}
        <span className="text-xs text-muted-foreground">
          Seen: {device.lastSeenAt ? formatDate(device.lastSeenAt) : "Never"}
        </span>
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="hidden h-72 w-full rounded-xl md:block" />
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
