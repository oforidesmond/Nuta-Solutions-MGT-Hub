import type { AxiosRequestConfig } from "axios";

/**
 * Serializes arrays as repeated query keys (`?categories=SALE&categories=RETURN`).
 * Matches NestJS array query param convention used across the API.
 */
export const arrayQueryParamsSerializer: NonNullable<
  AxiosRequestConfig["paramsSerializer"]
> = {
  indexes: null,
};

export function cleanQueryParams(
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!params) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
