"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchProductInsightShrinkage,
  fetchProductInsightVelocity,
} from "@/lib/api/product-insights";
import { productInsightKeys } from "@/lib/query/product-lifecycle-keys";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import {
  currentMonthDateRange,
  shrinkageConcernLabel,
  shrinkageScoreToConcern,
  velocityStatusLabel,
} from "@/lib/types/product-lifecycle";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  enabled?: boolean;
};

export function ProductHealthStrip({ productId, enabled = true }: Props) {
  const activeBranchId = useActiveBranchId();
  const monthRange = currentMonthDateRange();

  const velocityQuery = useQuery({
    queryKey: productInsightKeys.velocity(productId, activeBranchId),
    queryFn: () => fetchProductInsightVelocity(productId),
    enabled: enabled && !!productId,
    staleTime: 60_000,
  });

  const shrinkageQuery = useQuery({
    queryKey: productInsightKeys.shrinkage(productId, activeBranchId, monthRange),
    queryFn: () =>
      fetchProductInsightShrinkage(productId, {
        from: monthRange.from,
        to: monthRange.to,
      }),
    enabled: enabled && !!productId,
    staleTime: 60_000,
  });

  const loading = velocityQuery.isPending || shrinkageQuery.isPending;

  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-32" />
      </div>
    );
  }

  const velocityLabel = velocityStatusLabel(velocityQuery.data?.status);
  const concern =
    shrinkageQuery.data?.concernLevel &&
    ["low", "medium", "high"].includes(String(shrinkageQuery.data.concernLevel))
      ? (shrinkageQuery.data.concernLevel as "low" | "medium" | "high")
      : shrinkageScoreToConcern(shrinkageQuery.data?.score);
  const shrinkageLabel = shrinkageConcernLabel(concern);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="outline" className="font-normal">
        {velocityLabel}
      </Badge>
      <Badge
        variant="outline"
        className={cn(
          "font-normal",
          concern === "high" && "border-destructive/40 bg-destructive/10 text-destructive",
          concern === "medium" && "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
        )}
      >
        Stock loss: {shrinkageLabel}
      </Badge>
    </div>
  );
}
