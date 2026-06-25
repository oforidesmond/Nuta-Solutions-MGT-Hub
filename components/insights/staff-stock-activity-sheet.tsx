"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LifecycleEntryCard } from "@/components/products/lifecycle-entry-card";
import { fetchOrgInsightStaffActivity } from "@/lib/api/org-insights";
import { handleApiError } from "@/lib/api/errors";
import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { orgInsightKeys } from "@/lib/query/product-lifecycle-keys";
import { useAuthStore } from "@/stores/auth-store";

type Props = {
  userId: string | null;
  staffName?: string | null;
  period?: OrgAnalyticsPeriod;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StaffStockActivitySheet({
  userId,
  staffName,
  period = "month",
  open,
  onOpenChange,
}: Props) {
  const activeBranchId = useActiveBranchId();
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";

  const query = useQuery({
    queryKey: userId
      ? orgInsightKeys.staffActivity(userId, activeBranchId, period)
      : ["staff-activity", "none"],
    queryFn: () => fetchOrgInsightStaffActivity(userId!, { period }),
    enabled: open && !!userId,
    staleTime: 60_000,
  });

  const items = query.data?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[min(92vh,40rem)] flex-col gap-0 rounded-t-2xl px-0 pb-0 sm:mx-auto sm:max-w-lg sm:side-right sm:max-h-full sm:rounded-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" aria-hidden />
        <SheetHeader className="space-y-2 border-b border-border/40 px-4 pb-4 pt-2 text-left">
          <SheetTitle>Stock activity review</SheetTitle>
          <SheetDescription>
            {staffName ? `${staffName} — ` : ""}
            Stock movements across all products this period.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 py-4">
          {query.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : query.isError ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{handleApiError(query.error)}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
                Retry
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock activity recorded for this period.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((entry) => (
                <LifecycleEntryCard key={entry.id} entry={entry} currency={currency} />
              ))}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
