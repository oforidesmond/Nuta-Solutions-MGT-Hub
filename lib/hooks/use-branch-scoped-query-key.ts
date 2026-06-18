"use client";

import { withBranchKey } from "@/lib/query/branch-query-keys";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";

export function useBranchScopedQueryKey<T extends readonly unknown[]>(
  ...parts: T
): readonly ["branch", string, ...T] {
  const branchId = useActiveBranchId();
  return withBranchKey(branchId, ...parts);
}
