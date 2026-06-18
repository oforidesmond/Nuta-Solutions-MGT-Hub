import { fetchNotificationsAtBranch } from "@/lib/api/notifications";
import type { HubBranch } from "@/lib/types/branches";
import type { HubNotification } from "@/lib/types/phase2";

export type OtherBranchUnreadSummary = {
  branchId: string;
  branchName: string;
  count: number;
};

const OTHER_BRANCH_UNREAD_LIMIT = 50;

function isBranchSpecificUnread(n: HubNotification, branchId: string): boolean {
  return n.branchId === branchId && n.isRead !== true && n.read !== true;
}

export async function fetchOtherBranchUnreadSummaries(
  branches: HubBranch[],
  activeBranchId: string | null,
): Promise<OtherBranchUnreadSummary[]> {
  const others = branches.filter(
    (b) => b.isActive !== false && b.id && b.id !== activeBranchId,
  );

  if (others.length === 0) return [];

  const results = await Promise.all(
    others.map(async (branch) => {
      const items = await fetchNotificationsAtBranch(branch.id, {
        unread: true,
        limit: OTHER_BRANCH_UNREAD_LIMIT,
      });
      const count = items.filter((n) => isBranchSpecificUnread(n, branch.id)).length;
      return { branchId: branch.id, branchName: branch.name, count };
    }),
  );

  return results
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count || a.branchName.localeCompare(b.branchName));
}

export function formatOtherBranchUnreadHint(
  summaries: OtherBranchUnreadSummary[],
): string | null {
  if (summaries.length === 0) return null;

  const parts = summaries.map((s) => {
    const label = s.count > OTHER_BRANCH_UNREAD_LIMIT ? "50+" : String(s.count);
    return `${label} unread in ${s.branchName}`;
  });

  return `${parts.join(" · ")} - switch branches to view`;
}
