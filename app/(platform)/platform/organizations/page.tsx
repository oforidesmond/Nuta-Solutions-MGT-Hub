"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, RotateCw } from "lucide-react";
import { fetchOrganizationsPage } from "@/lib/api/platform/organizations";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { OrgFiltersBar } from "@/components/platform/organizations/org-filters-bar";
import { OrgsTable } from "@/components/platform/organizations/orgs-table";
import { OrgCard } from "@/components/platform/organizations/org-card";
import { OrgActionsMenu } from "@/components/platform/organizations/org-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import type {
  OrganizationListParams,
  PlanStatus,
  PlanType,
} from "@/lib/types/platform";

const DEFAULT_LIMIT = 20;

export default function PlatformOrganizationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [planType, setPlanType] = useState<PlanType[]>([]);
  const [planStatus, setPlanStatus] = useState<PlanStatus[]>([]);
  const [sortBy, setSortBy] =
    useState<NonNullable<OrganizationListParams["sortBy"]>>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const t = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed !== debouncedSearch) {
        setDebouncedSearch(trimmed);
        setPage(1);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, debouncedSearch]);

  function setFilter<T>(setter: (next: T) => void) {
    return (next: T) => {
      setter(next);
      setPage(1);
    };
  }

  const params: OrganizationListParams = {
    page,
    limit: DEFAULT_LIMIT,
    search: debouncedSearch || undefined,
    planType: planType.length > 0 ? planType : undefined,
    planStatus: planStatus.length > 0 ? planStatus : undefined,
    sortBy,
    sortOrder,
  };

  const query = useQuery({
    queryKey: ["platform", "organizations", params],
    queryFn: () => fetchOrganizationsPage(params),
    placeholderData: keepPreviousData,
  });

  const meta = query.data?.meta;
  const rows = query.data?.data ?? [];

  function clearAll() {
    setSearch("");
    setDebouncedSearch("");
    setPlanType([]);
    setPlanStatus([]);
    setSortBy("createdAt");
    setSortOrder("desc");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">
          Organizations
        </h1>
        <p className="text-sm text-muted-foreground">
          {meta
            ? `${meta.total.toLocaleString()} total ${meta.total === 1 ? "organization" : "organizations"}`
            : "Loading…"}
        </p>
      </div>

      <OrgFiltersBar
        search={search}
        onSearchChange={setSearch}
        planType={planType}
        onPlanTypeChange={setFilter(setPlanType)}
        planStatus={planStatus}
        onPlanStatusChange={setFilter(setPlanStatus)}
        sortBy={sortBy}
        onSortByChange={setFilter(setSortBy)}
        sortOrder={sortOrder}
        onSortOrderChange={setFilter(setSortOrder)}
        onClearAll={clearAll}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <Card className="gap-4 p-6">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Could not load organizations
            </h2>
            <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          </div>
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
              Try again
            </Button>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 className="size-10" aria-hidden />}
          title="No organizations found"
          description="Try adjusting your search or filters."
        />
      ) : (
        <>
          <OrgsTable
            rows={rows}
            renderActions={(org) => <OrgActionsMenu org={org} variant="row" />}
          />
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((org) => (
              <OrgCard
                key={org.id}
                org={org}
                actions={<OrgActionsMenu org={org} variant="row" />}
              />
            ))}
          </div>
          {meta ? (
            <PaginationBar
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border/40 p-3 last:border-0">
            <Skeleton className="h-4 w-48 rounded-md" />
            <Skeleton className="ml-auto h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
