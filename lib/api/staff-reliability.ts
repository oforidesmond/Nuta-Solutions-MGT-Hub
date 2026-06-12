/**
 * Phase 3 staff reliability - `GET` routes under global `/api/v1` (via `NEXT_PUBLIC_API_URL`).
 *
 * - `GET /dashboard/reliability-summary` - Operations home widgets.
 * - `GET /staff/backups`, `/staff/device-warnings`, `/staff/database-warnings`, `/analytics/crashes` - paginated lists (`limit`, `cursor`, …).
 * - `GET /analytics/crashes/:id` - full row including `stack`.
 * - `GET /staff/backup/:id` - binary SQLite download.
 */
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { DashboardReliabilitySummary, DashboardSummary } from "@/lib/types/domain";
import type {
  MobileCrashReportRow,
  PaginatedReliabilityResult,
  ReliabilityHomeSummary,
  ReliabilityNestedUser,
  StaffDatabaseWarningRow,
  StaffDeviceBackupRow,
  StaffDeviceStorageWarningRow,
} from "@/lib/types/staff-reliability";
import axios from "axios";

function num(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function numOrStr(v: unknown): string | number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function bool(v: unknown): boolean {
  return v === true || v === "true";
}

/** Parse filename from Content-Disposition (RFC 5987 filename* optional - basic support). */
export function parseContentDispositionFilename(header: string | undefined): string | null {
  if (!header) return null;
  const m = /filename\*?=(?:UTF-8'')?("?)([^";]+)\1/i.exec(header);
  if (m?.[2]) {
    try {
      return decodeURIComponent(m[2].replaceAll("+", " "));
    } catch {
      return m[2];
    }
  }
  const m2 = /filename="([^"]+)"/i.exec(header);
  return m2?.[1] ?? null;
}

function unwrapList<T>(raw: unknown): { items: T[]; nextCursor: string | null } {
  if (Array.isArray(raw)) return { items: raw as T[], nextCursor: null };
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.items ?? o.data ?? o.rows ?? o.results;
    const next =
      str(o.nextCursor) ??
      str(o.next_cursor) ??
      (typeof o.cursor === "string" ? o.cursor : null);
    if (Array.isArray(list)) return { items: list as T[], nextCursor: next };
  }
  return { items: [], nextCursor: null };
}

function isLimitNotAllowedError(e: unknown): boolean {
  return (
    axios.isAxiosError(e) &&
    e.response?.status === 400 &&
    typeof e.response?.data === "object" &&
    e.response?.data !== null &&
    Array.isArray((e.response.data as { message?: unknown }).message) &&
    (e.response.data as { message: unknown[] }).message.some(
      (m) => typeof m === "string" && m.includes("property limit should not exist"),
    )
  );
}

export function normalizeNestedUser(raw: unknown): ReliabilityNestedUser | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  return {
    id,
    firstName: str(o.firstName ?? o.first_name),
    lastName: str(o.lastName ?? o.last_name),
    email: str(o.email),
  };
}

function normalizeBackupRow(raw: unknown): StaffDeviceBackupRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nestedUser = normalizeNestedUser(o.user);
  const id = str(o.id);
  const userId = str(o.userId ?? o.user_id) ?? nestedUser?.id;
  const deviceId = str(o.deviceId ?? o.device_id);
  const appVersion = str(o.appVersion ?? o.app_version) ?? "-";
  if (!id || !userId || !deviceId) return null;
  return {
    id,
    userId,
    deviceId,
    appVersion,
    buildNumber: str(o.buildNumber ?? o.build_number),
    createdAtClient: str(o.createdAtClient ?? o.created_at_client ?? o.created_at),
    byteSize: numOrStr(o.byteSize ?? o.byte_size),
    originalFilename: str(o.originalFilename ?? o.original_filename),
    receivedAt: str(o.receivedAt ?? o.received_at),
    expiresAt: str(o.expiresAt ?? o.expires_at),
    storageProvider: (str(o.storageProvider ?? o.storage_provider) ?? null) as StaffDeviceBackupRow["storageProvider"],
    user: nestedUser,
  };
}

function normalizeStorageWarningRow(raw: unknown): StaffDeviceStorageWarningRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nestedUser = normalizeNestedUser(o.user);
  const userId = str(o.userId ?? o.user_id) ?? nestedUser?.id;
  const level = str(o.level) ?? "warning";
  if (!userId) return null;
  return {
    id: str(o.id) ?? undefined,
    userId,
    user: nestedUser,
    type: str(o.type),
    freeSpaceMb: numOrStr(o.freeSpaceMb ?? o.free_space_mb),
    thresholdMb: numOrStr(o.thresholdMb ?? o.threshold_mb),
    level,
    createdAt: str(o.createdAt ?? o.created_at),
  };
}

