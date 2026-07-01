"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverOrTapHint } from "@/components/ui/hover-or-tap-hint";
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
import { fetchReturnsPage } from "@/lib/api/returns";
import { fetchOrgUsers } from "@/lib/api/users";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";

function truncateMiddle(v: string, keep = 4): string {
  if (!v) return v;
  if (v.length <= keep * 2 + 3) return v;
  return `${v.slice(0, keep)}...${v.slice(-keep)}`;
}

function isLikelyIdKey(k: string): boolean {
  return k === "id" || k === "userId" || k === "branchId" || k === "saleId" || k.endsWith("Id");
}

function isLikelyDateKey(k: string): boolean {
  return k === "returnedAt" || k === "createdAt" || k.endsWith("At");
}

/** Friendly column header for known keys (e.g. branch context). */
function humanizeColumnKey(k: string): string {
  if (k === "branchName") return "Branch";
  if (k === "branchId") return "Branch ID";
  return k;
}

function formatHumanDate(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function safeJsonPretty(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

function cellDisplay(
  k: string,
  v: unknown,
): { display: string; full?: string; kind?: "id" | "date" | "object" } {
  if (v == null) return { display: "-" };

  if (isLikelyDateKey(k)) {
    const formatted = formatHumanDate(v);
    if (formatted) return { display: formatted, full: String(v), kind: "date" };
  }

  const s =
    typeof v === "string" ? v : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : null;

  if (s && isLikelyIdKey(k) && s.length > 12) {
    return { display: truncateMiddle(s), full: s, kind: "id" };
  }

  if (typeof v === "object") {
    const compact = safeJsonStringify(v);
    const pretty = safeJsonPretty(v);
    return {
      display: compact.length > 40 ? `${compact.slice(0, 40)}…` : compact,
      full: pretty,
      kind: "object",
    };
  }

  if (s && s.length > 32) {
    return { display: `${s.slice(0, 32)}…`, full: s };
  }

  return { display: String(v) };
}

export default function ReturnsPage() {
  const activeBranchId = useActiveBranchId();
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
    queryKey: withBranchKey(activeBranchId, "returns", "list", params),
    queryFn: () => fetchReturnsPage(params),
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
        <h1 className="text-2xl font-semibold tracking-tight">Returns</h1>
        <p className="text-sm text-muted-foreground">Refunds and returns.</p>
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
            <div className="space-y-1.5">
              <Label htmlFor="ret-staff">Staff</Label>
              <select
                id="ret-staff"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm interactive-cursor"
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {listQuery.isError ? (
            <p className="text-sm text-destructive">Could not load returns.</p>
          ) : listQuery.isPending && !listQuery.data ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No returns in this range.</p>
          ) : (
            <Table>
                <TableHeader>
                  <TableRow>
                    {keys.map((k) => (
                      <TableHead key={k}>{humanizeColumnKey(k)}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx}>
                      {keys.map((k) => {
                        const { display, full, kind } = cellDisplay(k, row[k]);
                        const widthClass =
                          kind === "id" ? "max-w-[9rem]" : kind === "object" ? "max-w-[18rem]" : "max-w-[14rem]";
                        return (
                          <TableCell key={k} className={`${widthClass} truncate`} title={full ? undefined : display}>
                            {full ? (
                              <HoverOrTapHint
                                trigger={
                                  <button type="button" className="interactive-cursor w-full truncate text-left">
                                    {display}
                                  </button>
                                }
                              >
                                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                                  {full}
                                </pre>
                              </HoverOrTapHint>
                            ) : (
                              display
                            )}
                          </TableCell>
                        );
                      })}
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
