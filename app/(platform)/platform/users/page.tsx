"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { RotateCw, Users } from "lucide-react";
import type { UserRole } from "@/lib/types/domain";
import { fetchPlatformUsersPage } from "@/lib/api/platform/users";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { UserFiltersBar, type UsersActiveFilter } from "@/components/platform/users/user-filters-bar";
import { UserActionsMenu } from "@/components/platform/users/user-actions-menu";
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PlatformUser } from "@/lib/types/platform";

const DEFAULT_LIMIT = 20;

export default function PlatformUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState<UserRole[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<UsersActiveFilter>("all");

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

  function setFilterOrg(next: string | undefined) {
    setOrganizationId(next);
    setPage(1);
  }

  function setFilterRole(next: UserRole[]) {
    setRole(next);
    setPage(1);
  }

  function setFilterActive(next: UsersActiveFilter) {
    setActiveFilter(next);
    setPage(1);
  }

  const isActive: boolean | undefined =
    activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined;

  const params = {
    page,
    limit: DEFAULT_LIMIT,
    search: debouncedSearch || undefined,
    role: role.length > 0 ? role : undefined,
    organizationId,
    isActive,
  };

  const query = useQuery({
    queryKey: ["platform", "users", params],
    queryFn: () => fetchPlatformUsersPage(params),
    placeholderData: keepPreviousData,
  });

  const meta = query.data?.meta;
  const rows = query.data?.data ?? [];

  function clearAll() {
    setSearch("");
    setDebouncedSearch("");
    setRole([]);
    setOrganizationId(undefined);
    setActiveFilter("all");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          {meta
            ? `${meta.total.toLocaleString()} user${meta.total === 1 ? "" : "s"} across tenants`
            : "Loading…"}
        </p>
      </div>

      <UserFiltersBar
        search={search}
        onSearchChange={setSearch}
        role={role}
        onRoleChange={setFilterRole}
        organizationId={organizationId}
        onOrganizationIdChange={setFilterOrg}
        activeFilter={activeFilter}
        onActiveFilterChange={setFilterActive}
        onClearAll={clearAll}
      />

      {query.isPending ? (
        <ListSkeleton />
      ) : query.isError ? (
        <Card className="gap-4 p-6">
          <div>
            <h2 className="font-heading text-base font-semibold text-foreground">
              Could not load users
            </h2>
            <p className="text-sm text-muted-foreground">{handleApiError(query.error)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RotateCw className={cn("mr-2 size-4", query.isFetching && "animate-spin")} />
            Try again
          </Button>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Users className="size-10" aria-hidden />}
          title="No users found"
          description="Try different search keywords or filters."
        />
      ) : (
        <>
          <UsersTableDesktop rows={rows} />
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((u) => (
              <UserCardMobile key={u.id} user={u} />
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

function displayName(user: PlatformUser): string {
  const n = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return n || user.email || user.id.slice(0, 8);
}

function UsersTableDesktop({ rows }: { rows: PlatformUser[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="px-4">User</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last login</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((u) => {
            const name = displayName(u);
            return (
              <TableRow key={u.id}>
                <TableCell className="px-4 py-3">
                  <Link
                    href={`/platform/users/${u.id}`}
                    className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {name}
                  </Link>
                  <p className="font-mono text-[0.7rem] text-muted-foreground">{u.email ?? "-"}</p>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {u.organization ? (
                    <Link
                      href={`/platform/organizations/${u.organization.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {u.organization.name}
                    </Link>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[0.65rem]">
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      u.isActive
                        ? "border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-transparent bg-muted text-muted-foreground"
                    }
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                </TableCell>
                <TableCell className="text-right">
                  <UserActionsMenu user={u} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function UserCardMobile({ user }: { user: PlatformUser }) {
  const name = displayName(user);
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/platform/users/${user.id}`}
            className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {name}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{user.email ?? "-"}</p>
          {user.organization ? (
            <Link
              href={`/platform/organizations/${user.organization.id}`}
              className="mt-1 block truncate text-xs text-primary underline-offset-4 hover:underline"
            >
              {user.organization.name}
            </Link>
          ) : null}
        </div>
        <UserActionsMenu user={user} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="font-mono text-[0.65rem]">
          {user.role}
        </Badge>
        <Badge variant="outline" className={user.isActive ? "" : "text-muted-foreground"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Login: {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
        </span>
      </div>
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      <div className="hidden overflow-hidden rounded-xl border border-border/40 md:block">
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
