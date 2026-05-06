"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Link2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { fetchInventoryAdjustmentsPage } from "@/lib/api/inventory-logs";
import { fetchOrgUsers } from "@/lib/api/users";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";
import type { HubStockAdjustment } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type AdjustmentDisplayItem =
  | { kind: "single"; row: HubStockAdjustment }
  | { kind: "pair"; a: HubStockAdjustment; b: HubStockAdjustment };

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function userLabel(row: HubStockAdjustment): string {
  const u = row.user;
  if (!u) return "—";
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
  return name || u.email || "—";
}

function productLabel(row: HubStockAdjustment): string {
  return row.product?.name ?? "—";
}

function qtyChangeNum(row: HubStockAdjustment): number {
  return Number(row.quantityChange ?? 0);
}

function buildDisplayRows(rows: HubStockAdjustment[]): AdjustmentDisplayItem[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const used = new Set<string>();
  const out: AdjustmentDisplayItem[] = [];
  for (const row of rows) {
    if (used.has(row.id)) continue;
    const lid = row.linkedAdjustmentId;
    if (lid) {
      const partner = byId.get(lid);
      if (partner && partner.linkedAdjustmentId === row.id) {
        used.add(row.id);
        used.add(partner.id);
        const [a, b] = row.id.localeCompare(partner.id) < 0 ? [row, partner] : [partner, row];
        out.push({ kind: "pair", a, b });
        continue;
      }
    }
    used.add(row.id);
    out.push({ kind: "single", row });
  }
  return out;
}

