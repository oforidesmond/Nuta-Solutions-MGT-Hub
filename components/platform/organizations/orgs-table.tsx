import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlanBadge } from "@/components/platform/plan-badge";
import { StatusBadge } from "@/components/platform/status-badge";
import { formatDate } from "@/lib/format";
import type { PlatformOrganization } from "@/lib/types/platform";

interface OrgsTableProps {
  rows: PlatformOrganization[];
  renderActions?: (org: PlatformOrganization) => ReactNode;
}

export function OrgsTable({ rows, renderActions }: OrgsTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border/40 bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="px-4">Organization</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Users</TableHead>
            <TableHead className="text-right">Sales</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((org) => (
            <TableRow key={org.id}>
              <TableCell className="px-4 py-3">
                <Link
                  href={`/platform/organizations/${org.id}`}
                  className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                >
                  {org.name}
                </Link>
                {org.email ? (
                  <p className="text-xs text-muted-foreground">{org.email}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <PlanBadge plan={org.planType} />
              </TableCell>
              <TableCell>
                <StatusBadge status={org.planStatus} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {org.counts.users.toLocaleString()}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {org.salesCount.toLocaleString()}
                {org.salesLimit ? (
                  <span className="text-muted-foreground">
                    {" / "}
                    {org.salesLimit.toLocaleString()}
                  </span>
                ) : null}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {formatDate(org.createdAt)}
              </TableCell>
              <TableCell className="pr-4 text-right">
                {renderActions ? renderActions(org) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
