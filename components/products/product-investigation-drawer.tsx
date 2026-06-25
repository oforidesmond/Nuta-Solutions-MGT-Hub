"use client";

import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { LifecycleEntryCard } from "@/components/products/lifecycle-entry-card";
import { ExportButton } from "@/components/exports/export-button";
import {
  MultiSelectDropdown,
  type MultiSelectOption,
} from "@/components/platform/multi-select-dropdown";
import { fetchProductLifecycleInvestigation } from "@/lib/api/product-lifecycle";
import { handleApiError } from "@/lib/api/errors";
import { buildExportFilename } from "@/lib/exports/filename";
import { fetchAllWithCursor } from "@/lib/exports/fetch-paginated";
import { lifecycleEntryToRow } from "@/lib/exports/row-mappers";
import { rangeFromPreset } from "@/lib/analytics-period";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { toYyyyMmDd } from "@/lib/date-range-presets";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { productLifecycleKeys } from "@/lib/query/product-lifecycle-keys";
import { fetchStaffList } from "@/lib/api/staff";
import { formatLedgerQuantityDelta } from "@/lib/types/product-lifecycle";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "sonner";

type Props = {
  productId: string;
  productName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const DEBOUNCE_MS = 400;

export function ProductInvestigationDrawer({
  productId,
  productName,
  open,
  onOpenChange,
}: Props) {
  const activeBranchId = useActiveBranchId();
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? "GHS";
  const orgName = organization?.name ?? "org";

  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [actorUserIds, setActorUserIds] = useState<string[]>([]);

  const [debouncedFilters, setDebouncedFilters] = useState({
    from: "",
    to: "",
    actorUserIds: [] as string[],
  });

  const range = useMemo(
    () => rangeFromPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setDebouncedFilters({
        from: range.startDate,
        to: range.endDate,
        actorUserIds,
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [open, range.startDate, range.endDate, actorUserIds]);

  const staffQuery = useQuery({
    queryKey: ["staff", "list", "investigation"],
    queryFn: fetchStaffList,
    enabled: open,
    staleTime: 120_000,
  });

  const staffOptions: MultiSelectOption<string>[] = useMemo(
    () =>
      (staffQuery.data ?? [])
        .filter((s) => s.isActive !== false)
        .map((s) => ({
          value: s.id,
          label: [s.firstName, s.lastName].filter(Boolean).join(" ").trim() || s.staffId || s.email,
        })),
    [staffQuery.data],
  );

  const investigationQuery = useInfiniteQuery({
    queryKey: productLifecycleKeys.investigation(productId, activeBranchId, debouncedFilters),
    queryFn: ({ pageParam }) =>
      fetchProductLifecycleInvestigation(productId, {
        from: debouncedFilters.from,
        to: debouncedFilters.to,
        actorUserIds:
          debouncedFilters.actorUserIds.length > 0
            ? debouncedFilters.actorUserIds
            : undefined,
        cursor: pageParam as string | undefined,
        limit: 50,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled:
      open &&
      !!productId &&
      Boolean(debouncedFilters.from && debouncedFilters.to),
    staleTime: 60_000,
  });

  const investigation = investigationQuery.data?.pages[0];
  const entries = investigationQuery.data?.pages.flatMap((p) => p.data) ?? [];
  const highlights = investigation?.highlights ?? [];
  const accountability = investigation?.accountability ?? [];
  const netChange = investigation?.netQuantityChange;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(92vh,40rem)] flex-col gap-0 rounded-t-2xl px-0 pb-0 sm:mx-auto sm:max-w-xl sm:side-right sm:max-h-full sm:rounded-none"
      >
        <div
          className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden"
          aria-hidden
        />

        <SheetHeader className="space-y-2 border-b border-border/40 px-4 pb-4 pt-2 text-left">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <SheetTitle>Something doesn&apos;t add up?</SheetTitle>
              <SheetDescription>
                {productName ? `${productName} · ` : ""}
                Review who was involved and what happened in the selected period.
              </SheetDescription>
            </div>
            <ExportButton
              filename={buildExportFilename({
                orgName,
                reportType: "product-investigation",
                from: debouncedFilters.from,
                to: debouncedFilters.to,
              })}
              disabled={!debouncedFilters.from || !debouncedFilters.to}
              columns={[
                { key: "section", header: "Section" },
                { key: "occurredAt", header: "When" },
                { key: "category", header: "Type" },
                { key: "summary", header: "Summary" },
                { key: "actor", header: "Staff" },
                { key: "quantityDelta", header: "Qty change" },
                { key: "loss", header: "Stock lost" },
              ]}
              getRows={async () => {
                const accountabilityRows = accountability.map((row) => ({
                  section: "Accountability",
                  occurredAt: "",
                  category: "",
                  summary: row.actorName ?? "",
                  actor: row.actorName ?? "",
                  quantityDelta: formatLedgerQuantityDelta(row.netQuantityChange),
                  loss: row.lossAmount ?? "",
                }));
                const { rows, truncated } = await fetchAllWithCursor({
                  fetchPage: async (cursor) => {
                    const page = await fetchProductLifecycleInvestigation(productId, {
                      from: debouncedFilters.from,
                      to: debouncedFilters.to,
                      actorUserIds:
                        debouncedFilters.actorUserIds.length > 0
                          ? debouncedFilters.actorUserIds
                          : undefined,
                      cursor,
                      limit: 50,
                    });
                    return { items: page.data, nextCursor: page.nextCursor };
                  },
                });
                return {
                  rows: [
                    ...accountabilityRows,
                    ...rows.map((entry) => ({
                      section: "Activity",
                      ...lifecycleEntryToRow(entry),
                    })),
                  ],
                  truncated,
                };
              }}
            />
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          <div className="space-y-6">
            <div className="space-y-3">
              <DateRangePresetToolbar
                preset={preset}
                onPresetChange={setPreset}
                customStart={customStart}
                customEnd={customEnd}
                onCustomStartChange={setCustomStart}
                onCustomEndChange={setCustomEnd}
              />
              <MultiSelectDropdown
                label="Staff involved"
                options={staffOptions}
                selected={actorUserIds}
                onChange={setActorUserIds}
                emptyLabel="All staff"
              />
            </div>

            {investigationQuery.isPending ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : investigationQuery.isError ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{handleApiError(investigationQuery.error)}</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void investigationQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {netChange != null ? (
                  <p className="text-sm text-muted-foreground">
                    Net stock change:{" "}
                    <span className="font-medium text-foreground">
                      {formatLedgerQuantityDelta(netChange)}
                    </span>
                  </p>
                ) : null}

                {highlights.length > 0 ? (
                  <section className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                      <AlertCircle className="size-4 shrink-0" aria-hidden />
                      Worth noting
                    </div>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </section>
                ) : null}

                {accountability.length > 0 ? (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Who was involved</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Staff</TableHead>
                          <TableHead className="text-right">Net stock change</TableHead>
                          <TableHead className="text-right">Stock lost</TableHead>
                          <TableHead className="text-right">Events</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accountability.map((row) => (
                          <TableRow key={row.actorUserId}>
                            <TableCell className="font-medium">{row.actorName}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatLedgerQuantityDelta(row.netQuantityChange)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.lossAmount != null
                                ? formatCurrency(toNumericAmount(row.lossAmount), currency)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.eventCount ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </section>
                ) : null}

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Activity in this period</h3>
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No matching activity for these filters.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {entries.map((entry) => (
                        <LifecycleEntryCard key={entry.id} entry={entry} currency={currency} />
                      ))}
                    </ul>
                  )}
                  {investigationQuery.hasNextPage ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full min-h-9"
                      disabled={investigationQuery.isFetchingNextPage}
                      onClick={() => {
                        void investigationQuery.fetchNextPage().catch((e) => {
                          toast.error(handleApiError(e));
                        });
                      }}
                    >
                      {investigationQuery.isFetchingNextPage ? "Loading…" : "Load more"}
                    </Button>
                  ) : null}
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
