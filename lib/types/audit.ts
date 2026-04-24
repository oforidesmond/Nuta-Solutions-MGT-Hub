export interface AuditEventsParams {
  cursor?: string;
  limit?: number;
}

export interface AuditEventsResponse {
  items: Record<string, unknown>[];
  nextCursor: string | null;
}
