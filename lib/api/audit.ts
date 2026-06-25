import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { arrayQueryParamsSerializer, cleanQueryParams } from "@/lib/api/query-params";
import type { AuditActor, AuditEventRow, AuditEventsParams, AuditEventsResponse } from "@/lib/types/audit";

function normalizeActor(raw: unknown): AuditActor | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = o.id != null ? String(o.id) : "";
  const name = o.name != null ? String(o.name) : "";
  if (!id && !name) return null;
  return { id, name: name || id };
}

function normalizeAuditRow(raw: unknown): AuditEventRow {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const branchRaw = r.branch;
  const branchName =
    r.branchName != null
      ? String(r.branchName)
      : branchRaw && typeof branchRaw === "object"
        ? String((branchRaw as Record<string, unknown>).name ?? "")
        : undefined;

  return {
    ...r,
    id: r.id != null ? String(r.id) : undefined,
    eventType: r.eventType != null ? String(r.eventType) : undefined,
    aggregateType: r.aggregateType != null ? String(r.aggregateType) : undefined,
    aggregateId: r.aggregateId != null ? String(r.aggregateId) : undefined,
    userId: r.userId != null ? String(r.userId) : undefined,
    branchId: r.branchId != null ? String(r.branchId) : undefined,
    branchName: branchName || undefined,
    createdAt: r.createdAt != null ? String(r.createdAt) : undefined,
    occurredAt: r.occurredAt != null ? String(r.occurredAt) : undefined,
    actor: normalizeActor(r.actor),
    payload:
      r.payload && typeof r.payload === "object"
        ? (r.payload as Record<string, unknown>)
        : undefined,
  };
}

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
    items: list.map(normalizeAuditRow),
    nextCursor: next,
  };
}

export async function fetchAuditEventsPage(params: AuditEventsParams = {}): Promise<AuditEventsResponse> {
  const res = await api.get(endpoints.auditEvents, {
    params: cleanQueryParams({
      cursor: params.cursor,
      limit: params.limit ?? 30,
      productId: params.productId,
      userId: params.userId,
      branchId: params.branchId,
      eventType: params.eventType,
      aggregateType: params.aggregateType,
      startDate: params.startDate,
      endDate: params.endDate,
    }),
    paramsSerializer: arrayQueryParamsSerializer,
  });
  return unwrap(res.data);
}
