"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RotateCw } from "lucide-react";
import { fetchOrganizationDetails } from "@/lib/api/platform/organizations";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PlanBadge } from "@/components/platform/plan-badge";
import { StatusBadge } from "@/components/platform/status-badge";
import { OrgActionsMenu } from "@/components/platform/organizations/org-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SUB_NAV: { segment: string; label: string }[] = [
  { segment: "", label: "Overview" },
  { segment: "/users", label: "Users" },
  { segment: "/devices", label: "Devices" },
  { segment: "/activity", label: "Activity" },
];

export default function OrganizationDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? params.id : "";
  const pathname = usePathname();

  const query = useQuery({
    queryKey: ["platform", "organizations", id],
    queryFn: () => fetchOrganizationDetails(id),
    enabled: Boolean(id),
  });

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <SubNavSkeleton />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card className="gap-4 p-6">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">
            Could not load organization
          </h2>
          <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Try again
          </Button>
          <Link
            href="/platform/organizations"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            Back to organizations
          </Link>
        </div>
      </Card>
    );
  }

  const { organization } = query.data;
  const basePath = `/platform/organizations/${id}`;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/platform/organizations"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Organizations
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold text-foreground">
                {organization.name}
              </h1>
              <PlanBadge plan={organization.planType} />
              <StatusBadge status={organization.planStatus} />
            </div>
            <p className="text-xs text-muted-foreground">
              Created {formatDate(organization.createdAt)}
              {organization.id ? (
                <span className="ml-2 font-mono text-[0.7rem]">{organization.id}</span>
              ) : null}
            </p>
          </div>
          <OrgActionsMenu
            org={organization}
            plan={query.data.plan}
            branchCount={organization.branchCount}
            variant="header"
          />
        </div>
      </div>

      <nav
        aria-label="Organization sections"
        className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
      >
        <ul className="inline-flex min-w-full gap-1 border-b border-border/40">
          {SUB_NAV.map(({ segment, label }) => {
            const href = `${basePath}${segment}`;
            const active =
              segment === ""
                ? pathname === basePath
                : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={segment}>
                <Link
                  href={href}
                  className={cn(
                    "inline-flex h-10 items-center px-3 text-sm font-medium transition-colors",
                    "border-b-2 -mb-px",
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div>{children}</div>
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-3 w-24 rounded-md" />
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-56 rounded-md" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  );
}

function SubNavSkeleton() {
  return (
    <div className="border-b border-border/40">
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
    </div>
  );
}

