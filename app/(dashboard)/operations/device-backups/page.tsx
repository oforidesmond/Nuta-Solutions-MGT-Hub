"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { reliabilityListHttpMessage } from "@/lib/reliability-list-error";
import { useOrgUserLabels } from "@/components/operations/use-org-user-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { downloadStaffBackupFile, fetchStaffBackupsPage } from "@/lib/api/staff-reliability";
import { formatDate, formatFileSize } from "@/lib/format";
import { reliabilityStaffDisplayName } from "@/lib/reliability-user-label";
import type { StaffDeviceBackupRow } from "@/lib/types/staff-reliability";
import { fetchOrgUsers } from "@/lib/api/users";
import type { HubUser } from "@/lib/types/domain";

export default function DeviceBackupsPage() {
  const userLabels = useOrgUserLabels();
  const [users, setUsers] = useState<HubUser[]>([]);
  const [rows, setRows] = useState<StaffDeviceBackupRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [draftUserId, setDraftUserId] = useState("");
  const [draftDeviceId, setDraftDeviceId] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [applied, setApplied] = useState<{
    userId?: string;
    deviceId?: string;
    from?: string;
    to?: string;
  }>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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
    async (cursor?: string | undefined, append?: boolean) => {
      const isAppend = Boolean(append);
      if (isAppend) setLoadingMore(true);
      else {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const res = await fetchStaffBackupsPage({
          cursor: cursor || undefined,
          userId: applied.userId || undefined,
          deviceId: applied.deviceId || undefined,
          from: applied.from || undefined,
          to: applied.to || undefined,
        });
        if (isAppend) {
          setRows((prev) => [...prev, ...res.items]);
        } else {
          setRows(res.items);
        }
        setNextCursor(res.nextCursor);
      } catch (e) {
        const msg = reliabilityListHttpMessage("backups", "GET /staff/backups", e);
        if (!isAppend) {
          setRows([]);
          setNextCursor(null);
          setLoadError(msg);
          toast.error(msg);
        } else {
          toast.error(msg);
        }
      } finally {
        if (isAppend) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [applied],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function applyServerFilters() {
    setApplied({
      userId: draftUserId || undefined,
      deviceId: draftDeviceId.trim() || undefined,
      from: draftFrom || undefined,
      to: draftTo || undefined,
    });
  }

  async function runDownload(id: string) {
    setDownloading(true);
    try {
      await downloadStaffBackupFile(id);
      toast.success("Download started.");
      setConfirmId(null);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 403) {
        toast.error("You do not have permission to download this backup.");
      } else {
        toast.error("Download failed. Check your connection and try again.");
      }
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Device backups</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SQLite backups uploaded from staff devices for support-led restores.
        </p>
      </div>

      {loadError ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Backup filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="bu-user">Staff member</Label>
            <select
              id="bu-user"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 interactive-cursor"
              value={draftUserId}
              onChange={(ev) => setDraftUserId(ev.target.value)}
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
            <Label htmlFor="bu-device">Device id</Label>
            <Input
              id="bu-device"
              value={draftDeviceId}
              onChange={(e) => setDraftDeviceId(e.target.value)}
              placeholder="Stable client device id"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bu-from">From (date)</Label>
            <Input
              id="bu-from"
              type="date"
              value={draftFrom}
              onChange={(e) => setDraftFrom(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bu-to">To (date)</Label>
            <Input id="bu-to" type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <Button type="button" onClick={() => void applyServerFilters()}>
              Apply filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">Uploads</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Device id</TableHead>
                  <TableHead>App</TableHead>
                  <TableHead>Build</TableHead>
                  <TableHead>Client created</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      {loadError
                        ? "Fix the error above and refresh, or adjust filters."
                        : "No backups in this result. Data appears when staff devices upload SQLite backups."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground" title={r.receivedAt ?? ""}>
                        {formatDate(r.receivedAt)}
                      </TableCell>
                      <TableCell>{reliabilityStaffDisplayName(r, userLabels)}</TableCell>
                      <TableCell className="max-w-[10rem] truncate font-mono text-xs">{r.deviceId}</TableCell>
                      <TableCell>{r.appVersion}</TableCell>
                      <TableCell>{r.buildNumber ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                        {formatDate(r.createdAtClient)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatFileSize(r.byteSize)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(r.expiresAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.storageProvider ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" size="sm" variant="outline" onClick={() => setConfirmId(r.id)}>
                          Download
                        </Button>
                      </TableCell>
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
        <Link href="/" className="underline underline-offset-2">
          Dashboard
        </Link>{" "}
      </p>

      <Dialog open={confirmId !== null} onOpenChange={(o) => !o && setConfirmId(null)}>
        <DialogContent showCloseButton className="max-w-md">
          <DialogHeader>
            <DialogTitle>Download backup?</DialogTitle>
            <DialogDescription>
              SQLite backups can be tens of megabytes. On slow networks this may take a while. The file is
              delivered as <span className="font-medium">application/octet-stream</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setConfirmId(null)} disabled={downloading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => confirmId && void runDownload(confirmId)}
              disabled={downloading || !confirmId}
            >
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
