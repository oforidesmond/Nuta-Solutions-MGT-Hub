"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StaffStockActivitySheet } from "@/components/insights/staff-stock-activity-sheet";
import { fetchStaffById } from "@/lib/api/staff";
import { canViewOrgAnalytics } from "@/lib/branch-access";
import { useAuthStore } from "@/stores/auth-store";

export default function StaffProfilePage() {
  const params = useParams();
  const staffId = typeof params?.staffId === "string" ? params.staffId : "";
  const role = useAuthStore((s) => s.user?.role);
  const canInsights = canViewOrgAnalytics(role);
  const [activityOpen, setActivityOpen] = useState(false);

  const query = useQuery({
    queryKey: ["staff", "byId", staffId],
    queryFn: () => fetchStaffById(staffId),
    enabled: Boolean(staffId),
  });

  const m = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Staff</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {query.isPending ? <Skeleton className="inline-block h-8 w-48" /> : m ? staffName(m) : "-"}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {canInsights && m ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-9"
              onClick={() => setActivityOpen(true)}
            >
              Stock activity review
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="min-h-9" render={<Link href="/staff" />}>
            Back to team
          </Button>
        </div>
      </div>

      {query.isError ? (
        <p className="text-sm text-destructive">Could not load this staff member.</p>
      ) : query.isPending ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : m ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/40 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Staff ID</span>{" "}
                <span className="font-mono text-xs">{m.staffId}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email</span> {m.email ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Phone</span> {m.phoneNumber ?? "-"}
              </p>
              <p>
                <span className="text-muted-foreground">Role</span>{" "}
                <Badge variant="outline" className="capitalize">
                  {String(m.role).toLowerCase().replace("_", " ")}
                </Badge>
              </p>
              <p>
                <span className="text-muted-foreground">Status</span>{" "}
                {m.isActive ? (
                  <span className="text-emerald-700 dark:text-emerald-300">Active</span>
                ) : (
                  <span className="text-muted-foreground">Inactive</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/40 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Devices</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p className="mb-3">View devices registered for this staff member.</p>
              <Button render={<Link href={`/staff/${staffId}/devices`} />}>Open devices</Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <StaffStockActivitySheet
        userId={m?.id ?? null}
        staffName={m ? staffName(m) : null}
        open={activityOpen}
        onOpenChange={setActivityOpen}
      />
    </div>
  );
}

function staffName(m: { firstName?: string | null; lastName?: string | null; email?: string | null }) {
  const n = [m.firstName, m.lastName].filter(Boolean).join(" ").trim();
  return n || m.email || "Staff";
}
