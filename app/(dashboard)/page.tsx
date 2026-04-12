"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Package, LineChart, Boxes, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchDashboardSummary } from "@/lib/api/dashboard";
import { formatCurrency } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import type { DashboardSummary } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

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
          toast.error("Could not load your dashboard. Check your connection.");
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

  const businessName = organization?.name ?? "your shop";
  const signedInAs =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() ||
    user?.email ||
    "there";

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {businessName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{signedInAs}</span>
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
              title="Money from sales"
              value={formatCurrency(summary?.totalSales ?? 0, organization?.currency)}
              hint="All recorded sales added together"
            />
            <MetricCard
              title="Items you sell"
              value={String(summary?.inventoryCount ?? 0)}
              hint="Active products in your catalog"
            />
            <MetricCard
              title="Running low or out"
              value={String(summary?.lowStockCount ?? 0)}
              hint="Needs restocking soon"
              badgeCount={summary?.lowStockCount ?? 0}
              badgeTone="destructive"
            />
            <MetricCard
              title="Expiry warnings"
              value={String(summary?.expiringSoonCount ?? 0)}
              hint="Batches expiring in the next 90 days"
              badgeCount={summary?.expiringSoonCount ?? 0}
              badgeTone="warning"
            />
          </>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/products/new" />}>
            <Plus className="size-4" aria-hidden />
            Add product
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/inventory" />}>
            <Boxes className="size-4" aria-hidden />
            Stock overview
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/products" />}>
            <Package className="size-4" aria-hidden />
            View products
          </Button>
          <Button variant="outline" className="min-h-11 justify-center sm:min-w-[11rem]" render={<Link href="/reports" />}>
            <LineChart className="size-4" aria-hidden />
            Reports
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  badgeCount,
  badgeTone = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  badgeCount?: number;
  badgeTone?: "neutral" | "destructive" | "warning";
}) {
  const showBadge = typeof badgeCount === "number" && badgeCount > 0;
  return (
    <Card className="relative border-border/40 bg-card/80 shadow-sm backdrop-blur-sm transition-shadow duration-200 hover:shadow-md">
      {showBadge ? (
        <Badge
          className={cn(
            "absolute right-3 top-3 min-w-7 justify-center px-1.5 text-xs font-semibold tabular-nums",
            badgeTone === "destructive" && "border-transparent bg-destructive text-destructive-foreground",
            badgeTone === "warning" &&
              "border-amber-600/50 bg-amber-500 text-amber-950 dark:bg-amber-500 dark:text-amber-950",
          )}
          variant={badgeTone === "destructive" ? "destructive" : "secondary"}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </Badge>
      ) : null}
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
