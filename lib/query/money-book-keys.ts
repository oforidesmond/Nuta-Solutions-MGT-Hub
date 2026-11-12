import { withBranchKey } from "@/lib/query/branch-query-keys";

export const moneyBookKeys = {
  summary: (branchId: string | null, range: { startDate: string; endDate: string }) =>
    withBranchKey(branchId, "money-book", "summary", range),
  feed: (
    branchId: string | null,
    args: {
      startDate: string;
      endDate: string;
      page: number;
      limit: number;
      direction?: string;
    },
  ) => withBranchKey(branchId, "money-book", "feed", args),
  entries: (branchId: string | null, args: Record<string, unknown>) =>
    withBranchKey(branchId, "money-book", "entries", args),
  categories: (branchId: string | null, direction?: string) =>
    withBranchKey(branchId, "money-book", "categories", direction ?? "all"),
};
