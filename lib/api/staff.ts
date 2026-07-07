import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { toNumericAmount } from "@/lib/format";
import { normalizePhoneNumber } from "@/lib/phone";
import type {
  HubStaffMember,
  StaffActivityPage,
  StaffCredentialsPayload,
  StaffPerformanceRow,
} from "@/lib/types/staff";

function unwrapArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.data)) return o.data as T[];
    if (Array.isArray(o.items)) return o.items as T[];
    if (Array.isArray(o.results)) return o.results as T[];
    if (Array.isArray(o.staff)) return o.staff as T[];
    if (Array.isArray(o.users)) return o.users as T[];
  }
  return [];
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function parsePermissions(raw: unknown): Record<string, boolean> {
  const o = asRecord(raw);
  if (!o) return {};
  const out: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "boolean") out[k] = v;
    else if (v === "true" || v === "false") out[k] = v === "true";
  }
  return out;
}

function parseBranch(raw: unknown): { id: string; name: string } | null {
  const o = asRecord(raw);
  if (!o || !o.id) return null;
  return { id: String(o.id), name: String(o.name ?? "") };
}

/** Normalize GET /staff rows (flat or nested user + staffProfile). */
export function parseStaffMember(raw: Record<string, unknown>): HubStaffMember {
  const userBlock = asRecord(raw.user);
  const profileBlock = asRecord(raw.staffProfile ?? raw.profile);
  const u = userBlock ?? raw;
  const p = profileBlock ?? {};

  const userId = String(u.id ?? raw.userId ?? "");
  const id = userId || String(raw.id ?? "");

  const staffId = String(
    (p.staffId as string) ?? (raw.staffId as string) ?? "",
  );
  const profileId = p.id != null ? String(p.id) : null;

  const branchFrom = p.branch ?? raw.branch;
  const role = (u.role ?? raw.role ?? "STAFF") as HubStaffMember["role"];
  const isActive =
    typeof u.isActive === "boolean"
      ? u.isActive
      : typeof raw.isActive === "boolean"
        ? raw.isActive
        : true;

  const offsetRaw =
    p.lastDeviceTimeOffsetMinutes ??
    p.last_device_time_offset_minutes ??
    raw.lastDeviceTimeOffsetMinutes;
  const offset =
    offsetRaw != null && offsetRaw !== ""
      ? Number(offsetRaw)
      : undefined;

  const customDiscountRaw =
    p.customDiscountLimit ??
    p.custom_discount_limit ??
    raw.customDiscountLimit ??
    raw.custom_discount_limit;
  const customDiscountLimit =
    customDiscountRaw === null || customDiscountRaw === undefined
      ? null
      : Number(customDiscountRaw);

  return {
    id,
    email: String(u.email ?? raw.email ?? ""),
    firstName: (u.firstName as string | null | undefined) ?? null,
    lastName: (u.lastName as string | null | undefined) ?? null,
    phoneNumber:
      (u.phoneNumber as string | null | undefined) ??
      (raw.phoneNumber as string | null | undefined) ??
      null,
    role,
    isActive,
    staffId: staffId || "-",
    jobTitle:
      (p.jobTitle as string | null | undefined) ??
      (raw.jobTitle as string | null | undefined) ??
      null,
    staffProfileId: profileId,
    branchId:
      (p.branchId as string | null | undefined) ??
      (raw.branchId as string | null | undefined) ??
      null,
    branch: parseBranch(branchFrom),
    permissions: parsePermissions(p.permissions ?? raw.permissions),
    lastDeviceTimeWarningAt:
      (p.lastDeviceTimeWarningAt as string | null | undefined) ??
      (p.last_device_time_warning_at as string | null | undefined) ??
      null,
    lastDeviceTimeOffsetMinutes:
      Number.isFinite(offset) ? offset : undefined,
    lastDeviceTimeModel:
      (p.lastDeviceTimeModel as string | null | undefined) ??
      (p.last_device_time_model as string | null | undefined) ??
      null,
    deviceTimeWarningCount:
      p.deviceTimeWarningCount != null
        ? Number(p.deviceTimeWarningCount)
        : p.device_time_warning_count != null
          ? Number(p.device_time_warning_count)
          : undefined,
    customDiscountLimit:
      customDiscountRaw === null || customDiscountRaw === undefined
        ? null
        : Number.isFinite(customDiscountLimit)
          ? customDiscountLimit
          : null,
  };
}

