import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  fetchSaleById,
  fetchSalesPage,
  fetchSalesWithVariancesPage,
} from "@/lib/api/sales";
import { SALES_PDF_SALE_CAP } from "@/lib/exports/constants";
import { buildExportFilename } from "@/lib/exports/filename";
import {
  formatCurrency,
  formatDateDMY,
  formatTime12h,
  toNumericAmount,
} from "@/lib/format";
import type { HubSale, HubSaleLine, VarianceReason } from "@/lib/types/domain";
import type { SalesListParams, SalesVarianceListParams } from "@/lib/types/sales";
import { VARIANCE_REASON_LABELS } from "@/lib/variance-reason-labels";

const PAGE_LIMIT = 100;

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  MOMO: "Mobile money",
  OTHER: "Other",
};

export type SalesPdfListFilters = {
  startDate?: string;
  endDate?: string;
  staffId?: string;
  paymentMethod?: string;
};

export type SalesPdfVarianceFilters = {
  startDate?: string;
  endDate?: string;
  productId?: string;
  varianceReason?: VarianceReason;
};

export type FetchSalesForPdfResult = {
  sales: HubSale[];
  truncated: boolean;
};

function paymentLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_LABELS[method] ?? method;
}

function createdByLabel(sale: HubSale): string {
  const c = sale.createdBy;
  if (!c) return "—";
  const n = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
  return n || c.email || "—";
}

function receiptLabel(sale: HubSale): string {
  return sale.receiptNumber?.trim() || sale.receiptNumberMobile?.trim() || "—";
}

function soldAtLabel(sale: HubSale): string {
  const when = sale.soldAt ?? sale.createdAt;
  if (!when) return "—";
  return `${formatDateDMY(when)} ${formatTime12h(when)}`;
}

function qtyLabel(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = toNumericAmount(value);
  return Number.isFinite(n) ? String(n) : String(value);
}

async function ensureSaleItems(sale: HubSale): Promise<HubSale> {
  if (Array.isArray(sale.items)) return sale;
  if (!sale.id) return { ...sale, items: [] };
  try {
    const detail = await fetchSaleById(sale.id);
    return { ...sale, items: detail.items ?? [] };
  } catch {
    return { ...sale, items: [] };
  }
}

/**
 * Page through list (or forced-sales) endpoints until cap or last page.
 * Backfills `items` via detail fetch when the list payload omits them.
 */
export async function fetchSalesForPdfExport(args: {
  varianceOnly: boolean;
  listFilters: SalesPdfListFilters;
  varianceFilters: SalesPdfVarianceFilters;
  maxSales?: number;
}): Promise<FetchSalesForPdfResult> {
  const maxSales = args.maxSales ?? SALES_PDF_SALE_CAP;
  const sales: HubSale[] = [];
  let page = 1;
  let truncated = false;

  while (sales.length < maxSales) {
    const remaining = maxSales - sales.length;
    const limit = Math.min(PAGE_LIMIT, remaining);

    let batch: HubSale[] = [];
    let totalPages = 1;

    if (args.varianceOnly) {
      const params: SalesVarianceListParams = {
        ...args.varianceFilters,
        page,
        limit,
      };
      const res = await fetchSalesWithVariancesPage(params);
      batch = res.data;
      totalPages = res.totalPages;
    } else {
      const params: SalesListParams = {
        ...args.listFilters,
        page,
        limit,
        sortBy: "soldAt",
        sortOrder: "desc",
      };
      const res = await fetchSalesPage(params);
      batch = res.data;
      totalPages = res.totalPages;
    }

    if (batch.length === 0) break;

    for (const sale of batch) {
      if (sales.length >= maxSales) {
        truncated = true;
        break;
      }
      sales.push(await ensureSaleItems(sale));
    }

    if (truncated) break;
    if (page >= totalPages || batch.length < limit) break;
    page += 1;
  }

  return { sales, truncated };
}

export type SalesPdfFilterSummary = {
  staffLabel?: string;
  paymentLabel?: string;
  forcedSalesOnly?: boolean;
  varianceReasonLabel?: string;
  productId?: string;
};

export type BuildSalesReportPdfArgs = {
  orgName: string;
  branchName?: string | null;
  startDate?: string;
  endDate?: string;
  currency: string;
  filters: SalesPdfFilterSummary;
  sales: HubSale[];
  truncated?: boolean;
};

