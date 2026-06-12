import axios, { type AxiosError } from "axios";
import { BRANCH_FORBIDDEN_FLAG } from "@/lib/api/client";

/** User-facing message for API failures (design doc §Error Handling). */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const ax = error as AxiosError<{ message?: string | string[] }> & {
      [BRANCH_FORBIDDEN_FLAG]?: boolean;
    };
    const status = ax.response?.status;
    const raw = ax.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : raw;

    if (status === 404) return "We could not find that item.";
    if (status === 401) return "Please sign in again to continue.";
    if (status === 403 && ax[BRANCH_FORBIDDEN_FLAG]) {
      return "You don't have access to this branch";
    }
    if (status === 403) return "You do not have permission to do this.";
    if (status === 409) return message || "This already exists or conflicts with existing data.";

    if (message && typeof message === "string") return message;
    if (ax.message === "Network Error") {
      return "Connection problem. Check your internet and try again.";
    }
    return "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
