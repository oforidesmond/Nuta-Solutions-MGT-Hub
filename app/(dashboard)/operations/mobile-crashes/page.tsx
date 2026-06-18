"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { useOrgUserLabels } from "@/components/operations/use-org-user-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchMobileCrashReportById, fetchMobileCrashReportsPage } from "@/lib/api/staff-reliability";
import { formatDate } from "@/lib/format";
import { reliabilityListHttpMessage } from "@/lib/reliability-list-error";
import { reliabilityCrashStaffDisplayName } from "@/lib/reliability-user-label";
import type { MobileCrashReportRow } from "@/lib/types/staff-reliability";
import { fetchOrgUsers } from "@/lib/api/users";
import type { HubUser } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

function prettyJson(obj: Record<string, unknown> | null | undefined): string {
  if (!obj) return "";
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

export default function MobileCrashesPage() {
  const userLabels = useOrgUserLabels();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [rows, setRows] = useState<MobileCrashReportRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<MobileCrashReportRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftFatalOnly, setDraftFatalOnly] = useState(false);
  const [draftErrorType, setDraftErrorType] = useState("");
  const [applied, setApplied] = useState<{
    userId?: string;
    from?: string;
    to?: string;
    fatalOnly?: boolean;
    errorType?: string;
  }>({});

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
        const res = await fetchMobileCrashReportsPage({
          cursor,
          userId: applied.userId,
          from: applied.from,
          to: applied.to,
          fatalOnly: applied.fatalOnly,
          errorType: applied.errorType || undefined,
        });
        if (append) setRows((p) => [...p, ...res.items]);
        else setRows(res.items);
        setNextCursor(res.nextCursor);
      } catch (e) {
        const msg = reliabilityListHttpMessage("crash reports", "GET /analytics/crashes", e);
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

  async function openCrashDetail(r: MobileCrashReportRow) {
    if (!r.id) {
      toast.error("This crash row has no id; cannot load stack from the API.");
      return;
    }
    setDetail(r);
    setDetailLoading(true);
    try {
      const full = await fetchMobileCrashReportById(r.id);
      setDetail(full);
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? reliabilityListHttpMessage("crash detail", `GET /analytics/crashes/${r.id}`, e)
        : "Could not load crash detail.";
      toast.error(msg);
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  function rowKey(r: MobileCrashReportRow, i: number): string {
    return r.id ?? `${r.error}-${r.createdAt}-${i}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mobile crash reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          JavaScript errors and unhandled rejections from the staff mobile app. Open a row to load full detail.
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
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:min-w-[12rem]">
              <Label htmlFor="cr-user">Staff member</Label>
              <select
                id="cr-user"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 interactive-cursor"
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
              <Label htmlFor="cr-from">From</Label>
              <Input id="cr-from" type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-to">To</Label>
              <Input id="cr-to" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-etype">Error type</Label>
              <select
                id="cr-etype"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:min-w-[10rem] interactive-cursor"
                value={draftErrorType}
                onChange={(e) => setDraftErrorType(e.target.value)}
              >
                <option value="">Any</option>
                <option value="javascript">javascript</option>
                <option value="unhandled_rejection">unhandled_rejection</option>
              </select>
            </div>
            <label className="flex interactive-cursor items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draftFatalOnly}
                onChange={(e) => setDraftFatalOnly(e.target.checked)}
                className="size-4 rounded border-input"
              />
              Fatal only
            </label>
            <Button
              type="button"
              onClick={() =>
                setApplied({
                  userId: draftUserId || undefined,
                  from: draftFrom || undefined,
                  to: draftTo || undefined,
                  fatalOnly: draftFatalOnly || undefined,
                  errorType: draftErrorType || undefined,
                })
              }
            >
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Reports</CardTitle>
          <CardDescription>Click a row to load stack and full device info.</CardDescription>
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
                  <TableHead>Fatal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                      {loadError
                        ? "Fix the error above and refresh, or adjust filters."
                        : "No crash reports in this result."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r, i) => (
                    <TableRow
                      key={rowKey(r, i)}
                      className="interactive-cursor hover:bg-muted/40"
                      onClick={() => void openCrashDetail(r)}
                    >
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(r.clientOccurredAt ?? r.createdAt)}
                      </TableCell>
                      <TableCell>{reliabilityCrashStaffDisplayName(r, userLabels)}</TableCell>
                      <TableCell className={cn(r.isFatal && "font-semibold text-destructive")}>
                        {r.isFatal ? "yes" : "no"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {r.errorType ?? "-"}
                      </TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs">{r.error}</TableCell>
                    </TableRow>
                  ))
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
        <Link href="/reports" className="underline underline-offset-2">
          Reports
        </Link>
      </p>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Crash detail</SheetTitle>
            <SheetDescription className="font-mono text-xs">{detail?.error}</SheetDescription>
          </SheetHeader>
          {detail ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
              <div className="text-xs text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">Fatal:</span> {detail.isFatal ? "yes" : "no"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Type:</span> {detail.errorType ?? "-"}
                </p>
                <p>
                  <span className="font-medium text-foreground">Client time:</span>{" "}
                  {formatDate(detail.clientOccurredAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Received:</span> {formatDate(detail.createdAt)}
                </p>
                <p>
                  <span className="font-medium text-foreground">Staff:</span>{" "}
                  {reliabilityCrashStaffDisplayName(detail, userLabels)}
                </p>
              </div>
              <div className="min-h-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-foreground">Stack</p>
                <ScrollArea className="h-48 rounded-md border border-border/60 bg-muted/30 p-3">
                  {detailLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                      {detail.stack?.trim() ? detail.stack : "-"}
                    </pre>
                  )}
                </ScrollArea>
              </div>
              <div className="min-h-0 flex-1 space-y-2">
                <p className="text-xs font-medium text-foreground">Device info (JSON)</p>
                <ScrollArea className="h-48 rounded-md border border-border/60 bg-muted/30 p-3">
                  {detailLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                      {detail.deviceInfo ? prettyJson(detail.deviceInfo) : "-"}
                    </pre>
                  )}
                </ScrollArea>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
