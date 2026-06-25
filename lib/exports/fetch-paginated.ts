import { EXPORT_ROW_CAP } from "@/lib/exports/constants";

export type PaginatedFetchResult<T> = {
  rows: T[];
  truncated: boolean;
};

/**
 * Cursor-paginate until `nextCursor` is absent or `EXPORT_ROW_CAP` rows collected.
 */
export async function fetchAllWithCursor<T>({
  fetchPage,
  maxRows = EXPORT_ROW_CAP,
}: {
  fetchPage: (cursor?: string) => Promise<{ items: T[]; nextCursor?: string | null }>;
  maxRows?: number;
}): Promise<PaginatedFetchResult<T>> {
  const rows: T[] = [];
  let cursor: string | undefined;
  let truncated = false;

  do {
    const page = await fetchPage(cursor);
    for (const item of page.items) {
      if (rows.length >= maxRows) {
        truncated = true;
        break;
      }
      rows.push(item);
    }
    if (truncated) break;
    cursor = page.nextCursor?.trim() ? page.nextCursor : undefined;
  } while (cursor);

  return { rows, truncated };
}
