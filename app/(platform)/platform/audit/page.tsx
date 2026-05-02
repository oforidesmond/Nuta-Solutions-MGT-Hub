"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { FileSearch, RotateCw } from "lucide-react";
import { fetchPlatformAuditEvents } from "@/lib/api/platform/audit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { AuditEventRow } from "@/components/platform/audit-event-row";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import { handleApiError } from "@/lib/api/errors";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

const AUDIT_EVENT_OPTIONS: MultiSelectOption<string>[] = [
  { value: "PLATFORM_ORG_CREATED", label: "Org created" },
  { value: "PLATFORM_ORG_SUSPENDED", label: "Org suspended" },
  { value: "PLATFORM_ORG_UNSUSPENDED", label: "Org unsuspended" },
  { value: "PLATFORM_ORG_DELETED", label: "Org deleted" },
  { value: "PLATFORM_ORG_PLAN_CHANGED", label: "Plan changed" },
  { value: "PLATFORM_DEVICE_REVOKED", label: "Device revoked" },
  { value: "PLATFORM_DEVICE_SUSPENDED", label: "Device suspended" },
  { value: "PLATFORM_DEVICE_UNSUSPENDED", label: "Device unsuspended" },
  { value: "PLATFORM_USER_DEACTIVATED", label: "User deactivated" },
  { value: "PLATFORM_USER_PASSWORD_RESET", label: "Password reset" },
  { value: "PLATFORM_NOTIFICATION_BROADCAST", label: "Notification broadcast" },
  { value: "PLAN_UPGRADED", label: "Plan upgraded (tenant)" },
  { value: "PLAN_DOWNGRADED", label: "Plan downgraded (tenant)" },
];

const DEFAULT_LIMIT = 30;

export default function PlatformAuditPage() {
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [actorUserId, setActorUserId] = useState("");
  const [aggregateType, setAggregateType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function setFilter<T>(setter: (next: T) => void) {
    return (next: T) => {
      setter(next);
      setPage(1);
    };
  }

  const filters = {
    page,
    limit: DEFAULT_LIMIT,
    eventType: eventType.length > 0 ? eventType : undefined,
    organizationId,
    userId: actorUserId.trim() || undefined,
    aggregateType: aggregateType.trim() || undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  };

  const query = useQuery({
    queryKey: ["platform", "audit", filters],
    queryFn: () => fetchPlatformAuditEvents(filters),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  function clearDates() {
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Audit log</h1>
        <p className="text-sm text-muted-foreground">
          Cross-organization EventLog stream with actors and payloads (pagination server-side).
        </p>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <MultiSelectDropdown<string>
            label="Event type"
            options={AUDIT_EVENT_OPTIONS}
            selected={eventType}
            onChange={setFilter(setEventType)}
          />
          <OrgFilterPicker organizationId={organizationId} onOrganizationIdChange={setFilter(setOrganizationId)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="audit-actor">Actor user ID</Label>
            <Input
              id="audit-actor"
              className="font-mono text-xs"
              placeholder="Optional UUID of performing user"
              value={actorUserId}
              onChange={(e) => {
                setActorUserId(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-aggregate">Aggregate type</Label>
            <Input
              id="audit-aggregate"
              placeholder="Optional e.g. Sale"
              value={aggregateType}
              onChange={(e) => {
                setAggregateType(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor="audit-start">Start</Label>
            <input
              id="audit-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="audit-end">End</Label>
            <input
              id="audit-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            {(startDate || endDate) && (
              <Button type="button" variant="outline" size="sm" onClick={clearDates}>
                Clear dates
              </Button>
            )}
          </div>
        </div>
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
          icon={<FileSearch className="size-10" />}
          title="No events"
          description="Broaden filters or adjust the timeframe."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((e) => (
            <AuditEventRow key={e.id} event={e} showOrganization />
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
    </div>
  );
}
