"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  RotateCw,
  Smartphone,
  Building2,
  TrendingUp,
} from "lucide-react";
import { fetchPlatformUserDetails } from "@/lib/api/platform/users";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoCard, InfoRow } from "@/components/platform/info-card";
import { StatCard } from "@/components/platform/stat-card";
import { PlanBadge } from "@/components/platform/plan-badge";
import { StatusBadge } from "@/components/platform/status-badge";
import { UserActionsMenu } from "@/components/platform/users/user-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";

export default function PlatformUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const query = useQuery({
    queryKey: ["platform", "users", id],
    queryFn: () => fetchPlatformUserDetails(id),
    enabled: Boolean(id),
  });

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 rounded-md" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl md:col-span-2" />
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Could not load user
          </h2>
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <RotateCw className="mr-2 size-4" />
            Try again
          </Button>
          <Link href="/platform/users" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Back to users
          </Link>
        </div>
      </Card>
    );
  }

  const { user, organization: orgSummary, activity } = query.data;
  const display =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.email ||
    user.id.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/platform/users"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Users
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">{display}</h1>
              <Badge variant="outline" className="font-mono text-[0.65rem]">
                {user.role}
              </Badge>
              <Badge
                variant="outline"
                className={
                  user.isActive
                    ? "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : ""
                }
              >
                {user.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Joined {formatDate(user.createdAt)}
              {user.lastLoginAt ? ` · Last login ${formatDate(user.lastLoginAt)}` : ""}
            </p>
          </div>
          <UserActionsMenu user={user} variant="header" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard title="Contact">
          <InfoRow label="Email" value={user.email ?? "-"} />
          <InfoRow label="Phone" value={user.phoneNumber ?? "-"} mono />
          <InfoRow label="User ID" value={user.id} mono />
        </InfoCard>

        <InfoCard title="Organization">
          {orgSummary ? (
            <>
              <InfoRow
                label="Name"
                value={
                  orgSummary.name ? (
                    <Link
                      href={`/platform/organizations/${orgSummary.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="size-3.5" aria-hidden />
                        {orgSummary.name}
                      </span>
                    </Link>
                  ) : (
                    "-"
                  )
                }
              />
              <InfoRow
                label="Plan"
                value={<PlanBadge plan={orgSummary.planType ?? "FREE"} />}
              />
              <InfoRow
                label="Status"
                value={
                  orgSummary.planStatus ? <StatusBadge status={orgSummary.planStatus} /> : "-"
                }
              />
              <InfoRow label="Currency" value={orgSummary.currency ?? "-"} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tenant organization on this account.</p>
          )}
        </InfoCard>

        <div className="grid grid-cols-2 gap-3 md:col-span-2 xl:col-span-1">
          <StatCard
            label="Devices"
            value={activity.devicesCount.toLocaleString()}
            icon={Smartphone}
          />
          <StatCard
            label="Sales count"
            value={activity.salesCount.toLocaleString()}
            icon={TrendingUp}
          />
        </div>
      </div>

      <Card className="gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-sm font-semibold text-foreground">Recent sales</h2>
          {orgSummary ? (
            <Link
              href={`/platform/devices?organizationId=${encodeURIComponent(orgSummary.id)}&userId=${encodeURIComponent(user.id)}`}
              className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto p-0")}
            >
              View my devices in org
            </Link>
          ) : null}
        </div>
        {activity.recentSales.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent sales.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="px-3">Receipt</TableHead>
                  <TableHead className="px-3">Amount</TableHead>
                  <TableHead className="px-3">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="px-3 font-mono text-xs">{s.receiptNumber ?? "-"}</TableCell>
                    <TableCell className="px-3 text-sm">
                      {formatCurrency(Number(s.totalAmount || 0))}
                    </TableCell>
                    <TableCell className="px-3 text-xs text-muted-foreground">
                      {s.soldAt ? formatDate(s.soldAt) : "-"}
                    </TableCell>
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
