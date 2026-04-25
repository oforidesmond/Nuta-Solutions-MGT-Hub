import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { normalizeMobileCrashRow } from "@/lib/api/staff-reliability";
import type { HubAnalyticsCrashRow, HubAnalyticsPerformanceRow } from "@/lib/types/phase2";
import type { MobileCrashReportRow } from "@/lib/types/staff-reliability";
import axios from "axios";

const DEFAULT_PAGE_LIMIT = 50;

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v;
  return null;
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unwrapItems<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.items ?? o.data ?? o.rows ?? o.results ?? o.crashes;
    if (Array.isArray(list)) return list as T[];
  }
  return [];
}

function unwrapCursor(raw: unknown): string | null {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const next = o.nextCursor ?? o.next_cursor;
    return typeof next === "string" && next.trim() ? next : null;
  }
  return null;
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

function normalizePerformanceRow(raw: unknown): HubAnalyticsPerformanceRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const deviceModel =
    str(o.deviceModel ?? o.device_model) ??
    str(typeof o.deviceInfo === "object" && o.deviceInfo ? (o.deviceInfo as { model?: string }).model : null);
  const metric = str(o.metric ?? o.metricName ?? o.metric_name);
  const avg =
    num(o.avgDurationMs ?? o.avg_duration_ms) ??
    num(o.durationMs ?? o.duration_ms) ??
    num(o.averageDurationMs);
  const samples = num(o.sampleCount ?? o.sample_count);
  if (!deviceModel && !metric && avg == null) return null;
  return {
    deviceModel,
    metric,
    avgDurationMs: avg,
    sampleCount: samples,
  };
}

function crashRowToHubRow(row: MobileCrashReportRow | null): HubAnalyticsCrashRow | null {
  if (!row) return null;
  const model =
    row.deviceInfo && typeof row.deviceInfo.model === "string"
      ? row.deviceInfo.model
      : typeof row.deviceInfo?.device_model === "string"
        ? (row.deviceInfo.device_model as string)
        : null;
  return {
    id: row.id,
    error: row.error,
    deviceModel: model,
    createdAt: row.clientOccurredAt ?? row.createdAt ?? null,
    isFatal: row.isFatal,
  };
}

/** Paginated `GET /analytics/performance` (limit default 20 on API; we request a larger first page for Reports). */
export async function fetchAnalyticsPerformance(params?: {
  from?: string;
  to?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<HubAnalyticsPerformanceRow[] | null> {
  try {
    const res = await api.get(endpoints.analyticsPerformance, {
      params: { ...params, limit: params?.limit ?? DEFAULT_PAGE_LIMIT },
    });
    const items = unwrapItems<unknown>(res.data);
    const rows = items.map(normalizePerformanceRow).filter(Boolean) as HubAnalyticsPerformanceRow[];
    return rows.length ? rows : [];
  } catch (e) {
    if (isLimitNotAllowedError(e)) {
      const { limit: _limit, ...rest } = params ?? {};
      const res = await api.get(endpoints.analyticsPerformance, { params: rest });
      const items = unwrapItems<unknown>(res.data);
      const rows = items.map(normalizePerformanceRow).filter(Boolean) as HubAnalyticsPerformanceRow[];
      return rows.length ? rows : [];
    }
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function fetchAnalyticsPerformancePage(params?: {
  from?: string;
  to?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: HubAnalyticsPerformanceRow[]; nextCursor: string | null } | null> {
  try {
    const res = await api.get(endpoints.analyticsPerformance, {
      params: { ...params, limit: params?.limit ?? DEFAULT_PAGE_LIMIT },
    });
    const items = unwrapItems<unknown>(res.data);
    const nextCursor = unwrapCursor(res.data);
    const rows = items.map(normalizePerformanceRow).filter(Boolean) as HubAnalyticsPerformanceRow[];
    return { items: rows, nextCursor };
  } catch (e) {
    if (isLimitNotAllowedError(e)) {
      const { limit: _limit, ...rest } = params ?? {};
      const res = await api.get(endpoints.analyticsPerformance, { params: rest });
      const items = unwrapItems<unknown>(res.data);
      const nextCursor = unwrapCursor(res.data);
      const rows = items.map(normalizePerformanceRow).filter(Boolean) as HubAnalyticsPerformanceRow[];
      return { items: rows, nextCursor };
    }
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** `GET /analytics/crashes` list (no stack); maps into compact hub rows for Reports. */
export async function fetchAnalyticsCrashes(params?: {
  from?: string;
  to?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<HubAnalyticsCrashRow[] | null> {
  try {
    const res = await api.get(endpoints.analyticsCrashes, {
      params: { ...params, limit: params?.limit ?? DEFAULT_PAGE_LIMIT },
    });
    const items = unwrapItems<unknown>(res.data);
    const rows = items
      .map((raw) => crashRowToHubRow(normalizeMobileCrashRow(raw)))
      .filter(Boolean) as HubAnalyticsCrashRow[];
    return rows.length ? rows : [];
  } catch (e) {
    if (isLimitNotAllowedError(e)) {
      const { limit: _limit, ...rest } = params ?? {};
      const res = await api.get(endpoints.analyticsCrashes, { params: rest });
      const items = unwrapItems<unknown>(res.data);
      const rows = items
        .map((raw) => crashRowToHubRow(normalizeMobileCrashRow(raw)))
        .filter(Boolean) as HubAnalyticsCrashRow[];
      return rows.length ? rows : [];
    }
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function fetchAnalyticsCrashesPage(params?: {
  from?: string;
  to?: string;
  userId?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: HubAnalyticsCrashRow[]; nextCursor: string | null } | null> {
  try {
    const res = await api.get(endpoints.analyticsCrashes, {
      params: { ...params, limit: params?.limit ?? DEFAULT_PAGE_LIMIT },
    });
    const items = unwrapItems<unknown>(res.data);
    const nextCursor = unwrapCursor(res.data);
    const rows = items
      .map((raw) => crashRowToHubRow(normalizeMobileCrashRow(raw)))
      .filter(Boolean) as HubAnalyticsCrashRow[];
    return { items: rows, nextCursor };
  } catch (e) {
    if (isLimitNotAllowedError(e)) {
      const { limit: _limit, ...rest } = params ?? {};
      const res = await api.get(endpoints.analyticsCrashes, { params: rest });
      const items = unwrapItems<unknown>(res.data);
      const nextCursor = unwrapCursor(res.data);
      const rows = items
        .map((raw) => crashRowToHubRow(normalizeMobileCrashRow(raw)))
        .filter(Boolean) as HubAnalyticsCrashRow[];
      return { items: rows, nextCursor };
    }
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}
