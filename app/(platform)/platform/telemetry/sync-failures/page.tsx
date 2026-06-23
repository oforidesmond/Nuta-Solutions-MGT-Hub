"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RefreshCwOff, RotateCw } from "lucide-react";
import { SyncFailureDetailSheet } from "@/components/platform/sync-failures/sync-failure-detail-sheet";
import { SyncFailuresTable } from "@/components/platform/sync-failures/sync-failures-table";
import { SyncFailureStatusBadge } from "@/components/platform/sync-failures/status-badge";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { handleApiError } from "@/lib/api/errors";
import { fetchPlatformSyncFailuresPage } from "@/lib/api/platform/sync-failures";
import { formatCurrency, formatDate, toNumericAmount } from "@/lib/format";
import type {
  PlatformSyncFailure,
  PlatformSyncFailureStatus,
} from "@/lib/types/platform";
import { DiscountErrorCode } from "@/lib/discount";
import { cn } from "@/lib/utils";
import {
  asJsonObject,
  readAmountFromJson,
  readStringFromJson,
  syncFailurePersonLabel,
} from "@/components/platform/sync-failures/presentation";

const DEFAULT_LIMIT = 20;

type StatusFilter = PlatformSyncFailureStatus | "ALL";
type EntityTypeFilter = "ALL" | "SALE";

