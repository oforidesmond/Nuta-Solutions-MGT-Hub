"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Bell, Inbox, RotateCw } from "lucide-react";
import { fetchSentNotificationsPage } from "@/lib/api/notifications";
import { fetchOrgUsers } from "@/lib/api/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { SendStaffNotificationModal } from "@/components/notifications/send-staff-notification-modal";
import { SentNotificationReadBadge } from "@/components/notifications/sent-notification-read-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { canSendStaffNotifications } from "@/lib/notifications/can-send-staff-notifications";
import { useAuthStore } from "@/stores/auth-store";
import {
  HUB_MANUAL_NOTIFICATION_TYPE_OPTIONS,
  type HubManualNotificationType,
  type SentNotification,
} from "@/lib/types/phase2";
import type { HubUser } from "@/lib/types/domain";

type ReadFilter = "all" | "read" | "unread";

const TYPE_OPTIONS: MultiSelectOption<HubManualNotificationType>[] =
  HUB_MANUAL_NOTIFICATION_TYPE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

const DEFAULT_LIMIT = 25;
const STAFF_ROLES = new Set(["STAFF", "SALES_AGENT"]);

function recipientLabel(n: SentNotification): string {
  const r = n.recipient;
  if (r) {
    const name = [r.firstName, r.lastName].filter(Boolean).join(" ").trim();
    if (name) return name;
    return r.email ?? r.id;
  }
  return n.userId ? n.userId.slice(0, 8) + "…" : "Recipient";
}

function displayType(n: SentNotification): string {
  if (n.type === "OTHER" && n.metadata?.originalType && typeof n.metadata.originalType === "string") {
    return n.metadata.originalType;
  }
  return n.type;
}

export default function SentNotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const allowed = canSendStaffNotifications(user?.role);
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [types, setTypes] = useState<HubManualNotificationType[]>([]);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [recipientUserId, setRecipientUserId] = useState<string | undefined>(undefined);

  const isRead: boolean | undefined =
    readFilter === "read" ? true : readFilter === "unread" ? false : undefined;

  const filters = {
    page,
    limit: DEFAULT_LIMIT,
    type: types.length ? types : undefined,
    isRead,
    userId: recipientUserId,
  };

  const query = useQuery({
    queryKey: ["notifications", "sent", filters],
    queryFn: () => fetchSentNotificationsPage(filters),
    enabled: allowed,
    placeholderData: keepPreviousData,
  });

  const staffQuery = useQuery({
    queryKey: ["org", "users", "notification-filter"],
    queryFn: fetchOrgUsers,
    enabled: allowed,
    staleTime: 60_000,
  });

  const staffRecipients = useMemo(() => {
    return (staffQuery.data ?? []).filter((u: HubUser) => STAFF_ROLES.has(String(u.role)));
  }, [staffQuery.data]);

  const rows = query.data?.items ?? [];
  const meta = query.data?.meta;

  if (!allowed) {
    return (
      <EmptyState
        icon={<Bell className="size-10" />}
        title="Not available"
        description="Only business owners and managers can view sent staff notifications."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Staff notifications</h1>
          <p className="text-sm text-muted-foreground">
            Messages you sent to staff · when they read them, you'll know.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" render={<Link href="/notifications/inbox" />}>
            <Inbox className="mr-2 size-4" aria-hidden />
            Inbox
          </Button>
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            New notification
          </Button>
        </div>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Recipient</span>
            <select
              value={recipientUserId ?? ""}
              onChange={(e) => {
                setRecipientUserId(e.target.value || undefined);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm lg:min-w-[14rem] interactive-cursor"
            >
              <option value="">All recipients</option>
              {staffRecipients.map((u) => {
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
                const label = name || u.email || u.id;
                return (
                  <option key={u.id} value={u.id}>
                    {label} ({u.role})
                  </option>
                );
              })}
            </select>
          </div>
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
        <MultiSelectDropdown<HubManualNotificationType>
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
          title="No sent notifications"
          description="Send a message to staff or broaden your filters."
          action={{ label: "New notification", onClick: () => setCreateOpen(true) }}
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
                    {displayType(n)}
                  </Badge>
                  <span className="font-medium text-foreground">{n.title}</span>
                  <SentNotificationReadBadge notification={n} />
                </div>
                <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{n.message}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span>
                  To:{" "}
                  {n.userId ? (
                    <Link
                      href={`/staff/${n.userId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {recipientLabel(n)}
                    </Link>
                  ) : (
                    recipientLabel(n)
                  )}
                </span>
                {n.readAt ? <span>Read at {formatDate(n.readAt)}</span> : null}
                <span className="font-mono">{n.id}</span>
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

      <SendStaffNotificationModal open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
