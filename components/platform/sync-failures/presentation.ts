import type {
  JsonObject,
  JsonValue,
  PlatformSyncFailurePersonRef,
  PlatformSyncFailureResolutionAction,
  PlatformSyncFailureStatus,
} from "@/lib/types/platform";

const STATUS_LABELS: Record<PlatformSyncFailureStatus, string> = {
  OPEN: "Open",
  RESOLVED_RETRY: "Resolved for retry",
  ARCHIVED: "Archived",
  APPLIED: "Applied",
};

const ACTION_LABELS: Record<PlatformSyncFailureResolutionAction, string> = {
  RETRY: "Retry",
  IGNORE_CLEAR: "Ignore and clear",
  FIX_AND_APPLY: "Fix and apply",
};

export function syncFailureStatusLabel(status: PlatformSyncFailureStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function syncFailureActionLabel(
  action: PlatformSyncFailureResolutionAction | null | undefined,
): string {
  if (!action) return "-";
  return ACTION_LABELS[action] ?? action;
}

export function syncFailurePersonLabel(
  person: PlatformSyncFailurePersonRef | null | undefined,
  fallback = "-",
): string {
  if (!person) return fallback;
  const name = [person.firstName, person.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (person.email) return person.email;
  if (person.id) return person.id;
  return fallback;
}

export function syncFailureStatusTone(
  status: PlatformSyncFailureStatus,
): string {
  switch (status) {
    case "OPEN":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "APPLIED":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "RESOLVED_RETRY":
      return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "ARCHIVED":
      return "border-border bg-muted/40 text-muted-foreground";
    default:
      return "border-border bg-muted/40 text-foreground";
  }
}

export function safePrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function asJsonObject(value: JsonValue | null | undefined): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

export function readStringFromJson(
  value: JsonObject | null | undefined,
  keys: string[],
): string | null {
  if (!value) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }
  return null;
}

export function readAmountFromJson(
  value: JsonObject | null | undefined,
  keys: string[],
): string | number | null {
  if (!value) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") return candidate;
  }
  return null;
}

export function readArrayFromJson(
  value: JsonObject | null | undefined,
  keys: string[],
): JsonValue[] | null {
  if (!value) return null;
  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) return candidate;
  }
  return null;
}
