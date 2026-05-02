"use client";

import Link from "next/link";
import { LineChart as LineChartIcon, PieChart as PieChartIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function PlatformAnalyticsLandingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Platform-wide growth curves and billing plan posture across all tenants.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="gap-4 p-5">
          <div className="flex items-start gap-3">
            <LineChartIcon className="mt-0.5 size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-2">
              <h2 className="font-heading text-base font-semibold text-foreground">Growth trends</h2>
              <p className="text-sm text-muted-foreground">
                New organizations, users, devices, sales volume and revenue aggregated by bucket.
              </p>
              <Link
                href="/platform/analytics/growth"
                className={cn(buttonVariants({ size: "sm" }), "w-fit")}
              >
                Open growth report
              </Link>
            </div>
          </div>
        </Card>

        <Card className="gap-4 p-5">
          <div className="flex items-start gap-3">
            <PieChartIcon className="mt-0.5 size-8 text-muted-foreground" aria-hidden />
            <div className="space-y-2">
              <h2 className="font-heading text-base font-semibold text-foreground">Plans</h2>
              <p className="text-sm text-muted-foreground">
                Seat mix, migrations between plans, and trial conversion snapshot.
              </p>
              <Link href="/platform/analytics/plans" className={cn(buttonVariants({ size: "sm" }), "w-fit")}>
                Open plan report
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
