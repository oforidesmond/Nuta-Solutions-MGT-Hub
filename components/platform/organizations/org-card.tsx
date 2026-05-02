import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { PlanBadge } from "@/components/platform/plan-badge";
import { StatusBadge } from "@/components/platform/status-badge";
import { formatDate } from "@/lib/format";
import type { PlatformOrganization } from "@/lib/types/platform";

interface OrgCardProps {
  org: PlatformOrganization;
  actions?: ReactNode;
}

export function OrgCard({ org, actions }: OrgCardProps) {
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/platform/organizations/${org.id}`}
            className="block truncate font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {org.name}
          </Link>
          {org.email ? (
            <p className="truncate text-xs text-muted-foreground">{org.email}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <PlanBadge plan={org.planType} />
        <StatusBadge status={org.planStatus} />
      </div>

      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Users</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {org.counts.users.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sales</dt>
          <dd className="font-medium tabular-nums text-foreground">
            {org.salesCount.toLocaleString()}
            {org.salesLimit ? (
              <span className="text-muted-foreground"> / {org.salesLimit.toLocaleString()}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Created</dt>
          <dd className="font-medium text-foreground">{formatDate(org.createdAt)}</dd>
        </div>
      </dl>
    </Card>
  );
}