export default function InventoryAdjustmentsPage() {
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [staffId, setStaffId] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | "BULK_TO_SINGLES">("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [openPairId, setOpenPairId] = useState<string | null>(null);

  const range = useMemo(
    () => rangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const params = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      page,
      limit,
      staffId: staffId || undefined,
      type: typeFilter || undefined,
    }),
    [range.startDate, range.endDate, page, limit, staffId, typeFilter],
  );

  const listQuery = useQuery({
    queryKey: ["inventory", "adjustments", params],
    queryFn: () => fetchInventoryAdjustmentsPage(params),
    placeholderData: (prev) => prev,
  });

  const usersQuery = useQuery({
    queryKey: ["org", "users"],
    queryFn: fetchOrgUsers,
    staleTime: 120_000,
  });

  const displayRows = useMemo(() => {
    const rows = listQuery.data?.data ?? [];
    return buildDisplayRows(rows);
  }, [listQuery.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock adjustments</h1>
        <p className="text-sm text-muted-foreground">History from GET /inventory/adjustments.</p>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <DateRangePresetToolbar
            preset={preset}
            onPresetChange={(p) => {
              setPreset(p);
              setPage(1);
            }}
            customStart={customStart}
            customEnd={customEnd}
            onCustomStartChange={(v) => {
              setCustomStart(v);
              setPage(1);
            }}
            onCustomEndChange={(v) => {
              setCustomEnd(v);
              setPage(1);
            }}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="max-w-md space-y-1.5">
              <Label htmlFor="adj-staff">Staff</Label>
              <select
                id="adj-staff"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All staff</option>
                {(usersQuery.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="max-w-md space-y-1.5">
              <Label htmlFor="adj-type">Adjustment type</Label>
              <select
                id="adj-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as "" | "BULK_TO_SINGLES");
                  setPage(1);
                  setOpenPairId(null);
                }}
              >
                <option value="">All types</option>
                <option value="BULK_TO_SINGLES">Bulk conversions (BULK_TO_SINGLES)</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {listQuery.isError ? (
            <p className="text-sm text-destructive">Could not load adjustments.</p>
          ) : listQuery.isPending && !listQuery.data ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (listQuery.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No adjustments in this range.</p>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty change</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Linked</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayRows.map((item) => {
                    if (item.kind === "single") {
                      const row = item.row;
                      const q = qtyChangeNum(row);
                      return (
                        <TableRow key={row.id}>
                          <TableCell />
                          <TableCell className="whitespace-nowrap text-sm">{formatWhen(row.createdAt)}</TableCell>
                          <TableCell className="max-w-[10rem] truncate text-sm">
                            {row.type?.replace(/_/g, " ") ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[12rem]">
                            <span className="truncate font-medium">{productLabel(row)}</span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right text-sm font-medium tabular-nums",
                              q > 0 && "text-emerald-700 dark:text-emerald-400",
                              q < 0 && "text-destructive",
                            )}
                          >
                            {q > 0 ? "+" : ""}
                            {row.quantityChange ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground">
                            {row.notes?.trim() || "—"}
                          </TableCell>
                          <TableCell className="max-w-[10rem] truncate text-sm">{userLabel(row)}</TableCell>
                          <TableCell className="text-sm">
                            {row.linkedAdjustment ? (
                              <UiTooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-default items-center gap-1 text-muted-foreground">
                                    <Link2 className="size-3.5 shrink-0" aria-hidden />
                                    <span className="truncate">{row.linkedAdjustment.product?.name ?? "Linked"}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs">
                                    Paired leg: {row.linkedAdjustment.quantityChange ?? "—"} on{" "}
                                    {row.linkedAdjustment.product?.name ?? "product"}
                                  </p>
                                </TooltipContent>
                              </UiTooltip>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const { a, b } = item;
                    const pairKey = a.id;
                    const open = openPairId === pairKey;
                    const when = formatWhen(a.createdAt ?? b.createdAt);
                    const typeLabel = a.type?.replace(/_/g, " ") ?? b.type?.replace(/_/g, " ") ?? "Conversion";

                    return (
                      <Fragment key={pairKey}>
                        <TableRow
                          className="cursor-pointer bg-muted/30 hover:bg-muted/50"
                          onClick={() => setOpenPairId(open ? null : pairKey)}
                        >
                          <TableCell className="w-10 align-middle">
                            {open ? (
                              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">{when}</TableCell>
                          <TableCell className="max-w-[11rem]">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="truncate text-sm font-medium">{typeLabel}</span>
                              <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                                <Link2 className="mr-1 size-3" aria-hidden />
                                Pair
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[14rem] text-sm text-muted-foreground">
                            <span className="line-clamp-2">
                              {productLabel(a)} ↔ {productLabel(b)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            <span className="sr-only">Expand to see both legs</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-sm text-muted-foreground">—</TableCell>
                          <TableCell className="text-sm text-muted-foreground">—</TableCell>
                        </TableRow>
                        {open ? (
                          <>
                            <TableRow className="bg-muted/15">
                              <TableCell />
                              <TableCell className="text-xs text-muted-foreground"> </TableCell>
                              <TableCell className="pl-6 text-xs font-medium text-muted-foreground">Leg 1</TableCell>
                              <TableCell className="text-sm font-medium">{productLabel(a)}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-right text-sm font-medium tabular-nums",
                                  qtyChangeNum(a) > 0 && "text-emerald-700 dark:text-emerald-400",
                                  qtyChangeNum(a) < 0 && "text-destructive",
                                )}
                              >
                                {qtyChangeNum(a) > 0 ? "+" : ""}
                                {a.quantityChange ?? "—"}
                              </TableCell>
                              <TableCell className="max-w-[14rem] truncate text-sm">{a.notes?.trim() || "—"}</TableCell>
                              <TableCell className="max-w-[10rem] truncate text-sm">{userLabel(a)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">—</TableCell>
                            </TableRow>
                            <TableRow className="bg-muted/15">
                              <TableCell />
                              <TableCell className="text-xs text-muted-foreground"> </TableCell>
                              <TableCell className="pl-6 text-xs font-medium text-muted-foreground">Leg 2</TableCell>
                              <TableCell className="text-sm font-medium">{productLabel(b)}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-right text-sm font-medium tabular-nums",
                                  qtyChangeNum(b) > 0 && "text-emerald-700 dark:text-emerald-400",
                                  qtyChangeNum(b) < 0 && "text-destructive",
                                )}
                              >
                                {qtyChangeNum(b) > 0 ? "+" : ""}
                                {b.quantityChange ?? "—"}
                              </TableCell>
                              <TableCell className="max-w-[14rem] truncate text-sm">{b.notes?.trim() || "—"}</TableCell>
                              <TableCell className="max-w-[10rem] truncate text-sm">{userLabel(b)}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">—</TableCell>
                            </TableRow>
                          </>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
          {listQuery.isFetching && listQuery.data ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Refreshing…
            </p>
          ) : null}
          {listQuery.data ? (
            <PaginationBar
              page={listQuery.data.page}
              totalPages={listQuery.data.totalPages}
              total={listQuery.data.total}
              limit={listQuery.data.limit}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
