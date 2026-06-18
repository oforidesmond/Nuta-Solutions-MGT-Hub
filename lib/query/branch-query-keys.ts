/** Segment label for branch-scoped React Query keys. */
export const BRANCH_KEY = "branch" as const;

export function branchKeySegment(branchId: string | null): string {
  return branchId ?? "none";
}

export function withBranchKey<T extends readonly unknown[]>(
  branchId: string | null,
  ...parts: T
): readonly [typeof BRANCH_KEY, string, ...T] {
  return [BRANCH_KEY, branchKeySegment(branchId), ...parts];
}

/** Domain roots that receive X-Branch-Id and must include branch in queryKey. */
export const BRANCH_SCOPED_ROOTS = [
  "dashboard",
  "sales",
  "returns",
  "reports",
  "inventory",
  "products",
  "product-conversions",
  "product-price-context",
  "transfer-stock",
  "audit",
  "notifications",
] as const;

export type BranchScopedRoot = (typeof BRANCH_SCOPED_ROOTS)[number];

export function isBranchScopedQueryKey(key: unknown): boolean {
  if (!Array.isArray(key) || key.length < 2) return false;
  if (key[0] === BRANCH_KEY) return true;
  const root = key[0];
  if (typeof root !== "string") return false;
  return (BRANCH_SCOPED_ROOTS as readonly string[]).includes(root);
}