export function parseCreateStaffResponse(data: unknown): StaffCredentialsPayload {
  const o = asRecord(data) ?? {};
  const staffId = String(o.staffId ?? o.staff_id ?? "");
  const otp = String(o.otp ?? o.oneTimePassword ?? "");
  const userRaw = asRecord(o.user);
  return {
    staffId,
    otp,
    member: userRaw ? parseStaffMember({ ...o, user: userRaw }) : undefined,
  };
}

export function parseResetPasswordResponse(data: unknown): StaffCredentialsPayload {
  return parseCreateStaffResponse(data);
}

export interface CreateStaffBody {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber: string;
  role: "STAFF" | "MANAGER";
  jobTitle?: string;
  branchId?: string | null;
}

export interface UpdateStaffBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  jobTitle?: string | null;
  branchId?: string | null;
  customDiscountLimit?: number | null;
}

function buildStaffPayload<T extends { phoneNumber?: string; email?: string }>(
  body: T,
): T {
  const next = { ...body };
  if (typeof next.phoneNumber === "string") {
    const normalized = normalizePhoneNumber(next.phoneNumber);
    if (normalized) next.phoneNumber = normalized;
    else next.phoneNumber = next.phoneNumber.trim();
  }
  if (typeof next.email === "string") {
    const trimmed = next.email.trim();
    if (trimmed) next.email = trimmed;
    else delete next.email;
  }
  return next;
}

export async function fetchStaffList(): Promise<HubStaffMember[]> {
  const res = await api.get(endpoints.staff.list);
  return unwrapArray<Record<string, unknown>>(res.data).map((row) =>
    parseStaffMember(row),
  );
}

/** Includes deactivated staff — for duplicate phone/email checks only. */
export async function fetchStaffListIncludingInactive(): Promise<HubStaffMember[]> {
  const res = await api.get(endpoints.staff.list, {
    params: { includeInactive: true },
  });
  return unwrapArray<Record<string, unknown>>(res.data).map((row) =>
    parseStaffMember(row),
  );
}

export async function fetchStaffById(id: string): Promise<HubStaffMember> {
  const res = await api.get(endpoints.staff.byId(id));
  const body = res.data as unknown;
  const o = asRecord(body);
  if (!o) return parseStaffMember({ id });
  if (o.user || o.staffProfile) return parseStaffMember(o);
  return parseStaffMember(o);
}

export async function createStaff(
  body: CreateStaffBody,
): Promise<StaffCredentialsPayload> {
  const res = await api.post(endpoints.staff.list, buildStaffPayload(body));
  return parseCreateStaffResponse(res.data);
}

export async function updateStaff(
  id: string,
  body: UpdateStaffBody,
): Promise<HubStaffMember> {
  const res = await api.patch(endpoints.staff.byId(id), buildStaffPayload(body));
  const o = asRecord(res.data);
  if (!o) return parseStaffMember({ id });
  if (o.user || o.staffProfile) return parseStaffMember(o);
  return parseStaffMember(o);
}

export async function deactivateStaff(id: string): Promise<void> {
  await api.delete(endpoints.staff.byId(id));
}

export async function resetStaffPassword(
  id: string,
): Promise<StaffCredentialsPayload> {
  const res = await api.post(endpoints.staff.resetPassword(id), {});
  return parseResetPasswordResponse(res.data);
}

export async function updateStaffRole(
  id: string,
  body: { role: string },
): Promise<HubStaffMember> {
  const res = await api.patch(endpoints.staff.role(id), body);
  const o = asRecord(res.data);
  if (!o) return parseStaffMember({ id });
  if (o.user || o.staffProfile) return parseStaffMember(o);
  return parseStaffMember(o);
}

export async function setStaffPermissions(
  id: string,
  permissions: Record<string, boolean>,
): Promise<HubStaffMember> {
  const res = await api.post(endpoints.staff.setPermissions(id), { permissions });
  const o = asRecord(res.data);
  if (!o) return parseStaffMember({ id });
  if (o.user || o.staffProfile) return parseStaffMember(o);
  return parseStaffMember(o);
}

