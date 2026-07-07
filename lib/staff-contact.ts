import axios from "axios";
import { handleApiError } from "@/lib/api/errors";
import { phonesEquivalent } from "@/lib/phone";
import type { HubStaffMember } from "@/lib/types/staff";

function staffDisplayName(m: HubStaffMember): string {
  const name = [m.firstName, m.lastName].filter(Boolean).join(" ");
  return name || m.email || m.staffId || "this staff member";
}

/** System-generated placeholder emails used when no real email is provided. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  return (
    lower.endsWith("@temp.nutasolutions.com") ||
    lower.endsWith("@placeholder.nutasolutions.com")
  );
}

export function findStaffContactConflict(
  members: HubStaffMember[],
  opts: {
    phone?: string;
    email?: string;
    excludeId?: string;
  },
): string | null {
  const email = opts.email?.trim().toLowerCase();
  const phone = opts.phone?.trim();

  for (const member of members) {
    if (opts.excludeId && member.id === opts.excludeId) continue;

    if (phone && phonesEquivalent(member.phoneNumber, phone)) {
      const status = member.isActive ? "" : " (deactivated)";
      return `This phone number is already used by ${staffDisplayName(member)}${status}.`;
    }

    if (email && member.email?.trim().toLowerCase() === email) {
      const status = member.isActive ? "" : " (deactivated)";
      return `This email is already used by ${staffDisplayName(member)}${status}.`;
    }
  }

  return null;
}

/** Friendlier message when the API reports a duplicate phone/email constraint. */
export function formatStaffDuplicateError(error: unknown, fallback?: string): string {
  const msg = handleApiError(error);
  const lower = msg.toLowerCase();

  const isDuplicate =
    (axios.isAxiosError(error) && error.response?.status === 409) ||
    lower.includes("unique constraint") ||
    lower.includes("already exists") ||
    lower.includes("already in use") ||
    lower.includes("duplicate");

  if (!isDuplicate) return fallback ?? msg;

  if (lower.includes("phone")) {
    return "This phone number is already on file. It may belong to a deactivated staff member who no longer appears in your team list.";
  }

  if (lower.includes("email")) {
    return "This email is already on file. It may belong to a deactivated staff member who no longer appears in your team list.";
  }

  return "This phone number or email is already on file. It may belong to a deactivated staff member who no longer appears in your team list.";
}
