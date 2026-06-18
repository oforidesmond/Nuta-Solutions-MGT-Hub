"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { fetchCrashReports } from "@/lib/api/platform/telemetry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/platform/stat-card";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import type { MobileCrashReport } from "@/lib/types/platform";

const DEFAULT_LIMIT = 20;

type FatalFilter = "all" | "fatal" | "nonfatal";

function dayStartUtc(isoDay: string): string {
  return `${isoDay}T00:00:00.000Z`;
}

function dayEndUtc(isoDay: string): string {
  return `${isoDay}T23:59:59.999Z`;
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 7);
  const toDay = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toDay(start), end: toDay(end) };
}

export default function TelemetryCrashesPage() {
  const def = defaultRange();
  const [page, setPage] = useState(1);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState("");
  const [fatalFilter, setFatalFilter] = useState<FatalFilter>("all");
  const [startDate, setStartDate] = useState(def.start);
  const [endDate, setEndDate] = useState(def.end);

  const isFatal: boolean | undefined =
    fatalFilter === "fatal" ? true : fatalFilter === "nonfatal" ? false : undefined;

  const params = {
    page,
    limit: DEFAULT_LIMIT,
    organizationId,
    userId: userId.trim() || undefined,
    isFatal,
    startDate: dayStartUtc(startDate),
    endDate: dayEndUtc(endDate),
  };

  const query = useQuery({
    queryKey: ["platform", "telemetry", "crashes", params],
    queryFn: () => fetchCrashReports(params),
    placeholderData: keepPreviousData,
  });

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  const summary = query.data?.summary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Crash reports</h1>
        <p className="text-sm text-muted-foreground">Mobile crash ingestion with contextual org/user rows.</p>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <OrgFilterPicker organizationId={organizationId} onOrganizationIdChange={(o) => { setOrganizationId(o); setPage(1); }} />
          <div className="space-y-1">
            <Label htmlFor="crash-user">User ID</Label>
            <Input
              id="crash-user"
              className="font-mono text-xs"
              placeholder="Optional UUID filter"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="crash-fatal">Severity</Label>
            <select
              id="crash-fatal"
              value={fatalFilter}
              onChange={(e) => {
                setFatalFilter(e.target.value as FatalFilter);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            >
              <option value="all">All</option>
              <option value="fatal">Fatal only</option>
              <option value="nonfatal">Non-fatal</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="crash-start">Start</Label>
            <input
              id="crash-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="crash-end">End</Label>
            <input
              id="crash-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm interactive-cursor"
            />
          </div>
        </div>
      </Card>

      {query.isPending && !query.data ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : query.isError ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        </Card>
      ) : summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={summary.totalCrashes} icon={AlertTriangle} />
          <StatCard label="Fatal" value={summary.fatalCrashes} icon={AlertTriangle} warning={summary.fatalCrashes > 0} />
          <StatCard label="Orgs impacted" value={summary.affectedOrganizations} />
          <StatCard label="Users impacted" value={summary.affectedUsers} />
        </div>
      ) : null}

      {summary && summary.topErrors.length > 0 ? (
        <Card className="gap-3 p-4">
          <h2 className="font-heading text-sm font-semibold text-foreground">Top fingerprints</h2>
          <ul className="space-y-2 text-sm">
            {summary.topErrors.map((item, idx) => (
              <li key={idx} className="flex items-start justify-between gap-4 rounded-md bg-muted/30 px-3 py-2 font-mono text-xs">
                <span className="break-all text-destructive">{item.error}</span>
                <span className="shrink-0 text-muted-foreground">{item.count}x</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {rows.length === 0 && !query.isPending ? (
        <EmptyState
          icon={<AlertTriangle className="size-10" />}
          title="No crash rows"
          description="Adjust filters or extend the window."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <CrashRow key={c.id} crash={c} />
          ))}
        </ul>
      )}

      {meta ? (
        <PaginationBar
          page={meta.page}
          totalPages={meta.totalPages}
          total={meta.total}
          limit={meta.limit}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}

function CrashRow({ crash }: { crash: MobileCrashReport }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {crash.isFatal ? (
              <Badge variant="outline" className="border-destructive/50 text-destructive">
                Fatal
              </Badge>
            ) : null}
            <span className="text-xs text-muted-foreground">{formatDate(crash.createdAt)}</span>
          </div>
          <code className="block break-all text-sm text-destructive">{crash.error}</code>
          <p className="text-xs text-muted-foreground">
            <Link
              href={`/platform/organizations/${crash.organization.id}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {crash.organization.name}
            </Link>
            {crash.user ? (
              <>
                {" · "}
                <Link
                  href={`/platform/users/${crash.user.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {[crash.user.firstName, crash.user.lastName].filter(Boolean).join(" ") || "User"}
                </Link>
              </>
            ) : null}
          </p>
          {crash.deviceInfo ? (
            <p className="text-xs text-muted-foreground">
              {crash.deviceInfo.model ?? "Device"} · {crash.deviceInfo.os ?? ""}{" "}
              {crash.deviceInfo.osVersion ?? ""}
            </p>
          ) : null}
        </div>
        {crash.stack ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(!open)}>
            {open ? "Hide stack" : "Show stack"}
          </Button>
        ) : null}
      </div>
      {open && crash.stack ? (
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 text-[0.65rem] text-zinc-100">
          {crash.stack}
        </pre>
      ) : null}
    </li>
  );
}
