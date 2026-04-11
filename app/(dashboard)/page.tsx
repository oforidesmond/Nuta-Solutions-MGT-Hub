"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardSummary } from "@/lib/types/domain";

export default function DashboardHomePage() {
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchDashboardSummary();
        if (!cancelled) setSummary(s);
      } catch {
        if (!cancelled) {
          toast.error("Could not load dashboard metrics.");
          setSummary({
            totalSales: 0,
            inventoryCount: 0,
            lowStockCount: 0,
            expiringSoonCount: 0,
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const welcome =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "there";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {welcome}
        </h1>
        <p className="text-sm text-muted-foreground">
          {organization?.name ?? "Your organization"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Total sales"
              value={formatCurrency(summary?.totalSales ?? 0, organization?.currency)}
              hint="Recorded transactions"
            />
            <MetricCard
              title="Inventory"
              value={String(summary?.inventoryCount ?? 0)}
              hint="Active products"
            />
            <MetricCard
              title="Low stock"
              value={String(summary?.lowStockCount ?? 0)}
              hint="Items at or below threshold"
            />
            <MetricCard
              title="Expiry alerts"
              value={String(summary?.expiringSoonCount ?? 0)}
              hint="Batches expiring within 90 days"
            />
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
