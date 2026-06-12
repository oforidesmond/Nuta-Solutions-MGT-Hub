"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { fetchPlatformUsersPage } from "@/lib/api/platform/users";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { handleApiError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

export default function OrganizationUsersPage() {
  const params = useParams<{ id: string }>();
  const organizationId = typeof params?.id === "string" ? params.id : "";
  const [page, setPage] = useState(1);
  const limit = 20;

  const query = useQuery({
    queryKey: ["platform", "users", { organizationId, page, limit }],
    queryFn: () => fetchPlatformUsersPage({ organizationId, page, limit }),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

  if (query.isPending) {
    return <Skeleton className="h-72 rounded-xl" />;
  }

  if (query.isError) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {handleApiError(query.error)}
        </p>
      </Card>
    );
  }

  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-10" aria-hidden />}
        title="No users in this organization"
        description="Users created on mobile or via the management hub will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-border/40 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="px-4">Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last login</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => {
              const name =
                [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
                u.email ||
                "-";
              return (
                <TableRow key={u.id}>
                  <TableCell className="px-4 py-3">
                    <Link
                      href={`/platform/users/${u.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                    >
                      {name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[0.65rem]">
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email ?? "-"}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? (
                      <Badge variant="outline" className="border-transparent bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
    </div>
  );
}
