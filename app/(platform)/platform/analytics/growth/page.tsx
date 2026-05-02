"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";
import { Download, RotateCw } from "lucide-react";
import { fetchGrowthAnalytics } from "@/lib/api/platform/analytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { downloadTextFile, rowsToCsv } from "@/lib/utils/csv";
import { formatCurrency } from "@/lib/format";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type { GrowthTimelinePoint } from "@/lib/types/platform";

function dayStartUtc(isoDay: string): string {
  return `${isoDay}T00:00:00.000Z`;
}

function dayEndUtc(isoDay: string): string {
  return `${isoDay}T23:59:59.999Z`;
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 30);
  const toDay = (d: Date) => d.toISOString().slice(0, 10);
  return { start: toDay(start), end: toDay(end) };
}

function toNum(v: string | number): number {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function GrowthAnalyticsPage() {
  const def = defaultRange();
  const [startDate, setStartDate] = useState(def.start);
  const [endDate, setEndDate] = useState(def.end);
  const [groupBy, setGroupBy] = useState<"day" | "week" | "month">("day");

  const query = useQuery({
    queryKey: ["platform", "analytics", "growth", { startDate, endDate, groupBy }],
    queryFn: () =>
      fetchGrowthAnalytics({
        startDate: dayStartUtc(startDate),
        endDate: dayEndUtc(endDate),
        groupBy,
      }),
  });

  const csvMemo = useMemo(() => {
    const points = query.data?.timeline ?? [];
    const rows = points.map((p) => ({
      date: p.date,
      newOrganizations: String(p.newOrganizations),
      newUsers: String(p.newUsers),
      newDevices: String(p.newDevices),
      totalSales: String(p.totalSales),
      totalRevenue: String(p.totalRevenue),
    }));
    return rowsToCsv(rows, [
      "date",
      "newOrganizations",
      "newUsers",
      "newDevices",
      "totalSales",
      "totalRevenue",
    ]);
  }, [query.data]);

  const handleDownloadCsv = () => {
    downloadTextFile(
      csvMemo,
      `platform-growth-${startDate}_${endDate}_${groupBy}.csv`,
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Growth trends</h1>
          <p className="text-sm text-muted-foreground">
            Time-bucket aggregates from Postgres (empty buckets included).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="grow-start">Start</Label>
            <input
              id="grow-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="grow-end">End</Label>
            <input
              id="grow-end"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="grow-group">Group by</Label>
            <select
              id="grow-group"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "day" | "week" | "month")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={!(query.data?.timeline && query.data.timeline.length > 0)}
            onClick={handleDownloadCsv}
          >
            <Download className="mr-2 size-4" aria-hidden />
            CSV
          </Button>
        </div>
      </div>

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-72 animate-pulse bg-muted/40 md:[&:nth-child(1)]:col-span-2" />
          ))}
        </div>
      ) : query.isError ? (
        <Card className="gap-3 p-6">
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" aria-hidden />
            Retry
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="New devices" className="lg:col-span-2 lg:mx-auto lg:max-w-2xl">
            <LinePlot
              data={query.data?.timeline ?? []}
              dataKey="newDevices"
              color="rgb(192, 132, 252)"
            />
          </ChartCard>
          <ChartCard title="New organizations">
            <LinePlot
              data={query.data?.timeline ?? []}
              dataKey="newOrganizations"
              color="var(--color-primary)"
            />
          </ChartCard>
          <ChartCard title="New users">
            <LinePlot
              data={query.data?.timeline ?? []}
              dataKey="newUsers"
              color="rgb(56, 189, 248)"
            />
          </ChartCard>
          <ChartCard title="Sales volume">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={query.data?.timeline ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-20} dy={10} height={54} />
                <YAxis width={42} />
                <Tooltip />
                <Bar dataKey="totalSales" fill="rgb(74, 222, 128)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Revenue">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={query.data?.timeline ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-20} dy={10} height={54} />
                <YAxis tickFormatter={(v) => formatCurrency(Number(v || 0))} width={64} />
                <Tooltip formatter={(value: unknown) => [formatCurrency(toNum(value as string | number)), "Revenue"]} />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="rgb(251, 191, 36)"
                  fill="rgb(251, 191, 36)"
                  fillOpacity={0.25}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-2 p-4", className)}>
      <h2 className="font-heading text-sm font-semibold text-foreground">{title}</h2>
      <div className={cn("h-64 min-h-[16rem]", "sm:h-72 sm:min-h-[18rem]")}>{children}</div>
    </Card>
  );
}

function LinePlot({
  data,
  dataKey,
  color,
}: {
  data: GrowthTimelinePoint[];
  dataKey: keyof Pick<
    GrowthTimelinePoint,
    "newOrganizations" | "newUsers" | "newDevices"
  >;
  color: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} angle={-20} dy={10} height={54} />
        <YAxis width={36} />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey as string} stroke={color} dot={false} strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
