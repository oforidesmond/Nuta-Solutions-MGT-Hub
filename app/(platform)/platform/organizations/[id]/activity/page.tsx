"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, RotateCw } from "lucide-react";
import { fetchOrganizationActivity } from "@/lib/api/platform/organizations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { AuditEventRow } from "@/components/platform/audit-event-row";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const PLATFORM_EVENT_OPTIONS: MultiSelectOption<string>[] = [
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
];

export default function OrganizationActivityPage() {
  const params = useParams<{ id: string }>();
  const organizationId = typeof params?.id === "string" ? params.id : "";

  const [page, setPage] = useState(1);
  const limit = 30;
  const [eventType, setEventType] = useState<string[]>([]);
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
    limit,
    eventType: eventType.length > 0 ? eventType : undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate).toISOString() : undefined,
  };

  const query = useQuery({
    queryKey: ["platform", "organizations", organizationId, "activity", filters],
    queryFn: () => fetchOrganizationActivity(organizationId, filters),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <div className="space-y-4">
      <Card className="gap-3 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <MultiSelectDropdown<string>
            label="Event type"
            options={PLATFORM_EVENT_OPTIONS}
            selected={eventType}
            onChange={setFilter(setEventType)}
          />
          <div className="space-y-1.5">
            <Label htmlFor="activity-start" className="text-xs">
              Start date
            </Label>
            <Input
              id="activity-start"
              type="date"
              value={startDate}
              onChange={(e) => setFilter(setStartDate)(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="activity-end" className="text-xs">
              End date
            </Label>
            <Input
              id="activity-end"
              type="date"
              value={endDate}
              onChange={(e) => setFilter(setEndDate)(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {query.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="gap-4 p-6">
          <p className="text-sm text-muted-foreground">
            {handleApiError(query.error)}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="self-start"
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Try again
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Activity className="size-10" aria-hidden />}
          title="No activity matches these filters"
          description="Adjust the filters or widen the date range to see more events."
        />
      ) : (
        <>
          <ul className="space-y-2">
            {rows.map((event) => (
              <AuditEventRow key={event.id} event={event} />
            ))}
          </ul>
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
