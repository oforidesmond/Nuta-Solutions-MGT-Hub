"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  fetchAnalyticsCrashesPage,
  fetchAnalyticsPerformancePage,
} from "@/lib/api/analytics-hub";
import type { HubAnalyticsCrashRow, HubAnalyticsPerformanceRow } from "@/lib/types/phase2";

const DEFAULT_LIMIT = 50;

function formatNumber(v: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(v);
}

function truncateMiddle(v: string, keep = 6): string {
  if (!v) return v;
  if (v.length <= keep * 2 + 3) return v;
  return `${v.slice(0, keep)}...${v.slice(-keep)}`;
}

export function DevicePerformanceSection() {
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<HubAnalyticsPerformanceRow[] | null>(null);
  const [crashes, setCrashes] = useState<HubAnalyticsCrashRow[] | null>(null);
  const [perfCursor, setPerfCursor] = useState<string | null>(null);
  const [crashCursor, setCrashCursor] = useState<string | null>(null);
  const [loadingMorePerf, setLoadingMorePerf] = useState(false);
  const [loadingMoreCrashes, setLoadingMoreCrashes] = useState(false);
  const [error, setError] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        fetchAnalyticsPerformancePage({ limit: DEFAULT_LIMIT }),
        fetchAnalyticsCrashesPage({ limit: DEFAULT_LIMIT }),
      ]);
      setPerf(p ? p.items : p);
      setCrashes(c ? c.items : c);
      setPerfCursor(p ? p.nextCursor : null);
      setCrashCursor(c ? c.nextCursor : null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMorePerf = useCallback(async () => {
    if (!perfCursor) return;
    setLoadingMorePerf(true);
    try {
      const res = await fetchAnalyticsPerformancePage({ limit: DEFAULT_LIMIT, cursor: perfCursor });
      if (res) {
        setPerf((p) => [...(p ?? []), ...res.items]);
        setPerfCursor(res.nextCursor);
      }
    } finally {
      setLoadingMorePerf(false);
    }
  }, [perfCursor]);

  const loadMoreCrashes = useCallback(async () => {
    if (!crashCursor) return;
    setLoadingMoreCrashes(true);
    try {
      const res = await fetchAnalyticsCrashesPage({ limit: DEFAULT_LIMIT, cursor: crashCursor });
      if (res) {
        setCrashes((c) => [...(c ?? []), ...res.items]);
        setCrashCursor(res.nextCursor);
      }
    } finally {
      setLoadingMoreCrashes(false);
    }
  }, [crashCursor]);

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        Device analytics could not be loaded. Try again later.
      </p>
    );
  }

  if (perf === null && crashes === null) {
    return (
      <p className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Device performance and crash samples load from{" "}
        <code className="rounded bg-muted px-1 text-xs">GET /analytics/performance</code> and{" "}
        <code className="rounded bg-muted px-1 text-xs">GET /analytics/crashes</code> (paginated). If both return{" "}
        <span className="font-medium">404</span>, check your API base URL and deploy.
      </p>
    );
  }

  const perfRows = perf ?? [];
  const crashRows = crashes ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {perfRows.length > 0 ? (
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Sale completion time</CardTitle>
            <CardDescription>Average duration by device (when reported).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">Avg (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfRows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.deviceModel ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{row.metric ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.avgDurationMs != null ? formatNumber(row.avgDurationMs) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {perfCursor ? (
              <div className="mt-4 flex justify-center">
                <Button type="button" variant="secondary" disabled={loadingMorePerf} onClick={() => void loadMorePerf()}>
                  {loadingMorePerf ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {crashRows.length > 0 ? (
        <Card className="border-border/40 bg-card/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-medium">Recent crashes</CardTitle>
            <CardDescription>Errors reported from staff devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crashRows.map((row, i) => (
                  <TableRow key={row.id ?? i}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{row.deviceModel ?? "—"}</TableCell>
                    <TableCell className="max-w-md truncate font-mono text-xs">
                      {row.error && row.error.length > 60 ? (
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="max-w-md truncate text-left">
                                {row.error}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{row.error}</TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      ) : (
                        row.error ?? "—"
                      )}
                      {row.id ? (
                        <TooltipProvider>
                          <UiTooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="ml-2 align-middle font-mono text-[10px] text-muted-foreground">
                                {truncateMiddle(row.id)}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{row.id}</TooltipContent>
                          </UiTooltip>
                        </TooltipProvider>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {crashCursor ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loadingMoreCrashes}
                  onClick={() => void loadMoreCrashes()}
                >
                  {loadingMoreCrashes ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {perfRows.length === 0 && crashRows.length === 0 ? (
        <p className="text-sm text-muted-foreground lg:col-span-2">
          No performance samples or crashes recorded yet.
        </p>
      ) : null}
    </div>
  );
}
