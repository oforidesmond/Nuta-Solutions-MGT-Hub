/** Escape RFC 4180–style CSV cell. */
function escapeCell(val: unknown): string {
  const s =
    typeof val === "string"
      ? val
      : val === undefined || val === null
        ? ""
        : String(val);
  if (/[\r\n,"]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build CSV text from homogeneous row objects using provided column order (keys). */
export function rowsToCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(escapeCell).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCell(row[c])).join(","),
  );
  return [header, ...lines].join("\r\n");
}

export function downloadTextFile(contents: string, filename: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([`\uFEFF${contents}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