export default function PlatformSyncFailuresPage() {
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("OPEN");
  const [entityType, setEntityType] = useState<EntityTypeFilter>("ALL");
  const [errorCode, setErrorCode] = useState("");
  const [debouncedErrorCode, setDebouncedErrorCode] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedFailureId, setSelectedFailureId] = useState<string | null>(null);
  const [selectedFailure, setSelectedFailure] = useState<PlatformSyncFailure | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = errorCode.trim();
      setDebouncedErrorCode(trimmed);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [errorCode]);

  const filters = organizationId
    ? {
        organizationId,
        status: statusFilter === "ALL" ? undefined : statusFilter,
        errorCode: debouncedErrorCode || undefined,
        entityType: entityType === "ALL" ? undefined : entityType,
        from: fromDate ? dayStartUtc(fromDate) : undefined,
        to: toDate ? dayEndUtc(toDate) : undefined,
        page,
        limit: DEFAULT_LIMIT,
      }
    : null;

  const query = useQuery({
    queryKey: ["platform", "sync-failures", "list", filters],
    queryFn: () => fetchPlatformSyncFailuresPage(filters as NonNullable<typeof filters>),
    enabled: Boolean(filters),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  function openDetail(failure: PlatformSyncFailure) {
    setSelectedFailure(failure);
    setSelectedFailureId(failure.id);
    setDetailOpen(true);
  }

  function clearFilters() {
    setStatusFilter("OPEN");
    setEntityType("ALL");
    setErrorCode("");
    setDebouncedErrorCode("");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Sync failures</h1>
        <p className="text-sm text-muted-foreground">
          Platform-admin DLQ controls for failed staff sale uploads.
        </p>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 xl:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <OrgFilterPicker
            organizationId={organizationId}
            onOrganizationIdChange={(next) => {
              setOrganizationId(next);
              setPage(1);
            }}
          />
          <div className="space-y-1">
            <Label htmlFor="sync-failure-status">Status</Label>
            <select
              id="sync-failure-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as StatusFilter);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            >
              <option value="OPEN">Open only</option>
              <option value="RESOLVED_RETRY">Resolved for retry</option>
              <option value="ARCHIVED">Archived</option>
              <option value="APPLIED">Applied</option>
              <option value="ALL">All statuses</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-failure-entity-type">Entity type</Label>
            <select
              id="sync-failure-entity-type"
              value={entityType}
              onChange={(event) => {
                setEntityType(event.target.value as EntityTypeFilter);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            >
              <option value="ALL">All</option>
              <option value="SALE">Sale</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-failure-from">From</Label>
            <input
              id="sync-failure-from"
              type="date"
              value={fromDate}
              onChange={(event) => {
                setFromDate(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sync-failure-to">To</Label>
            <input
              id="sync-failure-to"
              type="date"
              value={toDate}
              onChange={(event) => {
                setToDate(event.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1">
            <Label htmlFor="sync-failure-error-code">Error code</Label>
            <Input
              id="sync-failure-error-code"
              value={errorCode}
              onChange={(event) => setErrorCode(event.target.value)}
              placeholder="Search backend error code"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant={
                  debouncedErrorCode === DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT
                    ? "default"
                    : "outline"
                }
                onClick={() => {
                  setErrorCode(DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT);
                  setDebouncedErrorCode(DiscountErrorCode.DISCOUNT_EXCEEDS_LIMIT);
                  setPage(1);
                }}
              >
                Discount exceeds limit
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  debouncedErrorCode === DiscountErrorCode.DISCOUNT_NOT_ALLOWED
                    ? "default"
                    : "outline"
                }
                onClick={() => {
                  setErrorCode(DiscountErrorCode.DISCOUNT_NOT_ALLOWED);
                  setDebouncedErrorCode(DiscountErrorCode.DISCOUNT_NOT_ALLOWED);
                  setPage(1);
                }}
              >
                Discount not allowed
              </Button>
            </div>
          </div>
          <div className="flex items-end gap-2">
            <Button
              type="button"
              variant={statusFilter === "OPEN" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("OPEN");
                setPage(1);
              }}
            >
              Open only
            </Button>
            <Button
              type="button"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setStatusFilter("ALL");
                setPage(1);
              }}
            >
              All statuses
            </Button>
          </div>
          <div className="flex items-end justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {!organizationId ? (
        <EmptyState
          icon={<RefreshCwOff className="size-10" aria-hidden />}
          title="Choose an organization to inspect failures"
          description="The backend requires an organization filter for sync-failure queries, so select an organization first."
        />
      ) : query.isPending && !query.data ? (
        <ListSkeleton />
      ) : query.isError ? (
        <Card className="gap-3 p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Retry
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<RefreshCwOff className="size-10" aria-hidden />}
          title="No sync failures found"
          description="Adjust the filters or broaden the status range to inspect resolved items."
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {statusFilter === "OPEN"
                ? `${meta?.total?.toLocaleString() ?? 0} open failures in the current organization and filter window.`
                : `${meta?.total?.toLocaleString() ?? 0} failures matching the current filters.`}
            </p>
          </div>

          <SyncFailuresTable rows={rows} onSelect={openDetail} />

          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((failure) => (
              <button
                key={failure.id}
                type="button"
                onClick={() => openDetail(failure)}
                className={cn(
                  "interactive-cursor rounded-xl border border-border/40 bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/20",
                  failure.status === "OPEN" && "border-destructive/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <SyncFailureStatusBadge status={failure.status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(failure.createdAt)}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {failure.organization?.name ?? failure.organizationId}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {syncFailurePersonLabel(failure.staffUser ?? failure.user, failure.staffUserId)}
                </p>
                <p className="mt-2 font-mono text-xs text-destructive">
                  {failure.errorCode ?? "No error code"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {receiptNumber(failure) ?? "No receipt"} · {totalAmountLabel(failure)}
                </p>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                  {failure.entityId}
                </p>
              </button>
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

      <SyncFailureDetailSheet
        failureId={selectedFailureId}
        fallbackFailure={selectedFailure}
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) {
            setSelectedFailureId(null);
            setSelectedFailure(null);
          }
        }}
      />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 border-b border-border/40 p-3 last:border-0"
          >
            <Skeleton className="h-4 w-36 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="ml-auto h-4 w-24 rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function dayStartUtc(isoDay: string): string {
  return `${isoDay}T00:00:00.000Z`;
}

function dayEndUtc(isoDay: string): string {
  return `${isoDay}T23:59:59.999Z`;
}

function receiptNumber(failure: PlatformSyncFailure): string | null {
  const summary = failure.requestSummary ?? null;
  const payload = asJsonObject(failure.requestPayload);
  return (
    readStringFromJson(summary, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ]) ??
    readStringFromJson(payload, [
      "receiptNumber",
      "receiptNumberMobile",
      "receipt_number",
      "receipt_number_mobile",
    ])
  );
}

function totalAmountLabel(failure: PlatformSyncFailure): string {
  const summary = failure.requestSummary ?? null;
  const payload = asJsonObject(failure.requestPayload);
  const amount =
    readAmountFromJson(summary, ["totalAmount", "total_amount", "grandTotal", "total"]) ??
    readAmountFromJson(payload, ["totalAmount", "total_amount", "grandTotal", "total"]);

  if (amount == null) return "Total unavailable";
  return formatCurrency(toNumericAmount(amount), failure.organization?.currency ?? "GHS");
}