function mapActivityRow(row: Record<string, unknown>) {
  return {
    id: row.id != null ? String(row.id) : undefined,
    action: String(row.action ?? row.type ?? row.eventType ?? "-"),
    createdAt: String(row.createdAt ?? row.timestamp ?? row.at ?? ""),
    metadata: asRecord(row.metadata) ?? asRecord(row.payload),
  };
}

export async function fetchStaffActivityLog(
  id: string,
  params: { page?: number; limit?: number } = {},
): Promise<StaffActivityPage> {
  const res = await api.get(endpoints.staff.activityLog(id), { params });
  const root = res.data as unknown;
  let list: Record<string, unknown>[] = [];
  if (Array.isArray(root)) {
    list = root as Record<string, unknown>[];
  } else if (root && typeof root === "object") {
    const body = root as Record<string, unknown>;
    list =
      unwrapArray<Record<string, unknown>>(body).length > 0
        ? unwrapArray(body)
        : Array.isArray(body.logs)
          ? (body.logs as Record<string, unknown>[])
          : Array.isArray(body.entries)
            ? (body.entries as Record<string, unknown>[])
            : [];
    const metaRaw = asRecord(body.meta);
    const meta =
      metaRaw && metaRaw.page != null
        ? {
            page: Number(metaRaw.page),
            limit: Number(metaRaw.limit),
            total: Number(metaRaw.total),
            totalPages: Number(metaRaw.totalPages),
          }
        : undefined;
    return { items: list.map(mapActivityRow), meta };
  }
  return { items: list.map(mapActivityRow), meta: undefined };
}

function isPerformanceRowLike(row: Record<string, unknown>): boolean {
  return (
    row.userId != null ||
    row.user_id != null ||
    row.staffId != null ||
    row.staff_id != null ||
    row.salesCount != null ||
    row.sales_count != null ||
    row.totalAmount != null ||
    row.total_amount != null
  );
}

/** Unwrap list payloads; tolerate a single metrics object from the API. */
function unwrapPerformanceRows(data: unknown): Record<string, unknown>[] {
  const fromArray = unwrapArray<Record<string, unknown>>(data);
  if (fromArray.length > 0) return fromArray;

  const o = asRecord(data);
  if (!o) return [];

  const nested = o.data ?? o.items ?? o.results ?? o.performance ?? o.staff;
  if (Array.isArray(nested)) return nested as Record<string, unknown>[];
  const nestedRecord = asRecord(nested);
  if (nestedRecord && isPerformanceRowLike(nestedRecord)) return [nestedRecord];

  if (isPerformanceRowLike(o)) return [o];
  return [];
}

function mapStaffPerformanceRow(row: Record<string, unknown>): StaffPerformanceRow {
  const userId = row.userId ?? row.user_id;
  const id = row.id ?? userId;

  return {
    id: id != null ? String(id) : undefined,
    staffName: (() => {
      const explicit = row.staffName ?? row.name;
      if (explicit) return String(explicit);
      const combined = [row.firstName, row.lastName].filter(Boolean).join(" ");
      if (combined) return combined;
      if (row.email) return String(row.email);
      return "-";
    })(),
    totalSales: toNumericAmount(
      (row.totalAmount ??
        row.total_amount ??
        row.totalSales ??
        row.salesTotal ??
        row.revenue) as string | number | null | undefined,
    ),
    transactionCount: toNumericAmount(
      (row.salesCount ??
        row.sales_count ??
        row.transactionCount ??
        row.transactions ??
        row.saleCount) as string | number | null | undefined,
    ),
    staffId:
      row.staffId != null
        ? String(row.staffId)
        : row.staff_id != null
          ? String(row.staff_id)
          : null,
    branchId:
      row.branchId != null
        ? String(row.branchId)
        : row.branch_id != null
          ? String(row.branch_id)
          : null,
    branchName:
      row.branchName != null
        ? String(row.branchName)
        : row.branch_name != null
          ? String(row.branch_name)
          : null,
  };
}

export async function fetchStaffPerformance(params?: {
  from?: string;
  to?: string;
}): Promise<StaffPerformanceRow[]> {
  const res = await api.get(endpoints.staff.performance, { params });
  return unwrapPerformanceRows(res.data).map(mapStaffPerformanceRow);
}
