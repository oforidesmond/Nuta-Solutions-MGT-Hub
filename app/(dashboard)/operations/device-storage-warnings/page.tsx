"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useOrgUserLabels } from "@/components/operations/use-org-user-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { fetchStaffDeviceWarningsPage } from "@/lib/api/staff-reliability";
import { formatDate } from "@/lib/format";
import { reliabilityListHttpMessage } from "@/lib/reliability-list-error";
import { reliabilityStaffDisplayName } from "@/lib/reliability-user-label";
import type { StaffDeviceStorageWarningRow } from "@/lib/types/staff-reliability";
import { fetchOrgUsers } from "@/lib/api/users";
import type { HubUser } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function numMb(v: number | string | null | undefined): string {
  if (v === null || v === undefined) return "-";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (!Number.isFinite(n)) return "-";
  return `${n} MB`;
}

export default function DeviceStorageWarningsPage() {
  const userLabels = useOrgUserLabels();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [rows, setRows] = useState<StaffDeviceStorageWarningRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [applied, setApplied] = useState<{ userId?: string; from?: string; to?: string }>({});

  useEffect(() => {
    let c = false;
    fetchOrgUsers()
      .then((list) => {
        if (!c) setUsers(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!c) setUsers([]);
      });
    return () => {
      c = true;
    };
  }, []);

  const load = useCallback(
    async (cursor?: string, append?: boolean) => {
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const res = await fetchStaffDeviceWarningsPage({
          cursor,
          userId: applied.userId,
          from: applied.from,
          to: applied.to,
        });
        if (append) setRows((p) => [...p, ...res.items]);
        else setRows(res.items);
        setNextCursor(res.nextCursor);
      } catch (e) {
        const msg = reliabilityListHttpMessage("storage warnings", "GET /staff/device-warnings", e);
        if (!append) {
          setLoadError(msg);
          setRows([]);
          setNextCursor(null);
          toast.error(msg);
        } else {
          toast.error(msg);
        }
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [applied],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Device storage warnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Low free-space events from staff devices. <span className="font-medium text-destructive">Critical</span>{" "}
          means under 100 MB free; <span className="font-medium text-amber-600">warning</span> means under 500 MB
          (mobile convention).
        </p>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-2 sm:min-w-[12rem]">
            <Label htmlFor="sw-user">Staff member</Label>
            <select
              id="sw-user"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={draftUserId}
              onChange={(e) => setDraftUserId(e.target.value)}
            >
              <option value="">All users</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {[u.firstName, u.lastName].filter(Boolean).join(" ") || u.email}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sw-from">From</Label>
            <Input id="sw-from" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sw-to">To</Label>
            <Input id="sw-to" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </div>
          <Button
            type="button"
            onClick={() =>
              setApplied({
                userId: draftUserId || undefined,
                from: draftFrom || undefined,
                to: draftTo || undefined,
              })
            }
          >
            Apply filters
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Free (MB)</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      {loadError
                        ? "Fix the error above and refresh, or adjust filters."
                        : "No warnings in this result. Telemetry appears when devices report low storage."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => {
                    const critical = r.level === "critical";
                    return (
                      <TableRow
                        key={r.id ?? `${r.userId}-${r.createdAt}-${i}`}
                        className={cn(
                          critical && "bg-destructive/10 dark:bg-destructive/15",
                          r.level === "warning" && "bg-amber-500/10 dark:bg-amber-500/10",
                        )}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground" title={r.createdAt ?? ""}>
                          {formatDate(r.createdAt)}
                        </TableCell>
                        <TableCell>{reliabilityStaffDisplayName(r, userLabels)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numMb(r.freeSpaceMb)}</TableCell>
                        <TableCell className="text-right tabular-nums">{numMb(r.thresholdMb)}</TableCell>
                        <TableCell
                          className={cn(
                            "font-medium capitalize",
                            critical ? "text-destructive" : "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {r.level}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.type ?? "low_storage"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
          {nextCursor && !loadError ? (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="secondary"
                disabled={loadingMore}
                onClick={() => void load(nextCursor ?? undefined, true)}
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        <Link href="/" className="underline underline-offset-2">
          Dashboard
        </Link>
      </p>
    </div>
  );
}
