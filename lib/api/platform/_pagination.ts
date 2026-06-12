import type { AxiosRequestConfig } from "axios";
import { api } from "@/lib/api/client";
import type { PageMeta } from "@/lib/types/domain";
import type { PaginatedResponse } from "@/lib/types/platform";

/**
 * Strips undefined values and serializes arrays as repeated query keys
 * (`?planType=PRO&planType=TRIAL`) - the contract documented in
 * `SUPER_ADMIN_API.md` for `planType[]`, `planStatus[]`, `eventType[]`,
 * `role[]`, `status[]`, and `type[]` filters.
 */
const platformParamsSerializer: NonNullable<AxiosRequestConfig["paramsSerializer"]> = {
  indexes: null,
};

function cleanParams(params?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function platformGet<T>(
  url: string,
  params?: Record<string, unknown>,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.get<T>(url, {
    ...config,
    params: cleanParams(params),
    paramsSerializer: platformParamsSerializer,
  });
  return res.data;
}

export async function platformPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.post<T>(url, body, config);
  return res.data;
}

export async function platformPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.patch<T>(url, body, config);
  return res.data;
}

export async function platformDelete<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const res = await api.delete<T>(url, { ...config, data: body });
  return res.data;
}

/**
 * Backend platform list endpoints return `{ data, meta }` per the
 * SUPER_ADMIN_API.md contract. This helper normalizes any minor envelope
 * drift defensively (mirrors the pattern in `lib/api/inventory-logs.ts`).
 */
export function unwrapPaginated<T>(raw: unknown): PaginatedResponse<T> {
  if (Array.isArray(raw)) {
    return {
      data: raw as T[],
      meta: { page: 1, limit: raw.length || 20, total: raw.length, totalPages: 1 },
    };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const rows = (Array.isArray(o.data) ? o.data : Array.isArray(o.items) ? o.items : []) as T[];
    const metaSource =
      (o.meta && typeof o.meta === "object" ? (o.meta as Record<string, unknown>) : null) ?? o;
    const meta = parseMeta(metaSource, rows.length);
    return { data: rows, meta };
  }
  return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
}

function parseMeta(meta: Record<string, unknown>, dataLen: number): PageMeta {
  const page = Number(meta.page ?? 1) || 1;
  const limit = Number(meta.limit ?? (dataLen || 20)) || 20;
  const total = Number(meta.total ?? meta.totalCount ?? dataLen) || 0;
  const totalPages =
    Number(meta.totalPages ?? meta.total_pages) ||
    (limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1);
  return { page, limit, total, totalPages };
}

