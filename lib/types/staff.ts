import type { UserRole } from "@/lib/types/domain";

/** Staff list/detail DTO - aligned with User + StaffProfile in schema.prisma. */
export interface HubStaffMember {
  /** Use for `PATCH /staff/:id` and related routes (typically User.id). */
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  role: UserRole;
  isActive: boolean;
  /** Human-readable StaffProfile.staffId (e.g. STF-001). */
  staffId: string;
  jobTitle?: string | null;
  staffProfileId?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string } | null;
  /** StaffProfile.permissions JSON as string-keyed flags. */
  permissions: Record<string, boolean>;
  /** Phase 2 - device time warning (from StaffProfile / GET staff detail). */
  lastDeviceTimeWarningAt?: string | null;
  lastDeviceTimeOffsetMinutes?: number | null;
  lastDeviceTimeModel?: string | null;
  deviceTimeWarningCount?: number | null;
}

export interface StaffCredentialsPayload {
  staffId: string;
  otp: string;
  /** Optional parsed row when API includes the created user. */
  member?: HubStaffMember;
}

export interface StaffActivityEntry {
  id?: string;
  action: string;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface StaffActivityPage {
  items: StaffActivityEntry[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
}

export interface StaffPerformanceRow {
  id?: string;
  staffName: string;
  totalSales: number;
  transactionCount: number;
  staffId?: string | null;
}

/** @deprecated Use `HubBranch` from `@/lib/types/branches`. */
export type HubBranchOption = import("@/lib/types/branches").HubBranch;
