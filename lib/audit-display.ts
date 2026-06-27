import type { AuditEventRow } from "@/lib/types/audit";

export function formatAuditBranchLabel(row: Pick<AuditEventRow, "branchName" | "branchId">): string {
  if (row.branchName?.trim()) return row.branchName.trim();
  if (row.branchId?.trim()) return row.branchId.slice(0, 8);
  return "Org-wide";
}

export function safeJsonStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

export function safeJsonPretty(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}