function formatPeriod(startDate?: string, endDate?: string): string {
  if (startDate && endDate) return `${startDate} → ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return "All dates";
}

function drawHeader(
  doc: jsPDF,
  args: BuildSalesReportPdfArgs,
  generatedAt: string,
): number {
  const margin = 14;
  let y = 16;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(args.orgName || "Sales report", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Sales report", margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setTextColor(80);
  const meta: string[] = [
    `Period: ${formatPeriod(args.startDate, args.endDate)}`,
    `Currency: ${args.currency}`,
    `Generated: ${generatedAt}`,
  ];
  if (args.branchName) meta.splice(1, 0, `Branch: ${args.branchName}`);

  for (const line of meta) {
    doc.text(line, margin, y);
    y += 4.5;
  }

  const filterParts: string[] = [];
  if (args.filters.forcedSalesOnly) filterParts.push("Forced sales only");
  if (args.filters.staffLabel) filterParts.push(`Staff: ${args.filters.staffLabel}`);
  if (args.filters.paymentLabel) filterParts.push(`Payment: ${args.filters.paymentLabel}`);
  if (args.filters.varianceReasonLabel) {
    filterParts.push(`Reason: ${args.filters.varianceReasonLabel}`);
  }
  if (args.filters.productId) filterParts.push(`Product ID: ${args.filters.productId}`);

  if (filterParts.length > 0) {
    doc.text(`Filters: ${filterParts.join(" · ")}`, margin, y);
    y += 4.5;
  }

  doc.setTextColor(0);
  y += 2;
  doc.setDrawColor(200);
  doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
  y += 8;
  return y;
}

function lineRows(items: HubSaleLine[], currency: string): string[][] {
  if (items.length === 0) {
    return [["—", "—", "—", "—", "—"]];
  }
  return items.map((it) => [
    it.productName?.trim() || "—",
    it.productSku?.trim() || "—",
    qtyLabel(it.quantity),
    formatCurrency(toNumericAmount(it.unitPrice), currency),
    formatCurrency(toNumericAmount(it.lineTotal), currency),
  ]);
}

/**
 * Build a multi-sale PDF report with header metadata and per-sale line items.
 */
export function buildSalesReportPdf(args: BuildSalesReportPdfArgs): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  let y = drawHeader(doc, args, generatedAt);

  if (args.sales.length === 0) {
    doc.setFontSize(10);
    doc.text("No sales found for the current filters.", margin, y);
  }

  for (let i = 0; i < args.sales.length; i += 1) {
    const sale = args.sales[i];
    const items = sale.items ?? [];
    const blockNeeded = 28;

    if (y + blockNeeded > pageHeight - 20) {
      doc.addPage();
      y = 16;
    }

    const voided = sale.isVoided === true;
    const titleBits = [
      `Receipt ${receiptLabel(sale)}`,
      voided ? "(VOIDED)" : null,
    ].filter(Boolean);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(voided ? 150 : 0);
    doc.text(titleBits.join(" "), margin, y);
    doc.setTextColor(0);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(70);
    const detailLines = [
      `Sale ID: ${sale.id || "—"}`,
      `Date: ${soldAtLabel(sale)}`,
      `Staff: ${createdByLabel(sale)}`,
      `Payment: ${paymentLabel(sale.paymentMethod)}`,
      `Total: ${formatCurrency(toNumericAmount(sale.totalAmount), args.currency)}`,
    ];
    if (sale.branchName) detailLines.splice(1, 0, `Branch: ${sale.branchName}`);
    if (voided && sale.voidReason) detailLines.push(`Void reason: ${sale.voidReason}`);

    const detailText = detailLines.join("  ·  ");
    const wrapped = doc.splitTextToSize(detailText, pageWidth - margin * 2);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 3.8 + 2;
    doc.setTextColor(0);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Product", "SKU", "Qty", "Unit price", "Line total"]],
      body: lineRows(items, args.currency),
      styles: { fontSize: 8, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
      theme: "grid",
    });

    const tableDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    y = (tableDoc.lastAutoTable?.finalY ?? y) + 8;
  }

  if (args.truncated) {
    if (y + 12 > pageHeight - 16) {
      doc.addPage();
      y = 16;
    }
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Report capped at ${SALES_PDF_SALE_CAP.toLocaleString()} sales. Narrow your filters for a full export.`,
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
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
    doc.setTextColor(0);
  }

  return doc.output("blob");
}

export function salesReportPdfFilename(args: {
  orgName: string;
  startDate?: string;
  endDate?: string;
}): string {
  return buildExportFilename({
    orgName: args.orgName,
    reportType: "sales-report",
    from: args.startDate,
    to: args.endDate,
    suffix: "pdf",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function varianceReasonFilterLabel(
  reason: VarianceReason | "" | undefined,
): string | undefined {
  if (!reason) return undefined;
  return VARIANCE_REASON_LABELS[reason] ?? reason;
}
