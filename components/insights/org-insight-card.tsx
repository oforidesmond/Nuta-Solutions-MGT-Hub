"use client";

import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import { QueryState } from "@/components/analytics/query-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props<T> = {
  title: string;
  description: string;
  icon: LucideIcon;
  period: OrgAnalyticsPeriod;
  queryKey: readonly unknown[];
  queryFn: () => Promise<T>;
  staleTime?: number;
  previewLimit?: number;
  skeletonHeight?: string;
  renderSummary: (data: T) => React.ReactNode;
  renderList: (data: T, limit?: number) => React.ReactNode;
  isEmpty?: (data: T) => boolean;
  onOpenDetail: (data: T) => void;
};

export function OrgInsightCard<T>({
  title,
  description,
  icon: Icon,
  queryKey,
  queryFn,
  staleTime = 60_000,
  previewLimit = 3,
  skeletonHeight = "h-32",
  renderSummary,
  renderList,
  isEmpty,
  onOpenDetail,
}: Props<T>) {
  const query = useQuery({
    queryKey,
    queryFn,
    staleTime,
  });

  const data = query.data;
  const empty = data != null && isEmpty ? isEmpty(data) : false;

  return (
    <Card
      className={cn(
        "border-border/40 bg-card/80 shadow-sm transition-shadow",
        data && !empty && "interactive-cursor hover:shadow-md",
      )}
      role={data && !empty ? "button" : undefined}
      tabIndex={data && !empty ? 0 : undefined}
      onClick={() => {
        if (data && !empty) onOpenDetail(data);
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && data && !empty) {
          e.preventDefault();
          onOpenDetail(data);
        }
      }}
    >
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <QueryState
          isPending={query.isPending}
          isError={query.isError}
          error={query.error}
          empty={empty}
          emptyMessage="Nothing to show for this period."
          skeletonHeight={skeletonHeight}
        >
          {data ? (
            <>
              {renderSummary(data)}
              {renderList(data, previewLimit)}
              {!empty ? (
                <p className="text-xs font-medium text-primary">Tap for full list</p>
              ) : null}
            </>
          ) : null}
        </QueryState>
      </CardContent>
    </Card>
  );
}
