"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Download, RotateCw } from "lucide-react";
import { fetchPlanDistribution } from "@/lib/api/platform/analytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/platform/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { handleApiError } from "@/lib/api/errors";
import { downloadTextFile, rowsToCsv } from "@/lib/utils/csv";
import { Users, TrendingUp, Timer, Percent } from "lucide-react";
import type { PlanDistributionEntry, PlanType } from "@/lib/types/platform";

const PIE_COLORS: Record<PlanType, string> = {
  FREE: "rgb(148, 163, 184)",
  TRIAL: "rgb(167, 139, 250)",
  PRO: "rgb(59, 130, 246)",
  ENTERPRISE: "rgb(236, 72, 153)",
};

export default function PlansAnalyticsPage() {
  const query = useQuery({
    queryKey: ["platform", "analytics", "plans"],
    queryFn: fetchPlanDistribution,
  });

  const transitionsCsv = useMemo(() => {
    const rows = (query.data?.transitions ?? []).map((t) => ({
      fromPlan: t.fromPlan,
      toPlan: t.toPlan,
      count: String(t.count),
      lastMonth: String(t.lastMonth),
    }));
    return rowsToCsv(rows, ["fromPlan", "toPlan", "count", "lastMonth"]);
  }, [query.data?.transitions]);

  function downloadTransitions() {
    downloadTextFile(transitionsCsv, "platform-plan-transitions.csv");
  }

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <SkeletonHeader />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="h-72 animate-pulse bg-muted/40 p-4" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="h-24 animate-pulse bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="gap-3 p-6">
        <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
        <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
          <RotateCw className="mr-2 size-4" aria-hidden />
          Retry
        </Button>
      </Card>
    );
  }

  const { distribution, transitions, trialConversion } = query.data;

  const pieData = distribution.map((d: PlanDistributionEntry) => ({
    name: d.planType,
    value: d.count,
    pct: d.percentage,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Plan distribution</h1>
        <p className="text-sm text-muted-foreground">
          Live tenant mix derived from billing plan fields and recent migration events from EventLog.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="gap-4 p-4">
          <h2 className="font-heading text-sm font-semibold text-foreground">By plan type</h2>
          <div className="h-72 min-h-[16rem]">
            {pieData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={96}
                    paddingAngle={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name as PlanType] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(_value, _name, item) =>
                      `${(item.payload as { value: number; pct: number }).value.toLocaleString()} (${Number((item.payload as { pct: number }).pct).toFixed(1)}%)`
                    }
                  />
                  <Legend layout="horizontal" verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribution.map((d) => (
                <TableRow key={d.planType}>
                  <TableCell>{d.planType}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.count.toLocaleString()}</TableCell>
                  <TableCell className="text-right tabular-nums">{d.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Trials started" value={trialConversion.totalTrials} icon={Users} />
          <StatCard label="Converted" value={trialConversion.converted} icon={TrendingUp} />
          <StatCard label="Expired" value={trialConversion.expired} icon={Timer} />
          <StatCard
            label="Conversion rate"
            value={`${conversionRatePct(trialConversion.conversionRate).toFixed(1)}%`}
            icon={Percent}
          />
        </div>
      </div>

      <Card className="gap-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-sm font-semibold text-foreground">Plan transitions</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={transitions.length === 0}
            onClick={downloadTransitions}
          >
            <Download className="mr-2 size-4" aria-hidden />
            Transitions CSV
          </Button>
        </div>
        {transitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recorded transitions.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Last 30 days</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transitions.map((t, idx) => (
                  <TableRow key={`${t.fromPlan}-${t.toPlan}-${idx}`}>
                    <TableCell>{t.fromPlan}</TableCell>
                    <TableCell>{t.toPlan}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.count.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.lastMonth.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function conversionRatePct(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  return raw <= 1 ? raw * 100 : raw;
}

function SkeletonHeader() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}
