"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { fetchInventoryAdjustmentsPage } from "@/lib/api/inventory-logs";
import { fetchOrgUsers } from "@/lib/api/users";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";

export default function InventoryAdjustmentsPage() {
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [staffId, setStaffId] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

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
    }),
    [range.startDate, range.endDate, page, limit, staffId],
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

  const rows = listQuery.data?.data ?? [];
  const keys = rows[0] ? Object.keys(rows[0]).slice(0, 10) : [];

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
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No adjustments in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {keys.map((k) => (
                    <TableHead key={k}>{k}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {keys.map((k) => (
                      <TableCell key={k}>{String(row[k] ?? "—")}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
