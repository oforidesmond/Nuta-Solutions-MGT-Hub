import type { PlanType } from "@/lib/types/platform";

/** API sentinel for unlimited branch override. */
export const PLATFORM_UNLIMITED_BRANCH_LIMIT = 999999;

export function planDefaultBranchLimit(planType: PlanType): number | null {
  switch (planType) {
    case "TRIAL":
    case "FREE":
      return 1;
    case "PRO":
      return 3;
    case "ENTERPRISE":
      return null;
    default:
      return 1;
  }
}

export function formatEffectiveBranchLimit(limit: number | null): string {
  if (limit === null) return "Unlimited";
  return `${limit.toLocaleString()} branch${limit === 1 ? "" : "es"}`;
}

/** e.g. "2 of 3 branches in use" or "2 branches in use (unlimited)". */
export function formatBranchUsage(
  used: number,
  limit: number | null | undefined,
): string {
  const branchLabel = `${used.toLocaleString()} branch${used === 1 ? "" : "es"}`;
  if (limit == null) {
    return `${branchLabel} in use (unlimited)`;
  }
  return `${branchLabel} in use · limit ${limit.toLocaleString()}`;
}

export function isBranchUsageOverLimit(
  used: number,
  limit: number | null | undefined,
): boolean {
  return limit != null && used > limit;
}

export function hasBranchLimitOverride(override: number | null | undefined): boolean {
  return override != null;
}

export function isUnlimitedBranchOverride(override: number | null | undefined): boolean {
  return override === PLATFORM_UNLIMITED_BRANCH_LIMIT;
}

export type BranchLimitMode = "plan-default" | "custom" | "unlimited";

export function branchLimitModeFromOverride(
  override: number | null | undefined,
): BranchLimitMode {
  if (override == null) return "plan-default";
  if (isUnlimitedBranchOverride(override)) return "unlimited";
  return "custom";
}