function normalizeDatabaseWarningRow(raw: unknown): StaffDatabaseWarningRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nestedUser = normalizeNestedUser(o.user);
  const userId = str(o.userId ?? o.user_id) ?? nestedUser?.id;
  if (!userId) return null;
  const errRaw = o.errors ?? o.error_list;
  let errors: string[] = [];
  if (Array.isArray(errRaw)) {
    errors = errRaw.filter((e): e is string => typeof e === "string");
  }
  return {
    id: str(o.id) ?? undefined,
    userId,
    user: nestedUser,
    healthy: o.healthy === undefined ? errors.length === 0 : bool(o.healthy),
    errors,
    createdAt: str(o.createdAt ?? o.created_at),
  };
}

export function normalizeMobileCrashRow(raw: unknown): MobileCrashReportRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const nestedUser = normalizeNestedUser(o.user);
  const error = str(o.error) ?? (typeof o.message === "string" ? o.message : null);
  if (!error) return null;
  const isFatal = bool(o.isFatal ?? o.is_fatal);
  const stackRaw = o.stack;
  const stack = typeof stackRaw === "string" ? stackRaw : undefined;
  return {
    id: str(o.id) ?? undefined,
    userId: str(o.userId ?? o.user_id) ?? nestedUser?.id ?? null,
    error,
    stack: stack ?? null,
    isFatal,
    errorType: (str(o.errorType ?? o.error_type) as MobileCrashReportRow["errorType"]) ?? null,
    clientOccurredAt: str(o.clientOccurredAt ?? o.client_occurred_at ?? o.timestamp),
    deviceInfo:
      o.deviceInfo && typeof o.deviceInfo === "object"
        ? (o.deviceInfo as Record<string, unknown>)
        : o.device_info && typeof o.device_info === "object"
          ? (o.device_info as Record<string, unknown>)
          : null,
    createdAt: str(o.createdAt ?? o.created_at),
    user: nestedUser,
  };
}

export function blankReliabilityHomeSummary(): ReliabilityHomeSummary {
  return {
    backupsLast7DaysCount: 0,
    backupsLast7DaysLatestReceivedAt: null,
    storageCriticalLast24hCount: 0,
    storageCriticalLast7DaysCount: 0,
    databaseIssuesLast7DaysCount: 0,
    databaseLastUnhealthyAt: null,
    crashesLast24hCount: 0,
    crashesLast24hFatalCount: 0,
    crashesLastOccurredAt: null,
    crashesLastWasFatal: null,
    storageLastOccurredAt: null,
    storageLastLevel: null,
    latestCriticalStorageAt: null,
  };
}

/** `GET /dashboard/reliability-summary` - nested widget object (§7.1). */
export function normalizeReliabilitySummaryPayload(raw: unknown): ReliabilityHomeSummary {
  if (!raw || typeof raw !== "object") return blankReliabilityHomeSummary();
  const o = raw as Record<string, unknown>;

  const backups =
    o.backups && typeof o.backups === "object" ? (o.backups as Record<string, unknown>) : {};
  const lowStorage =
    o.lowStorage && typeof o.lowStorage === "object"
      ? (o.lowStorage as Record<string, unknown>)
      : o.low_storage && typeof o.low_storage === "object"
        ? (o.low_storage as Record<string, unknown>)
        : {};
  const database =
    o.database && typeof o.database === "object" ? (o.database as Record<string, unknown>) : {};
  const crashes =
    o.crashes && typeof o.crashes === "object" ? (o.crashes as Record<string, unknown>) : {};

  const lastLevelRaw = str(lowStorage.lastLevel ?? lowStorage.last_level);
  const storageLastLevel: "critical" | "warning" | null =
    lastLevelRaw === "critical" || lastLevelRaw === "warning" ? lastLevelRaw : null;
  const storageLastOccurredAt = str(lowStorage.lastOccurredAt ?? lowStorage.last_occurred_at);

  const latestCriticalStorageAt =
    storageLastLevel === "critical" && storageLastOccurredAt ? storageLastOccurredAt : null;

  const lastWasFatalRaw = crashes.lastWasFatal ?? crashes.last_was_fatal;
  const crashesLastWasFatal =
    lastWasFatalRaw === true ? true : lastWasFatalRaw === false ? false : null;

  return {
    backupsLast7DaysCount: num(backups.countLast7Days ?? backups.count_last_7_days),
    backupsLast7DaysLatestReceivedAt: str(backups.lastReceivedAt ?? backups.last_received_at),
    storageCriticalLast24hCount: num(
      lowStorage.criticalCountLast24Hours ?? lowStorage.critical_count_last_24_hours,
    ),
    storageCriticalLast7DaysCount: 0,
    databaseIssuesLast7DaysCount: num(
      database.unhealthyCountLast7Days ?? database.unhealthy_count_last_7_days,
    ),
    databaseLastUnhealthyAt: str(database.lastUnhealthyAt ?? database.last_unhealthy_at),
    crashesLast24hCount: num(crashes.countLast24Hours ?? crashes.count_last_24_hours),
    crashesLast24hFatalCount: num(crashes.fatalCountLast24Hours ?? crashes.fatal_count_last_24_hours),
    crashesLastOccurredAt: str(crashes.lastOccurredAt ?? crashes.last_occurred_at),
    crashesLastWasFatal,
    storageLastOccurredAt,
    storageLastLevel,
    latestCriticalStorageAt,
  };
}

