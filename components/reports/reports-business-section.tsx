"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { fetchReportRevenueTrends, fetchReportSalesSummary, fetchReportStaffPerformance } from "@/lib/api/reports";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";
import type { RevenueTrendPeriod, StaffReportPeriod } from "@/lib/types/reports";

function extractRows(obj: Record<string, unknown>): Record<string, unknown>[] {
  const r = obj.rows ?? obj.data ?? obj.staff ?? obj.items ?? obj.results ?? obj.leaderboard;
  return Array.isArray(r) ? (r as Record<string, unknown>[]) : [];
}

function extractTrendSeries(obj: Record<string, unknown>): { name: string; value: number }[] {
  const raw = obj.data ?? obj.points ?? obj.series ?? obj.trends;
  if (!Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    if (row && typeof row === "object") {
      const o = row as Record<string, unknown>;
      const name = String(o.period ?? o.label ?? o.date ?? o.bucket ?? o.week ?? i);
      const v = o.amount ?? o.revenue ?? o.total ?? o.value ?? o.sum;
      const value = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) || 0 : 0;
      return { name, value };
    }
    return { name: String(i), value: 0 };
  });
}

function formatSummaryKv(data: Record<string, unknown>): { k: string; v: string }[] {
  const skip = new Set(["data", "items", "meta"]);
  return Object.entries(data)
    .filter(([k, v]) => !skip.has(k) && v !== null && typeof v !== "object")
    .slice(0, 12)
    .map(([k, v]) => ({ k, v: String(v) }));
}

export function ReportsBusinessSection() {
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [staffPeriod, setStaffPeriod] = useState<StaffReportPeriod>("30d");
  const [revenuePeriod, setRevenuePeriod] = useState<RevenueTrendPeriod>("weekly");

  const range = useMemo(
    () => rangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const salesSummaryQuery = useQuery({
    queryKey: ["reports", "sales-summary", range.startDate, range.endDate],
    queryFn: () => fetchReportSalesSummary({ startDate: range.startDate, endDate: range.endDate }),
    enabled: Boolean(range.startDate && range.endDate),
  });

  const staffPerfQuery = useQuery({
    queryKey: ["reports", "staff-performance", staffPeriod],
    queryFn: () => fetchReportStaffPerformance({ period: staffPeriod }),
  });

  const revenueTrendsQuery = useQuery({
    queryKey: ["reports", "revenue-trends", revenuePeriod],
    queryFn: () => fetchReportRevenueTrends({ period: revenuePeriod }),
  });

  const chartData = useMemo(
    () => extractTrendSeries(revenueTrendsQuery.data ?? {}),
    [revenueTrendsQuery.data],
  );
  const staffRows = useMemo(() => extractRows(staffPerfQuery.data ?? {}), [staffPerfQuery.data]);

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-medium tracking-tight">Sales summary</h2>
          <p className="text-sm text-muted-foreground">
            Requires both start and end dates. Choose a preset or custom range.
          </p>
        </div>
        <DateRangePresetToolbar
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Summary for selected range</CardTitle>
            <CardDescription>
              {range.startDate} → {range.endDate}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesSummaryQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : salesSummaryQuery.isError ? (
              <p className="text-sm text-destructive">Could not load sales summary.</p>
            ) : (
              <dl className="grid gap-2 sm:grid-cols-2">
                {formatSummaryKv(salesSummaryQuery.data ?? {}).map(({ k, v }) => (
                  <div key={k} className="flex justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{k.replace(/([A-Z])/g, " $1").replace(/_/g, " ")}</dt>
                    <dd className="font-medium tabular-nums text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Staff performance</h2>
        <div className="flex flex-wrap gap-2">
          {(["7d", "30d", "90d", "this_month"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={staffPeriod === p ? "default" : "outline"}
              onClick={() => setStaffPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Leaderboard</CardTitle>
            <CardDescription>Period: {staffPeriod}</CardDescription>
          </CardHeader>
          <CardContent>
            {staffPerfQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : staffPerfQuery.isError ? (
              <p className="text-sm text-destructive">Could not load staff performance.</p>
            ) : staffRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rows returned for this period.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    {Object.keys(staffRows[0] ?? {})
                      .slice(0, 8)
                      .map((k) => (
                        <TableHead key={k}>{k}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {Object.keys(staffRows[0] ?? {})
                        .slice(0, 8)
                        .map((k) => (
                          <TableCell key={k}>{String(row[k] ?? "—")}</TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Revenue trends</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Granularity</Label>
            <select
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={revenuePeriod}
              onChange={(e) => setRevenuePeriod(e.target.value as RevenueTrendPeriod)}
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </div>
        </div>
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Trend chart</CardTitle>
            <CardDescription>Period: {revenuePeriod}</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] w-full">
            {revenueTrendsQuery.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : revenueTrendsQuery.isError ? (
              <p className="text-sm text-destructive">Could not load revenue trends.</p>
            ) : chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No series data in the response.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={48} />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
