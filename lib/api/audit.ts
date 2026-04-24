import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type { AuditEventsParams, AuditEventsResponse } from "@/lib/types/audit";

function unwrap(raw: unknown): AuditEventsResponse {
  if (!raw || typeof raw !== "object") return { items: [], nextCursor: null };
  const o = raw as Record<string, unknown>;
  const list = o.items ?? o.data ?? o.events ?? o.results;
  if (!Array.isArray(list)) return { items: [], nextCursor: null };
  const next =
    (o.nextCursor as string | undefined) ??
    (o.next_cursor as string | undefined) ??
    (o.cursor as string | undefined) ??
    null;
  return {
    items: list.filter((x) => x && typeof x === "object") as Record<string, unknown>[],
    nextCursor: next,
  };
}

export async function fetchAuditEventsPage(params: AuditEventsParams = {}): Promise<AuditEventsResponse> {
  const res = await api.get(endpoints.auditEvents, {
    params: {
      cursor: params.cursor,
      limit: params.limit ?? 30,
    },
  });
  return unwrap(res.data);
}
