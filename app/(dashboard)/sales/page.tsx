"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { SalesTable } from "@/components/sales/sales-table";
import { SalesTableSkeleton } from "@/components/sales/sales-table-skeleton";
import {
  downloadSalesExportBlob,
  fetchSalesPage,
  fetchSalesWithVariancesPage,
} from "@/lib/api/sales";
import { fetchOrgUsers } from "@/lib/api/users";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";
import { POLL_SALES_MS, refetchIntervalWhenVisible } from "@/lib/query/poll-intervals";
import type { PaginatedSalesResponse } from "@/lib/types/sales";
import type { VarianceReason } from "@/lib/types/domain";
import {
  VARIANCE_REASON_LABELS,
  VARIANCE_REASON_VALUES,
} from "@/lib/variance-reason-labels";
import { useAuthStore } from "@/stores/auth-store";
import { formatRelativeUpdated } from "@/lib/format-relative-updated";

const PAYMENT_OPTIONS = [
  { value: "", label: "All methods" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "MOMO", label: "Mobile money" },
  { value: "OTHER", label: "Other" },
];

function salesListQueryKey(args: Record<string, unknown>) {
  return ["sales", "list", args] as const;
}

function salesVarianceQueryKey(args: Record<string, unknown>) {
  return ["sales", "variances", args] as const;
}

export default function SalesPage() {
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [staffId, setStaffId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [varianceOnly, setVarianceOnly] = useState(false);
  const [varianceReason, setVarianceReason] = useState<VarianceReason | "">("");
  const [productId, setProductId] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy] = useState("soldAt");
  const [sortOrder] = useState<"asc" | "desc">("desc");

  const range = useMemo(
    () => rangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const listParams = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      page,
      limit,
      sortBy,
      sortOrder,
      staffId: staffId || undefined,
      branchId: branchId || undefined,
      paymentMethod: paymentMethod || undefined,
    }),
    [range.startDate, range.endDate, page, limit, sortBy, sortOrder, staffId, branchId, paymentMethod],
  );

  const varianceParams = useMemo(
    () => ({
      startDate: range.startDate,
      endDate: range.endDate,
      page,
      limit,
      branchId: branchId || undefined,
      productId: productId.trim() || undefined,
      varianceReason: varianceReason || undefined,
    }),
    [range.startDate, range.endDate, page, limit, branchId, productId, varianceReason],
  );

  const listQuery = useQuery({
    queryKey: salesListQueryKey(listParams),
    queryFn: () => fetchSalesPage(listParams),
    placeholderData: (prev: PaginatedSalesResponse | undefined) => prev,
    refetchInterval: () => refetchIntervalWhenVisible(POLL_SALES_MS),
    enabled: !varianceOnly,
  });

  const varianceQuery = useQuery({
    queryKey: salesVarianceQueryKey(varianceParams),
    queryFn: () => fetchSalesWithVariancesPage(varianceParams),
    placeholderData: (prev: PaginatedSalesResponse | undefined) => prev,
    refetchInterval: () => refetchIntervalWhenVisible(POLL_SALES_MS),
    enabled: varianceOnly,
  });

  const activeQuery = varianceOnly ? varianceQuery : listQuery;

  const usersQuery = useQuery({
    queryKey: ["org", "users"],
    queryFn: fetchOrgUsers,
    staleTime: 120_000,
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await downloadSalesExportBlob({
        startDate: range.startDate,
        endDate: range.endDate,
        staffId: staffId || undefined,
        branchId: branchId || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sales-export-${range.startDate}_${range.endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success("CSV download started.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Export failed.";
      toast.error(msg);
    },
  });

  const onPresetChange = useCallback((p: DateRangePreset) => {
    setPreset(p);
    setPage(1);
  }, []);

  const onVarianceOnlyChange = useCallback((v: boolean) => {
    setVarianceOnly(v);
    setPage(1);
    if (!v) {
      setVarianceReason("");
      setProductId("");
    }
  }, []);

  const data = activeQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">Transactions with filters and export (up to 50,000 rows).</p>
          {activeQuery.dataUpdatedAt ? (
            <p className="text-xs text-muted-foreground">Updated {formatRelativeUpdated(activeQuery.dataUpdatedAt)}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    exportMutation.isPending ||
                    (preset === "custom" && (!customStart || !customEnd))
                  }
                  onClick={() => exportMutation.mutate()}
                  className="min-h-10"
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-4" aria-hidden />
                  )}
                  <span className="ml-2">Export CSV</span>
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              Uses the same date, staff, branch, and payment filters as the table. Server cap: 50,000 rows. No paging
              or sort on export. Variance columns are not included in the server CSV today; the variance toggle
              filters the table only.
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm">
        <CardHeader className="space-y-4">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <DateRangePresetToolbar
            preset={preset}
            onPresetChange={onPresetChange}
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="staff-filter">Staff</Label>
              <select
                id="staff-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                value={staffId}
                disabled={varianceOnly}
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
            <div className="space-y-1.5">
              <Label htmlFor="branch-filter">Branch ID</Label>
              <input
                id="branch-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Optional UUID"
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-filter">Payment</Label>
              <select
                id="pay-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                value={paymentMethod}
                disabled={varianceOnly}
                onChange={(e) => {
                  setPaymentMethod(e.target.value);
                  setPage(1);
                }}
              >
                {PAYMENT_OPTIONS.map((o) => (
                  <option key={o.value || "all"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-border/40 pt-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="variance-only"
                checked={varianceOnly}
                onCheckedChange={(v) => onVarianceOnlyChange(v === true)}
              />
              <Label htmlFor="variance-only" className="cursor-pointer text-sm font-normal">
                Variance only
              </Label>
            </div>
            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="variance-reason">Variance reason</Label>
                <select
                  id="variance-reason"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  value={varianceReason}
                  disabled={!varianceOnly}
                  onChange={(e) => {
                    setVarianceReason((e.target.value as VarianceReason | "") || "");
                    setPage(1);
                  }}
                >
                  <option value="">Any reason</option>
                  {VARIANCE_REASON_VALUES.map((r) => (
                    <option key={r} value={r}>
                      {VARIANCE_REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="variance-product">Product ID</Label>
                <input
                  id="variance-product"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                  placeholder="Optional UUID"
                  value={productId}
                  disabled={!varianceOnly}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeQuery.isError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
              <p className="font-medium text-destructive">Could not load sales.</p>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void activeQuery.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {activeQuery.isPending && !data ? (
            <SalesTableSkeleton />
          ) : (
            <SalesTable rows={data?.data ?? []} currency={currency} />
          )}
          {data ? (
            <PaginationBar
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={(p) => setPage(p)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
