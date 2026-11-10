import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fetchProductLifecyclePage } from "@/lib/api/product-lifecycle";
import { PRODUCT_ACTIVITY_PDF_ROW_CAP } from "@/lib/exports/constants";
import { fetchAllWithCursor } from "@/lib/exports/fetch-paginated";
import { buildExportFilename } from "@/lib/exports/filename";
import { PRODUCT_ACTIVITY_EXPORT_COLUMNS } from "@/lib/exports/row-mappers";
import {
  formatCurrency,
  formatDateDMY,
  formatTime12h,
  toNumericAmount,
} from "@/lib/format";
import type {
  ActivityFilterChip,
  ProductLedgerEntry,
} from "@/lib/types/product-lifecycle";
import {
  activityEntryMatchesChip,
  activityFilterChipToCategories,
  formatLedgerQtyValue,
  formatLedgerQuantityDelta,
  ledgerCategoryLabel,
} from "@/lib/types/product-lifecycle";

export type ProductActivityPdfFinancialSummary = {
  sold: number;
  profitOnSales: number;
  stockLost: number;
  returns: number;
  periodFrom: string;
  periodTo: string;
};

export type BuildProductActivityReportPdfArgs = {
  orgName: string;
  productName: string;
  branchName?: string | null;
  currency: string;
  chip: ActivityFilterChip;
  financials?: ProductActivityPdfFinancialSummary | null;
  entries: ProductLedgerEntry[];
  truncated?: boolean;
};

const CHIP_LABELS: Record<ActivityFilterChip, string> = {
  all: "All activity",
  sold: "Sold",
  received: "Received",
  problems: "Problems",
};

function qtyCell(value: string | number | null | undefined): string {
  return formatLedgerQtyValue(value) ?? "—";
}

function moneyCell(value: string | number | null | undefined, currency: string): string {
  if (value == null || value === "") return "—";
  const n = toNumericAmount(value);
  if (!Number.isFinite(n) || n === 0) return "—";
  return formatCurrency(n, currency);
}

function entryWhen(entry: ProductLedgerEntry): string {
  if (!entry.occurredAt) return "—";
  return `${formatDateDMY(entry.occurredAt)} ${formatTime12h(entry.occurredAt)}`;
}

/**
 * Page through product lifecycle until cap or last page, matching Activity chip filters.
 */
export async function fetchProductLifecycleForPdfExport(args: {
  productId: string;
  chip: ActivityFilterChip;
  maxRows?: number;
}): Promise<{ entries: ProductLedgerEntry[]; truncated: boolean }> {
  const maxRows = args.maxRows ?? PRODUCT_ACTIVITY_PDF_ROW_CAP;
  const categories = activityFilterChipToCategories(args.chip);

  const { rows, truncated } = await fetchAllWithCursor({
    maxRows,
    fetchPage: async (cursor) => {
      const page = await fetchProductLifecyclePage(args.productId, {
        cursor,
        limit: 50,
        categories,
      });
      return {
        items: page.data.filter((entry) => activityEntryMatchesChip(entry, args.chip)),
        nextCursor: page.nextCursor,
      };
    },
  });

  return { entries: rows, truncated };
}

function activityTableBody(
  entries: ProductLedgerEntry[],
  currency: string,
): string[][] {
  if (entries.length === 0) {
    return [["—", "—", "No activity for this filter.", "—", "—", "—", "—", "—", "—", "—", "—", "—"]];
  }

  return entries.map((entry) => [
    entryWhen(entry),
    ledgerCategoryLabel(entry.category),
    entry.summary?.trim() || "—",
    qtyCell(entry.quantity?.before),
    formatLedgerQuantityDelta(entry.quantity?.delta),
    qtyCell(entry.quantity?.after),
    moneyCell(entry.financial?.revenue, currency),
    moneyCell(entry.financial?.grossProfit, currency),
    moneyCell(entry.financial?.loss, currency),
    entry.actor?.name?.trim() || "—",
    entry.branch?.name?.trim() || "—",
    entry.references?.receiptNumber?.trim() || "—",
  ]);
}

/**
 * Build a product activity PDF with monthly summary and a detailed stock breakdown.
 */
export function buildProductActivityReportPdf(
  args: BuildProductActivityReportPdfArgs,
): Blob {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let y = 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Product activity report", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(70);
  const meta = [
    `Organization: ${args.orgName}`,
    `Product: ${args.productName}`,
    `Filter: ${CHIP_LABELS[args.chip]}`,
    `Currency: ${args.currency}`,
    `Generated: ${generatedAt}`,
  ];
  if (args.branchName) meta.splice(2, 0, `Branch: ${args.branchName}`);

  for (const line of meta) {
    doc.text(line, margin, y);
    y += 4.5;
  }
  doc.setTextColor(0);
  y += 2;

  if (args.financials) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("This month summary", margin, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70);
    const fin = args.financials;
    const summaryLines = [
      `Period: ${fin.periodFrom} – ${fin.periodTo}`,
      `Sold: ${formatCurrency(fin.sold, args.currency)}`,
      `Profit on sales: ${formatCurrency(fin.profitOnSales, args.currency)}`,
      `Stock lost: ${formatCurrency(fin.stockLost, args.currency)}`,
      `Returns: ${fin.returns}`,
    ];
    for (const line of summaryLines) {
      doc.text(line, margin, y);
      y += 4.5;
    }
    doc.setTextColor(0);
    y += 2;
  }

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Activity breakdown", margin, y);
  y += 2;

  const head = [PRODUCT_ACTIVITY_EXPORT_COLUMNS.map((c) => c.header)];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head,
    body: activityTableBody(args.entries, args.currency),
    styles: { fontSize: 7, cellPadding: 1.2, overflow: "linebreak", valign: "top" },
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    },
    theme: "grid",
  });

  const tableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  y = (tableDoc.lastAutoTable?.finalY ?? y) + 8;

  if (args.truncated) {
    if (y + 10 > pageHeight - 14) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Report capped at ${PRODUCT_ACTIVITY_PDF_ROW_CAP.toLocaleString()} activity rows. Narrow the filter for a full export.`,
      margin,
      y,
    );
    doc.setTextColor(0);
  }

  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth / 2, pageHeight - 8, {
      align: "center",
    });
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function productActivityPdfFilename(args: {
  orgName: string;
  chip: ActivityFilterChip;
  from?: string;
  to?: string;
}): string {
  return buildExportFilename({
    orgName: args.orgName,
    reportType: `product-activity-${args.chip}`,
    from: args.from,
    to: args.to,
    suffix: "pdf",
  });
}

export { downloadBlob } from "@/lib/exports/sales-pdf-export";
