"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RotateCw } from "lucide-react";
import { fetchPerformanceMetrics } from "@/lib/api/platform/telemetry";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OrgFilterPicker } from "@/components/platform/org-filter-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import Link from "next/link";

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 7);
  const toDay = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toDay(start), end: toDay(end) };
}

function dayStartUtc(isoDay: string): string {
  return `${isoDay}T00:00:00.000Z`;
}

function dayEndUtc(isoDay: string): string {
  return `${isoDay}T23:59:59.999Z`;
}

export default function TelemetryPerformancePage() {
  const def = defaultRange();
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [metric, setMetric] = useState("");
  const [startDate, setStartDate] = useState(def.start);
  const [endDate, setEndDate] = useState(def.end);

  const params = {
    organizationId,
    metric: metric.trim() || undefined,
    startDate: dayStartUtc(startDate),
    endDate: dayEndUtc(endDate),
  };

  const query = useQuery({
    queryKey: ["platform", "telemetry", "performance", params],
    queryFn: () => fetchPerformanceMetrics(params),
  });

  const chartData = useMemo(
    () =>
      (query.data?.metrics ?? []).map((m) => ({
        name: m.metric,
        p95: Math.round(m.p95Duration),
        avg: Math.round(m.avgDuration),
      })),
    [query.data?.metrics],
  );

  const metricOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of query.data?.metrics ?? []) set.add(m.metric);
    for (const s of query.data?.slowestOperations ?? []) set.add(s.metric);
    return Array.from(set).sort();
  }, [query.data]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Performance</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated duration percentiles per metric name from platform telemetry.
        </p>
      </div>

      <Card className="gap-4 p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <OrgFilterPicker organizationId={organizationId} onOrganizationIdChange={setOrganizationId} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="perf-start">Start</Label>
              <input
                id="perf-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="perf-end">End</Label>
              <input
                id="perf-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="perf-metric">Metric filter</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="perf-metric"
              placeholder="Subset e.g. sync_push"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              className="max-w-xs font-mono text-xs"
            />
            {metricOptions.length > 0 ? (
              <select
                aria-label="Pick known metric"
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value=""
                onChange={(e) => {
                  if (e.target.value) setMetric(e.target.value);
                }}
              >
                <option value="">Known metrics…</option>
                {metricOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </Card>

      {query.isPending ? (
        <Card className="h-80 animate-pulse bg-muted/40" />
      ) : query.isError ? (
        <Card className="gap-3 p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" aria-hidden />
            Retry
          </Button>
        </Card>
      ) : (
        <>
          <Card className="gap-3 p-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">p95 latency (ms)</h2>
            <div className="h-72 min-h-[16rem]">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No metrics in this window.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={chartData} margin={{ left: 24, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="p95" fill="rgb(251, 191, 36)" radius={[0, 4, 4, 0]} name="p95 ms" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card className="gap-3 p-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">Metric rollups</h2>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">p50</TableHead>
                    <TableHead className="text-right">p95</TableHead>
                    <TableHead className="text-right">p99</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(query.data?.metrics ?? []).map((m) => (
                    <TableRow key={m.metric}>
                      <TableCell className="font-mono text-xs">{m.metric}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(m.avgDuration)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(m.p50Duration)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(m.p95Duration)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(m.p99Duration)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="gap-3 p-4">
            <h2 className="font-heading text-sm font-semibold text-foreground">Slowest operations</h2>
            {(query.data?.slowestOperations ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">None recorded.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">ms</TableHead>
                      <TableHead>Org</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data!.slowestOperations.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(s.createdAt)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.metric}</TableCell>
                        <TableCell className="text-right tabular-nums">{s.durationMs}</TableCell>
                        <TableCell className="text-xs">
                          {s.organizationId ? (
                            <Link
                              href={`/platform/organizations/${s.organizationId}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              Open
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
