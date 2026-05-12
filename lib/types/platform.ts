import type { PageMeta, UserRole } from "@/lib/types/domain";

/* ──────────────────────────────────────────────────────────────────────
 * Shared enums (mirror Prisma enums on the backend).
 * ──────────────────────────────────────────────────────────────────── */

export type PlanType = "FREE" | "TRIAL" | "PRO" | "ENTERPRISE";

export type PlanStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "TRIAL_EXPIRED"
  | "PAYMENT_OVERDUE";

export type DeviceStatus = "ACTIVE" | "SUSPENDED" | "REVOKED";

export type PlatformNotificationType =
  | "SYSTEM_ALERT"
  | "INFO"
  | "WARNING"
  | "ERROR"
  | string;

/* ──────────────────────────────────────────────────────────────────────
 * Generic envelope for paginated platform responses.
 * ──────────────────────────────────────────────────────────────────── */

export interface PaginatedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

/* ──────────────────────────────────────────────────────────────────────
 * Organizations
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformOrganizationCounts {
  users: number;
  products: number;
  sales: number;
  devices: number;
}

export interface PlatformOrganization {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  businessType?: string | null;
  businessLocation?: string | null;
  currency?: string | null;
  planType: PlanType;
  planStatus: PlanStatus;
  salesCount: number;
  salesLimit: number | null;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  isActive?: boolean;
  taxEnabled?: boolean;
  defaultTaxRate?: string | number | null;
  expiryAlertEnabled?: boolean;
  expiryReminderMonths?: number | null;
  maxStaffDiscountPercent?: string | number | null;
  maxStaffDiscountAmount?: string | number | null;
  createdAt: string;
  updatedAt?: string | null;
  counts: PlatformOrganizationCounts;
}

export interface PlatformOrgStats {
  totalUsers: number;
  activeUsers: number;
  totalProducts: number;
  totalSales: number;
  totalRevenue: string | number;
  activeSales: number;
  activeDevices: number;
  suspendedDevices: number;
  revokedDevices: number;
  lastActivity: string | null;
}

export interface PlatformOrgPlanSummary {
  type: PlanType;
  status: PlanStatus;
  salesCount: number;
  salesLimit: number | null;
  trialStartDate: string | null;
  trialEndDate: string | null;
  daysRemaining: number | null;
}

export interface PlatformOrgDetails {
  organization: PlatformOrganization;
  stats: PlatformOrgStats;
  plan: PlatformOrgPlanSummary;
}

export interface OrganizationListParams {
  page?: number;
  limit?: number;
  search?: string;
  planType?: PlanType[];
  planStatus?: PlanStatus[];
  sortBy?: "name" | "createdAt" | "salesCount" | "trialEndDate";
  sortOrder?: "asc" | "desc";
}

export interface UpdateOrganizationPlanDto {
  planType?: PlanType;
  planStatus?: PlanStatus;
  salesLimit?: number | null;
  trialEndDate?: string | null;
  reason: string;
}

export interface SuspendOrganizationDto {
  reason: string;
  notifyOwner?: boolean;
}

export interface UnsuspendOrganizationDto {
  reason: string;
  planStatus?: PlanStatus;
}

export interface DeleteOrganizationDto {
  reason: string;
  confirmDelete: true;
}

export interface OrganizationActivityParams {
  eventType?: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/* ──────────────────────────────────────────────────────────────────────
 * Users
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformUserOrgSlim {
  id: string;
  name: string;
  planType?: PlanType;
  planStatus?: PlanStatus;
  currency?: string | null;
}

export interface PlatformUserStaffProfile {
  pin?: string | null;
  permissions?: Record<string, unknown> | null;
}

export interface PlatformUser {
  id: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  organizationId?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  organization?: PlatformUserOrgSlim | null;
  staffProfile?: PlatformUserStaffProfile | null;
}

export interface PlatformUserActivity {
  lastLogin: string | null;
  salesCount: number;
  devicesCount: number;
  recentSales: Array<{
    id: string;
    totalAmount: string | number;
    soldAt?: string | null;
    receiptNumber?: string | null;
  }>;
}

export interface PlatformUserDetails {
  user: PlatformUser;
  organization: PlatformUserOrgSlim | null;
  activity: PlatformUserActivity;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole[];
  organizationId?: string;
  isActive?: boolean;
}

export interface DeactivateUserDto {
  reason: string;
}

export interface ResetUserPasswordDto {
  reason: string;
  notifyUser?: boolean;
}

export interface ResetUserPasswordResponse {
  success: true;
  /** Returned only when `notifyUser=false` so an operator can hand it off OOB. */
  temporaryPassword?: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * Devices
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformDevice {
  id: string;
  deviceUuid: string;
  deviceName?: string | null;
  deviceModel?: string | null;
  deviceOs?: string | null;
  fingerprintHash?: string | null;
  status: DeviceStatus;
  organizationId: string;
  userId?: string | null;
  lastSeenAt?: string | null;
  registeredAt?: string | null;
  revokedAt?: string | null;
  revokedReason?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  organization?: PlatformUserOrgSlim | null;
  user?: Pick<PlatformUser, "id" | "firstName" | "lastName" | "email"> | null;
}

