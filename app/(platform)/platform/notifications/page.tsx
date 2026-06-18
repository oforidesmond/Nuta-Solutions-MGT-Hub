"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Bell, RotateCw } from "lucide-react";
import { fetchPlatformNotificationsPage } from "@/lib/api/platform/notifications";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { CreateNotificationModal } from "@/components/platform/notifications/broadcast-notification-modal";
import { PlatformNotificationReadBadge } from "@/components/platform/notifications/platform-notification-read-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import {
  PLATFORM_NOTIFICATION_TYPE_OPTIONS,
  type PlatformNotificationType,
} from "@/lib/types/platform";

type ReadFilter = "all" | "read" | "unread";

const TYPE_OPTIONS: MultiSelectOption<PlatformNotificationType>[] =
  PLATFORM_NOTIFICATION_TYPE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

const DEFAULT_LIMIT = 25;

export default function PlatformNotificationsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [types, setTypes] = useState<PlatformNotificationType[]>([]);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");

  const isRead: boolean | undefined =
    readFilter === "read" ? true : readFilter === "unread" ? false : undefined;

  const filters = {
    page,
    limit: DEFAULT_LIMIT,
    organizationId,
    type: types.length ? types : undefined,
    isRead,
  };

  const query = useQuery({
    queryKey: ["platform", "notifications", filters],
    queryFn: () => fetchPlatformNotificationsPage(filters),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Fan-out banners created on-tenant · broadcast rows show delivery status; tenants mark read in their hub inbox.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          New Notification
        </Button>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <OrgFilterPicker
            organizationId={organizationId}
            onOrganizationIdChange={(o) => {
              setOrganizationId(o);
              setPage(1);
            }}
          />
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Read state</span>
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value as ReadFilter);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm lg:w-40 interactive-cursor"
            >
              <option value="all">All</option>
              <option value="read">Read</option>
              <option value="unread">Unread</option>
            </select>
          </div>
        </div>
        <MultiSelectDropdown<PlatformNotificationType>
          label="Type"
          options={TYPE_OPTIONS}
          selected={types}
          onChange={(next) => {
            setTypes(next);
            setPage(1);
          }}
        />
      </Card>

      {query.isPending && !query.data ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : query.isError ? (
        <Card className="gap-3 p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" aria-hidden />
            Retry
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Bell className="size-10" />}
          title="Nothing in inbox"
          description="Broaden filters or send a notification."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-border/40 bg-card p-4 text-sm shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[0.65rem]">
                    {n.type}
                  </Badge>
                  <span className="font-medium text-foreground">{n.title}</span>
                  <PlatformNotificationReadBadge notification={n} />
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{n.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{n.id}</span>
                {n.organization ? (
                  <Link
                    href={`/platform/organizations/${n.organization.id}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Org: {n.organization.name}
                  </Link>
                ) : (
                  <span>Org-wide flag</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta ? (
        <PaginationBar
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
        />
      ) : null}

      <CreateNotificationModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
