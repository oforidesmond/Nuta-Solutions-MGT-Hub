import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { HubAnalyticsCrashRow, HubAnalyticsPerformanceRow } from "@/lib/types/phase2";
import axios from "axios";

function unwrapPerformance(raw: unknown): HubAnalyticsPerformanceRow[] {
  if (Array.isArray(raw)) return raw as HubAnalyticsPerformanceRow[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.data ?? o.items ?? o.rows;
    if (Array.isArray(list)) return list as HubAnalyticsPerformanceRow[];
  }
  return [];
}

function unwrapCrashes(raw: unknown): HubAnalyticsCrashRow[] {
  if (Array.isArray(raw)) return raw as HubAnalyticsCrashRow[];
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const list = o.data ?? o.items ?? o.crashes;
    if (Array.isArray(list)) return list as HubAnalyticsCrashRow[];
  }
  return [];
}

/** Hub read endpoints — may 404 until backend exposes aggregates. */
export async function fetchAnalyticsPerformance(): Promise<HubAnalyticsPerformanceRow[] | null> {
  try {
    const res = await api.get(endpoints.analyticsPerformance);
    return unwrapPerformance(res.data);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

export async function fetchAnalyticsCrashes(): Promise<HubAnalyticsCrashRow[] | null> {
  try {
    const res = await api.get(endpoints.analyticsCrash);
    return unwrapCrashes(res.data);
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}