/** Extract optional reliability metrics from `GET /dashboard/summary` (legacy embed). */
export function extractReliabilityFromDashboardPayload(raw: unknown): DashboardReliabilitySummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const block = o.reliability;
  const src =
    block && typeof block === "object"
      ? (block as Record<string, unknown>)
      : {
          backupsLast7DaysCount: o.backupsLast7DaysCount ?? o.backups_last_7_days_count,
          backupsLast7DaysLatestReceivedAt:
            o.backupsLast7DaysLatestReceivedAt ?? o.backups_last_7_days_latest_received_at,
          storageCriticalLast24hCount: o.storageCriticalLast24hCount ?? o.storage_critical_last_24h_count,
          storageCriticalLast7DaysCount: o.storageCriticalLast7DaysCount ?? o.storage_critical_last_7_days_count,
          databaseIssuesLast7DaysCount: o.databaseIssuesLast7DaysCount ?? o.database_issues_last_7_days_count,
          crashesLast24hCount: o.crashesLast24hCount ?? o.crashes_last_24h_count,
          crashesLast24hFatalCount: o.crashesLast24hFatalCount ?? o.crashes_last_24h_fatal_count,
          latestCriticalStorageAt: o.latestCriticalStorageAt ?? o.latest_critical_storage_at,
        };
  const hasAny = Object.values(src).some((v) => v !== undefined && v !== null);
  if (!hasAny) return null;
  return {
    backupsLast7DaysCount: num(src.backupsLast7DaysCount),
    backupsLast7DaysLatestReceivedAt: str(src.backupsLast7DaysLatestReceivedAt),
    storageCriticalLast24hCount: num(src.storageCriticalLast24hCount),
    storageCriticalLast7DaysCount: num(src.storageCriticalLast7DaysCount),
    databaseIssuesLast7DaysCount: num(src.databaseIssuesLast7DaysCount),
    crashesLast24hCount: num(src.crashesLast24hCount),
    crashesLast24hFatalCount: num(src.crashesLast24hFatalCount),
    latestCriticalStorageAt: str(src.latestCriticalStorageAt),
  };
}

export function dashboardReliabilityToHome(d: DashboardReliabilitySummary): ReliabilityHomeSummary {
  return {
    backupsLast7DaysCount: d.backupsLast7DaysCount ?? 0,
    backupsLast7DaysLatestReceivedAt: d.backupsLast7DaysLatestReceivedAt ?? null,
    storageCriticalLast24hCount: d.storageCriticalLast24hCount ?? 0,
    storageCriticalLast7DaysCount: d.storageCriticalLast7DaysCount ?? 0,
    databaseIssuesLast7DaysCount: d.databaseIssuesLast7DaysCount ?? 0,
    databaseLastUnhealthyAt: null,
    crashesLast24hCount: d.crashesLast24hCount ?? 0,
    crashesLast24hFatalCount: d.crashesLast24hFatalCount ?? 0,
    crashesLastOccurredAt: null,
    crashesLastWasFatal: null,
    storageLastOccurredAt: d.latestCriticalStorageAt ?? null,
    storageLastLevel: d.latestCriticalStorageAt ? "critical" : null,
    latestCriticalStorageAt: d.latestCriticalStorageAt ?? null,
  };
}

/** Throws on non-2xx (e.g. **404** misconfiguration, **403** role/org). */
export async function fetchReliabilityHomeSummary(): Promise<ReliabilityHomeSummary> {
  const res = await api.get(endpoints.dashboardReliabilitySummary);
  return normalizeReliabilitySummaryPayload(res.data);
}

const DEFAULT_LIST_LIMIT = 20;

export async function fetchStaffBackupsPage(params?: {
  cursor?: string;
  from?: string;
  to?: string;
  userId?: string;
  deviceId?: string;
  limit?: number;
}): Promise<PaginatedReliabilityResult<StaffDeviceBackupRow>> {
  const res = await api.get(endpoints.staff.backups, {
    params: { ...params, limit: params?.limit ?? DEFAULT_LIST_LIMIT },
  });
  const { items, nextCursor } = unwrapList<unknown>(res.data);
  const rows = items.map(normalizeBackupRow).filter(Boolean) as StaffDeviceBackupRow[];
  return { items: rows, nextCursor };
}