export interface PlatformDeviceActivity {
  salesCount: number;
  backupsCount: number;
  crashesCount: number;
  recentSales: Array<{
    id: string;
    totalAmount: string | number;
    soldAt?: string | null;
    receiptNumber?: string | null;
  }>;
}

export interface PlatformDeviceDetails {
  device: PlatformDevice;
  activity: PlatformDeviceActivity;
}

export interface DeviceListParams {
  page?: number;
  limit?: number;
  organizationId?: string;
  userId?: string;
  status?: DeviceStatus[];
  search?: string;
}

export interface RevokeDeviceDto {
  reason: string;
}

export interface SuspendDeviceDto {
  reason: string;
}

export interface UnsuspendDeviceDto {
  reason: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * Dashboard
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformDashboardData {
  organizations: {
    total: number;
    active: number;
    suspended: number;
    trialExpired: number;
    byPlan: Partial<Record<PlanType, number>>;
  };
  users: {
    total: number;
    active: number;
    byRole: Partial<Record<UserRole, number>>;
  };
  devices: {
    total: number;
    active: number;
    suspended: number;
    revoked: number;
  };
  sales: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    totalRevenue: string | number;
  };
  growth: {
    newOrgsThisWeek: number;
    newOrgsThisMonth: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  };
  health: {
    crashReportsLast24h: number;
    performanceIssues: number;
    storageWarnings: number;
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Analytics
 * ──────────────────────────────────────────────────────────────────── */

export interface GrowthAnalyticsParams {
  startDate: string;
  endDate: string;
  groupBy?: "day" | "week" | "month";
}

export interface GrowthTimelinePoint {
  date: string;
  newOrganizations: number;
  newUsers: number;
  newDevices: number;
  totalSales: number;
  totalRevenue: string | number;
}

export interface GrowthAnalytics {
  timeline: GrowthTimelinePoint[];
}

export interface PlanDistributionEntry {
  planType: PlanType;
  count: number;
  percentage: number;
}

export interface PlanTransition {
  fromPlan: PlanType;
  toPlan: PlanType;
  count: number;
  lastMonth: number;
}

export interface PlanDistribution {
  distribution: PlanDistributionEntry[];
  transitions: PlanTransition[];
  trialConversion: {
    totalTrials: number;
    converted: number;
    expired: number;
    conversionRate: number;
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * Telemetry
 * ──────────────────────────────────────────────────────────────────── */

export interface CrashReportsParams {
  organizationId?: string;
  userId?: string;
  isFatal?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface MobileCrashReport {
  id: string;
  error: string;
  stack?: string | null;
  isFatal: boolean;
  appVersion?: string | null;
  deviceInfo?: {
    model?: string | null;
    os?: string | null;
    osVersion?: string | null;
  } | null;
  createdAt: string;
  organization: { id: string; name: string };
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

export interface CrashReportsSummary {
  totalCrashes: number;
  fatalCrashes: number;
  affectedOrganizations: number;
  affectedUsers: number;
  topErrors: Array<{ error: string; count: number }>;
}

export interface CrashReportsResponse {
  data: MobileCrashReport[];
  meta: PageMeta;
  summary: CrashReportsSummary;
}

export interface PerformanceMetricsParams {
  organizationId?: string;
  metric?: string;
  startDate?: string;
  endDate?: string;
}

export interface PerformanceMetricRow {
  metric: string;
  count: number;
  avgDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
}

export interface SlowOperation {
  id: string;
  metric: string;
  durationMs: number;
  organizationId?: string | null;
  createdAt: string;
}

export interface PerformanceMetricsResponse {
  metrics: PerformanceMetricRow[];
  slowestOperations: SlowOperation[];
}

export interface DeviceHealthResponse {
  storage: {
    totalWarnings: number;
    criticalWarnings: number;
    devicesBelowThreshold: number;
  };
  database: {
    unhealthyDevices: number;
    totalErrors: number;
  };
  backups: {
    devicesWithBackups: number;
    devicesWithoutBackups: number;
    averageBackupAgeMs: number;
  };
}

export type PlatformSyncFailureStatus =
  | "OPEN"
  | "RESOLVED_RETRY"
  | "ARCHIVED"
  | "APPLIED";

export type PlatformSyncFailureResolutionAction =
  | "RETRY"
  | "IGNORE_CLEAR"
  | "FIX_AND_APPLY";

export type PlatformSyncFailureEntityType = "SALE" | string;

export interface PlatformSyncFailureListParams {
  organizationId: string;
  status?: PlatformSyncFailureStatus;
  errorCode?: string;
  entityType?: PlatformSyncFailureEntityType;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface PlatformSyncFailureRequestSummaryItem {
  id?: string | null;
  productId?: string | null;
  productName?: string | null;
  productSku?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  lineTotal?: string | number | null;
  [key: string]: JsonValue | undefined;
}

export interface PlatformSyncFailureRequestSummary {
  receiptNumber?: string | null;
  receiptNumberMobile?: string | null;
  totalAmount?: string | number | null;
  subtotal?: string | number | null;
  soldAt?: string | null;
  paymentMethod?: string | null;
  items?: PlatformSyncFailureRequestSummaryItem[] | null;
  [key: string]: JsonValue | undefined;
}

export interface PlatformSyncFailurePersonRef {
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  role?: UserRole;
}

export interface PlatformSyncFailureDeviceRef {
  id?: string | null;
  deviceUuid?: string | null;
  deviceName?: string | null;
  deviceModel?: string | null;
  deviceOs?: string | null;
}

export interface PlatformSyncFailureOrganizationRef {
  id: string;
  name: string;
  email?: string | null;
  currency?: string | null;
}

export interface PlatformSyncFailure {
  id: string;
  organizationId: string;
  staffUserId: string;
  deviceId?: string | null;
  entityType: PlatformSyncFailureEntityType;
  entityId: string;
  endpoint?: string | null;
  requestPayload?: JsonValue;
  requestSummary?: PlatformSyncFailureRequestSummary | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  httpStatusCode?: number | null;
  status: PlatformSyncFailureStatus;
  resolutionAction?: PlatformSyncFailureResolutionAction | null;
  resolutionNotes?: string | null;
  resolvedByAdminUser?: PlatformSyncFailurePersonRef | null;
  resolvedAt?: string | null;
  appliedSaleId?: string | null;
  createdAt: string;
  organization?: PlatformSyncFailureOrganizationRef | null;
  staffUser?: PlatformSyncFailurePersonRef | null;
  user?: PlatformSyncFailurePersonRef | null;
  device?: PlatformSyncFailureDeviceRef | null;
}

export type PlatformSyncFailureDetail = PlatformSyncFailure;

export interface ResolvePlatformSyncFailureDto {
  action: PlatformSyncFailureResolutionAction;
  notes?: string;
  patchedPayload?: JsonObject;
}

/* ──────────────────────────────────────────────────────────────────────
 * Audit
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformAuditEvent {
  id: string;
  eventType: string;
  aggregateType?: string | null;
  aggregateId?: string | null;
  userId?: string | null;
  organizationId?: string | null;
  payload?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  organization?: { id: string; name: string } | null;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface AuditEventsParams {
  organizationId?: string;
  userId?: string;
  eventType?: string[];
  aggregateType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/* ──────────────────────────────────────────────────────────────────────
 * Notifications
 * ──────────────────────────────────────────────────────────────────── */

export interface PlatformNotification {
  id: string;
  type: PlatformNotificationType;
  title: string;
  message: string;
  organizationId?: string | null;
  userId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  organization?: { id: string; name: string } | null;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  organizationId?: string;
  type?: PlatformNotificationType[];
  isRead?: boolean;
}

export interface BroadcastNotificationDto {
  title: string;
  message: string;
  type?: PlatformNotificationType;
  targetOrganizations?: string[];
  targetRoles?: UserRole[];
}

export interface BroadcastNotificationResponse {
  success: true;
  notificationsSent: number;
  recipientCount: number;
}
