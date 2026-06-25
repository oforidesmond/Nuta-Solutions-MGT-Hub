"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AuditFiltersBar,
  EMPTY_AUDIT_FILTERS,
  type AuditFilterState,
} from "@/components/audit/audit-filters-bar";
import { ExportButton } from "@/components/exports/export-button";
import { fetchAuditEventsPage } from "@/lib/api/audit";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { buildExportFilename } from "@/lib/exports/filename";
import { fetchAllWithCursor } from "@/lib/exports/fetch-paginated";
import { auditEventToRow } from "@/lib/exports/row-mappers";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import {
  auditEventProductId,
  auditEventTypeLabel,
  type AuditEventRow,
} from "@/lib/types/audit";
import { safeJsonPretty } from "@/lib/audit-display";
import { useAuthStore } from "@/stores/auth-store";

function formatWhen(row: AuditEventRow): string {
  const raw = row.occurredAt ?? row.createdAt;
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatActor(row: AuditEventRow): string {
  if (row.actor?.name) return row.actor.name;
  if (row.userId) return row.userId.slice(0, 8) + "…";
  return "—";
}

function toIsoStart(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T00:00:00`).toISOString();
}

function toIsoEnd(date: string): string | undefined {
  if (!date) return undefined;
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export default function AuditPage() {
  const activeBranchId = useActiveBranchId();
  const orgName = useAuthStore((s) => s.organization?.name) ?? "org";
  const [filters, setFilters] = useState<AuditFilterState>(EMPTY_AUDIT_FILTERS);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const activeCursor = cursorHistory[cursorHistory.length - 1];

  const queryParams = useMemo(
    () => ({
      cursor: activeCursor,
      limit: 30,
      productId: filters.productId,
      userId: filters.userId,
      branchId: filters.branchId || undefined,
      eventType: filters.eventType.length > 0 ? filters.eventType : undefined,
      aggregateType: filters.aggregateType,
      startDate: toIsoStart(filters.startDate),
      endDate: toIsoEnd(filters.endDate),
    }),
    [activeCursor, filters],
  );

  useEffect(() => {
    setCursorHistory([undefined]);
  }, [activeBranchId, filters]);

  const query = useQuery({
    queryKey: withBranchKey(activeBranchId, "audit", "events", queryParams),
    queryFn: () => fetchAuditEventsPage(queryParams),
    placeholderData: keepPreviousData,
  });

  const items = query.data?.items ?? [];
  const next = query.data?.nextCursor;

  const onNext = () => {
    if (!next) return;
    setCursorHistory((h) => [...h, next]);
  };

  const onPrev = () => {
    setCursorHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };

  const clearFilters = () => {
    setFilters(EMPTY_AUDIT_FILTERS);
    setCursorHistory([undefined]);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity log</h1>
        <p className="text-sm text-muted-foreground">
          Review actions across your business. Filter by product, staff, or event type.
        </p>
      </div>

      <AuditFiltersBar filters={filters} onChange={setFilters} onClear={clearFilters} />

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-medium">Events</CardTitle>
          <div className="flex flex-wrap gap-2">
            <ExportButton
              filename={buildExportFilename({
                orgName,
                reportType: "activity-log",
                from: filters.startDate || undefined,
                to: filters.endDate || undefined,
              })}
              columns={[
                { key: "occurredAt", header: "When" },
                { key: "eventType", header: "Event" },
                { key: "actor", header: "Actor" },
                { key: "branch", header: "Branch" },
                { key: "aggregateType", header: "Entity type" },
                { key: "aggregateId", header: "Entity id" },
                { key: "productId", header: "Product id" },
                { key: "payload", header: "Details" },
              ]}
              getRows={async () => {
                const exportParams = {
                  limit: 50,
                  productId: filters.productId,
                  userId: filters.userId,
                  branchId: filters.branchId || undefined,
                  eventType: filters.eventType.length > 0 ? filters.eventType : undefined,
                  aggregateType: filters.aggregateType,
                  startDate: toIsoStart(filters.startDate),
                  endDate: toIsoEnd(filters.endDate),
                };
                const { rows, truncated } = await fetchAllWithCursor({
                  fetchPage: async (cursor) => {
                    const page = await fetchAuditEventsPage({ ...exportParams, cursor });
                    return { items: page.items, nextCursor: page.nextCursor };
                  },
                });
                return {
                  rows: rows.map(auditEventToRow),
                  truncated,
                };
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cursorHistory.length <= 1}
              onClick={onPrev}
            >
              Previous page
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!next} onClick={onNext}>
              Next page
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <p className="text-sm text-destructive">Could not load audit events.</p>
          ) : query.isPending ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit events match these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row, idx) => {
                  const productId = auditEventProductId(row);
                  const payload = row.payload;
                  const payloadText = payload ? safeJsonPretty(payload) : null;
                  return (
                    <TableRow key={row.id ?? idx}>
                      <TableCell className="whitespace-nowrap text-sm">{formatWhen(row)}</TableCell>
                      <TableCell className="text-sm">
                        {auditEventTypeLabel(row.eventType)}
                      </TableCell>
                      <TableCell className="text-sm">{formatActor(row)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.branchName ?? row.branchId?.slice(0, 8) ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[14rem]">
                        {productId ? (
                          <Link
                            href={`/products/${productId}`}
                            className="text-sm text-primary underline-offset-2 hover:underline"
                          >
                            View product
                          </Link>
                        ) : payloadText ? (
                          <TooltipProvider>
                            <UiTooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="interactive-cursor max-w-full truncate text-left text-sm"
                                >
                                  {payloadText.slice(0, 48)}
                                  {payloadText.length > 48 ? "…" : ""}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <pre className="max-h-64 max-w-md overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                                  {payloadText}
                                </pre>
                              </TooltipContent>
                            </UiTooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