export async function fetchStaffDeviceWarningsPage(params?: {
  cursor?: string;
  from?: string;
  to?: string;
  userId?: string;
  limit?: number;
}): Promise<PaginatedReliabilityResult<StaffDeviceStorageWarningRow>> {
  const res = await api.get(endpoints.staff.deviceWarnings, {
    params: { ...params, limit: params?.limit ?? DEFAULT_LIST_LIMIT },
  });
  const { items, nextCursor } = unwrapList<unknown>(res.data);
  const rows = items.map(normalizeStorageWarningRow).filter(Boolean) as StaffDeviceStorageWarningRow[];
  return { items: rows, nextCursor };
}

export async function fetchStaffDatabaseWarningsPage(params?: {
  cursor?: string;
  from?: string;
  to?: string;
  userId?: string;
  limit?: number;
}): Promise<PaginatedReliabilityResult<StaffDatabaseWarningRow>> {
  const res = await api.get(endpoints.staff.databaseWarnings, {
    params: { ...params, limit: params?.limit ?? DEFAULT_LIST_LIMIT },
  });
  const { items, nextCursor } = unwrapList<unknown>(res.data);
  const rows = items.map(normalizeDatabaseWarningRow).filter(Boolean) as StaffDatabaseWarningRow[];
  return { items: rows, nextCursor };
}

export async function fetchMobileCrashReportsPage(params?: {
  cursor?: string;
  from?: string;
  to?: string;
  userId?: string;
  fatalOnly?: boolean;
  errorType?: string;
  limit?: number;
}): Promise<PaginatedReliabilityResult<MobileCrashReportRow>> {
  try {
    const res = await api.get(endpoints.analyticsCrashes, {
      params: { ...params, limit: params?.limit ?? DEFAULT_LIST_LIMIT },
    });
    const { items, nextCursor } = unwrapList<unknown>(res.data);
    const rows = items.map(normalizeMobileCrashRow).filter(Boolean) as MobileCrashReportRow[];
    return { items: rows, nextCursor };
  } catch (e) {
    if (isLimitNotAllowedError(e)) {
      const { limit: _limit, ...rest } = params ?? {};
      const res = await api.get(endpoints.analyticsCrashes, { params: rest });
      const { items, nextCursor } = unwrapList<unknown>(res.data);
      const rows = items.map(normalizeMobileCrashRow).filter(Boolean) as MobileCrashReportRow[];
      return { items: rows, nextCursor };
    }
    throw e;
  }
}

/** Full crash row including `stack` (`GET /analytics/crashes/:id`). */
export async function fetchMobileCrashReportById(id: string): Promise<MobileCrashReportRow> {
  const res = await api.get(endpoints.analyticsCrashById(id));
  const row = normalizeMobileCrashRow(res.data);
  if (!row) throw new Error("Invalid crash detail payload");
  return { ...row, id: row.id ?? id };
}

/** Binary download in browser; throws on non-2xx. */
export async function downloadStaffBackupFile(backupId: string): Promise<void> {
  const res = await api.get<Blob>(endpoints.staff.backupById(backupId), {
    responseType: "blob",
  });
  const header = res.headers["content-disposition"] ?? res.headers["Content-Disposition"];
  const parsed = typeof header === "string" ? parseContentDispositionFilename(header) : null;
  const filename = parsed ?? `backup_${backupId}.db`;
  const blob = res.data;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Prefer dedicated summary; else optional legacy embed on dashboard summary; else zeros. */
export function mergeReliabilityForHome(
  dedicated: ReliabilityHomeSummary | null,
  summary: DashboardSummary | null,
): ReliabilityHomeSummary {
  if (dedicated != null) return dedicated;
  const emb = summary?.reliability;
  if (emb) return dashboardReliabilityToHome(emb);
  return blankReliabilityHomeSummary();
}

/** Reference for backend alignment (implemented on current Nest). */
export const STAFF_RELIABILITY_GET_ROUTES = [
  "GET /api/v1/dashboard/reliability-summary",
  "GET /api/v1/staff/backups?from=&to=&userId=&deviceId=&limit=&cursor=",
  "GET /api/v1/staff/device-warnings?from=&to=&userId=&limit=&cursor=",
  "GET /api/v1/staff/database-warnings?from=&to=&userId=&limit=&cursor=",
  "GET /api/v1/analytics/crashes?from=&to=&userId=&fatalOnly=&errorType=&limit=&cursor=",
  "GET /api/v1/analytics/crashes/:id (full row + stack)",
  "GET /api/v1/staff/backup/:id (download)",
  "GET /api/v1/analytics/performance?… (paginated)",
] as const;

/** @deprecated use STAFF_RELIABILITY_GET_ROUTES */
export const STAFF_RELIABILITY_REQUIRED_GET_ROUTES = STAFF_RELIABILITY_GET_ROUTES;
