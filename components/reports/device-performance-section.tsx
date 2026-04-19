"use client";

import { useEffect, useState } from "react";
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
import { fetchAnalyticsCrashes, fetchAnalyticsPerformance } from "@/lib/api/analytics-hub";
import type { HubAnalyticsCrashRow, HubAnalyticsPerformanceRow } from "@/lib/types/phase2";

export function DevicePerformanceSection() {
  const [loading, setLoading] = useState(true);
  const [perf, setPerf] = useState<HubAnalyticsPerformanceRow[] | null>(null);
  const [crashes, setCrashes] = useState<HubAnalyticsCrashRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [p, c] = await Promise.all([fetchAnalyticsPerformance(), fetchAnalyticsCrashes()]);
        if (!cancelled) {
          setPerf(p);
          setCrashes(c);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        Aggregated device performance and crash reports will appear here when the API exposes{" "}
        <code className="rounded bg-muted px-1 text-xs">GET /analytics/performance</code> and{" "}
        <code className="rounded bg-muted px-1 text-xs">GET /analytics/crash</code>.
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
                      {row.avgDurationMs != null ? Math.round(row.avgDurationMs) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                    <TableCell className="max-w-md truncate font-mono text-xs">{row.error ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
