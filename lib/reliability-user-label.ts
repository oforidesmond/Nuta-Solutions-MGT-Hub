import type { ReliabilityNestedUser } from "@/lib/types/staff-reliability";

export function nestedUserDisplayName(u: ReliabilityNestedUser | null | undefined): string | null {
  if (!u) return null;
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || u.email || u.id || null;
}

/** Prefer nested `user` from list APIs; fall back to org user map from `GET /users`. */
export function reliabilityStaffDisplayName(
  row: { userId: string; user?: ReliabilityNestedUser | null },
  labelByUserId: Record<string, string>,
): string {
  const fromNested = nestedUserDisplayName(row.user ?? undefined);
  if (fromNested) return fromNested;
  return labelByUserId[row.userId] || row.userId;
}

export function reliabilityCrashStaffDisplayName(
  row: { userId?: string | null; user?: ReliabilityNestedUser | null },
  labelByUserId: Record<string, string>,
): string {
  const fromNested = nestedUserDisplayName(row.user ?? undefined);
  if (fromNested) return fromNested;
  if (row.userId) return labelByUserId[row.userId] || row.userId;
  return "-";
}
