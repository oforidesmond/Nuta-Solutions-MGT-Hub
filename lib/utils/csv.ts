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

type CsvColumnSpec = string | { key: string; header: string };

function normalizeColumns(columns: CsvColumnSpec[]): { key: string; header: string }[] {
  return columns.map((c) =>
    typeof c === "string" ? { key: c, header: c } : c,
  );
}

/** Build CSV text from homogeneous row objects using provided column order (keys or key+header). */
export function rowsToCsv(rows: Record<string, unknown>[], columns: CsvColumnSpec[]): string {
  const specs = normalizeColumns(columns);
  const keys = specs.map((s) => s.key);
  const header = specs.map((s) => escapeCell(s.header)).join(",");
  const lines = rows.map((row) =>
    keys.map((c) => escapeCell(row[c])).join(","),
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
