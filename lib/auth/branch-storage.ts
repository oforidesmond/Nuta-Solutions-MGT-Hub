import { ACTIVE_BRANCH_STORAGE_KEY } from "@/lib/constants";

export function getActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
}

export function setActiveBranchId(branchId: string | null): void {
  if (typeof window === "undefined") return;
  if (branchId) localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branchId);
  else localStorage.removeItem(ACTIVE_BRANCH_STORAGE_KEY);
}
