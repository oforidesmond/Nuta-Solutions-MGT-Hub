import axios, { type AxiosError } from "axios";

/** WhatsApp number admins should contact for broken-org-state / default-branch repairs. */
export const WHATSAPP_SUPPORT = "0541298861";

/** Stable backend error codes - key off these, never parse messages. */
export type BranchErrorCode =
  | "BRANCH_LIMIT_REACHED"
  | "BRANCH_NAME_CONFLICT"
  | "NO_DEFAULT_BRANCH"
  | "MULTIPLE_DEFAULT_BRANCHES"
  | "BRANCH_TRANSFER_SAME_BRANCH"
  | "BRANCH_NOT_IN_ORG"
  | "INSUFFICIENT_STOCK_FOR_TRANSFER"
  | "PRICE_SCOPE_REQUIRED"
  | "BRANCH_CANNOT_DEACTIVATE_DEFAULT"
  | "BRANCH_CONTEXT_MISSING"
  | "BRANCH_INACTIVE"
  | "BRANCH_NOT_FOUND"
  | "BRANCH_ACCESS_DENIED"
  | "BRANCH_LIMIT_OVERRIDE_INVALID";

/** Friendly, user-facing messages mapped from stable backend codes. */
export const ERROR_CODE_MESSAGES: Record<BranchErrorCode, string> = {
  BRANCH_LIMIT_REACHED:
    "You've reached your plan's branch limit. Upgrade your plan to add more branches.",
  BRANCH_NAME_CONFLICT: "A branch with that name already exists. Choose a different name.",
  NO_DEFAULT_BRANCH:
    `Your branches need attention - no default branch is set. Please contact support on WhatsApp ${WHATSAPP_SUPPORT} to repair this.`,
  MULTIPLE_DEFAULT_BRANCHES:
    `Your branches need attention - more than one default branch is set. Please contact support on WhatsApp ${WHATSAPP_SUPPORT} to repair this.`,
  BRANCH_TRANSFER_SAME_BRANCH:
    "The source and destination branches must be different.",
  BRANCH_NOT_IN_ORG:
    "One of the selected branches is unavailable. Refresh and try again.",
  INSUFFICIENT_STOCK_FOR_TRANSFER:
    "The source branch doesn't have enough stock for this transfer.",
  PRICE_SCOPE_REQUIRED: "Please choose whether this price applies org-wide or to this branch only.",
  BRANCH_CANNOT_DEACTIVATE_DEFAULT:
    `The default branch can't be deactivated. Assign another branch as default first - contact support on WhatsApp ${WHATSAPP_SUPPORT} to reassign.`,
  BRANCH_CONTEXT_MISSING:
    "We couldn't determine your active branch. Pick a branch and try again.",
  BRANCH_INACTIVE: "This branch is deactivated. Switch to an active branch to continue.",
  BRANCH_NOT_FOUND: "That branch could not be found in your organization.",
  BRANCH_ACCESS_DENIED: "You don't have access to this branch.",
  BRANCH_LIMIT_OVERRIDE_INVALID: "The branch limit value is invalid.",
};

type ApiErrorBody = {
  statusCode?: number;
  code?: string;
  message?: string | string[];
};

/** Extract the stable `code` from a `{ statusCode, code, message }` error body. */
export function getApiErrorCode(error: unknown): string | null {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<ApiErrorBody>;
    const code = ax.response?.data?.code;
    return typeof code === "string" && code.length > 0 ? code : null;
  }
  return null;
}

/** True when the error carries the given backend code. */
export function isApiErrorCode(error: unknown, code: BranchErrorCode): boolean {
  return getApiErrorCode(error) === code;
}

/**
 * Resolve a user-facing message: prefer the mapped code message, then the raw
 * backend message, then the provided fallback.
 */
export function getApiErrorMessage(error: unknown, fallback?: string): string {
  const code = getApiErrorCode(error);
  if (code && code in ERROR_CODE_MESSAGES) {
    return ERROR_CODE_MESSAGES[code as BranchErrorCode];
  }
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<ApiErrorBody>;
    const raw = ax.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : raw;
    if (message && typeof message === "string") return message;
  }
  return fallback ?? "Something went wrong. Please try again.";
}
