/**
 * User-facing copy for stock-variance sales (sell-anyway).
 * APIs, types, routes, and query keys still use "variance" internally.
 */
export const FORCED_SALES_UI = {
  sectionAria7d: "Forced sales (last 7 days)",
  cardTitle7d: "Forced sales (7d)",
  feedUnavailable: "Forced sales feed unavailable. Open Sales to retry.",
  loadingCount: "Loading forced sales count…",
  noneIn7d: "No forced sales in the last 7 days",
  hasSellAnywayLine: "Sales with at least one sell-anyway line",
  onlyFilter: "Forced sales only",
  onlyFilterHint: "Show sell-anyway transactions only",
  refineSection: "Refine",
  reasonFilter: "Forced sale reason",
  reasonShort: "Reason",
  tableColumn: "Forced sale",
  badge: "Forced sale",
  summaryTitle: "Forced sales summary",
  noOnSale: "No forced sales on this sale.",
  recordedAsForced: (count: number, total: number) =>
    `${count} of ${total} ${total === 1 ? "line" : "lines"} recorded as forced sales.`,
  lineItemsNote:
    "Forced sale fields are read-only and reflect the staff sell-anyway record.",
  tooltip: "Forced sale",
  tooltipWithLines: (lineCount: number) =>
    `Forced sale · ${lineCount} ${lineCount === 1 ? "line" : "lines"}`,
  exportTooltip:
    "Uses the same date, staff, branch, and payment filters as the table. Server cap: 50,000 rows. No paging or sort on export. Forced sale columns are not included in the server CSV today; the forced sales toggle filters the table only.",
} as const;
