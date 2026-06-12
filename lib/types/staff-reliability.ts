/** Phase 3 - staff device reliability (Nest DTOs; camelCase with snake_case fallbacks in normalizers). */

export type StaffBackupStorageProvider = "s3" | "local" | string;

/** Nested on backup / crash list rows when the relation exists. */
export interface ReliabilityNestedUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}

export interface StaffDeviceBackupRow {
  id: string;
  userId: string;
  /** Client stable id from the device - not necessarily server `Device` UUID. */
  deviceId: string;
  appVersion: string;
  buildNumber?: string | null;
  /** Client-reported backup creation time */
  createdAtClient?: string | null;
  byteSize?: number | string | null;
  originalFilename?: string | null;
  receivedAt?: string | null;
  expiresAt?: string | null;
  storageProvider?: StaffBackupStorageProvider | null;
  user?: ReliabilityNestedUser | null;
}

export interface StaffDeviceStorageWarningRow {
  id?: string;
  userId: string;
  user?: ReliabilityNestedUser | null;
  type?: string | null;
  freeSpaceMb?: number | string | null;
  thresholdMb?: number | string | null;
  level: "critical" | "warning" | string;
  createdAt?: string | null;
}

export interface StaffDatabaseWarningRow {
  id?: string;
  userId: string;
  user?: ReliabilityNestedUser | null;
  healthy: boolean;
  errors: string[];
  createdAt?: string | null;
}

export type MobileCrashErrorType = "javascript" | "unhandled_rejection" | string | null;

export interface MobileCrashReportRow {
  id?: string;
  userId?: string | null;
  error: string;
  /** Omitted on list `GET /analytics/crashes`; present on `GET /analytics/crashes/:id`. */
  stack?: string | null;
  isFatal: boolean;
  errorType?: MobileCrashErrorType;
  clientOccurredAt?: string | null;
  deviceInfo?: Record<string, unknown> | null;
  createdAt?: string | null;
  user?: ReliabilityNestedUser | null;
}

/** Normalized dashboard Operations widgets (from `GET /dashboard/reliability-summary`). */
export interface ReliabilityHomeSummary {
  backupsLast7DaysCount: number;
  backupsLast7DaysLatestReceivedAt: string | null;
  storageCriticalLast24hCount: number;
  /** Legacy / embedded summary only; API §7.1 does not expose 7d storage bucket. */
  storageCriticalLast7DaysCount: number;
  databaseIssuesLast7DaysCount: number;
  databaseLastUnhealthyAt: string | null;
  crashesLast24hCount: number;
  crashesLast24hFatalCount: number;
  crashesLastOccurredAt: string | null;
  crashesLastWasFatal: boolean | null;
  storageLastOccurredAt: string | null;
  storageLastLevel: "critical" | "warning" | null;
  /** When `storageLastLevel` is `critical`, mirrors `storageLastOccurredAt` for home banner. */
  latestCriticalStorageAt: string | null;
}

export interface PaginatedReliabilityResult<T> {
  items: T[];
  nextCursor: string | null;
}
