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
import { fetchStaffDatabaseWarningsPage } from "@/lib/api/staff-reliability";
import { formatDate } from "@/lib/format";
import { reliabilityListHttpMessage } from "@/lib/reliability-list-error";
import { reliabilityStaffDisplayName } from "@/lib/reliability-user-label";
import type { StaffDatabaseWarningRow } from "@/lib/types/staff-reliability";
import { fetchOrgUsers } from "@/lib/api/users";
import type { HubUser } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function truncateLines(lines: string[], max = 120): string {
  const t = lines.join(" · ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function DatabaseWarningsPage() {
  const userLabels = useOrgUserLabels();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [rows, setRows] = useState<StaffDatabaseWarningRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
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
        const res = await fetchStaffDatabaseWarningsPage({
          cursor,
          userId: applied.userId,
          from: applied.from,
          to: applied.to,
        });
        if (append) setRows((p) => [...p, ...res.items]);
        else setRows(res.items);
        setNextCursor(res.nextCursor);
      } catch (e) {
        const msg = reliabilityListHttpMessage("database warnings", "GET /staff/database-warnings", e);
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

  function rowKey(r: StaffDatabaseWarningRow, i: number): string {
    return r.id ?? `${r.userId}-${r.createdAt}-${i}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Database integrity warnings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Health checks from staff SQLite. Rows with <span className="font-medium">healthy = false</span> or
          non-empty errors should be treated as incidents for support.
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
            <Label htmlFor="db-user">Staff member</Label>
            <select
              id="db-user"
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
            <Label htmlFor="db-from">From</Label>
            <Input id="db-from" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="db-to">To</Label>
            <Input id="db-to" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
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
          <CardTitle className="text-base">Reports</CardTitle>
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
                  <TableHead>Healthy</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      {loadError
                        ? "Fix the error above and refresh, or adjust filters."
                        : "No database warnings in this result."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => {
                    const key = rowKey(r, i);
                    const open = expanded === key;
                    const preview = truncateLines(r.errors);
                    return (
                      <TableRow
                        key={key}
                        className={cn(!r.healthy && "bg-destructive/5 dark:bg-destructive/10")}
                      >
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                        <TableCell>{reliabilityStaffDisplayName(r, userLabels)}</TableCell>
                        <TableCell className={cn(!r.healthy && "font-semibold text-destructive")}>
                          {r.healthy ? "yes" : "no"}
                        </TableCell>
                        <TableCell className="max-w-xl">
                          <p className="font-mono text-xs text-muted-foreground">{preview || "-"}</p>
                          {r.errors.length > 0 ? (
                            <Button
                              type="button"
                              variant="link"
                              className="h-auto px-0 py-1 text-xs"
                              onClick={() => setExpanded(open ? null : key)}
                            >
                              {open ? "Hide full list" : "Show full list"}
                            </Button>
                          ) : null}
                          {open ? (
                            <ul className="mt-2 list-inside list-disc space-y-1 rounded-md border border-border/60 bg-muted/30 p-3 font-mono text-xs">
                              {r.errors.map((line, li) => (
                                <li key={li}>{line}</li>
                              ))}
                            </ul>
                          ) : null}
                        </TableCell>
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
