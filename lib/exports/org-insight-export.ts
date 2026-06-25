import type { OrgInsightDetailState } from "@/lib/types/org-insights";
import type { ExportColumn } from "@/components/exports/export-button";
import { buildExportFilename } from "@/lib/exports/filename";
import { orgInsightProductToRow, orgInsightStaffToRow } from "@/lib/exports/row-mappers";
import { formatInsightMoney } from "@/lib/types/org-insights";

const PRODUCT_COLUMNS: ExportColumn[] = [
  { key: "product", header: "Product" },
  { key: "branch", header: "Branch" },
  { key: "concern", header: "Concern" },
  { key: "lossAmount", header: "Stock lost" },
  { key: "stockValue", header: "Stock value" },
  { key: "returnRate", header: "Return rate" },
];

const STAFF_COLUMNS: ExportColumn[] = [
  { key: "name", header: "Staff" },
  { key: "branch", header: "Branch" },
  { key: "accountabilityIndex", header: "Review index" },
  { key: "lossAmount", header: "Stock lost" },
  { key: "eventCount", header: "Events" },
];

const INCIDENT_COLUMNS: ExportColumn[] = [
  { key: "label", header: "Pattern" },
  { key: "window", header: "Time window" },
  { key: "count", header: "Count" },
  { key: "lossAmount", header: "Stock lost" },
  { key: "description", header: "Description" },
];

const BATCH_COLUMNS: ExportColumn[] = [
  { key: "product", header: "Product" },
  { key: "batchNumber", header: "Batch" },
  { key: "branch", header: "Branch" },
  { key: "roi", header: "ROI" },
  { key: "revenue", header: "Revenue" },
  { key: "cost", header: "Cost" },
];

export function orgInsightExportConfig(
  detail: OrgInsightDetailState,
  orgName: string,
  currency: string,
): { filename: string; columns: ExportColumn[]; rows: Record<string, unknown>[] } | null {
  const period = detail.data.period;
  const from = period?.from?.slice(0, 10) ?? "";
  const to = period?.to?.slice(0, 10) ?? "";

  switch (detail.kind) {
    case "shrinkage":
      return {
        filename: buildExportFilename({ orgName, reportType: "missing-stock", from, to }),
        columns: PRODUCT_COLUMNS,
        rows: detail.data.items.map((r) =>
          orgInsightProductToRow(r, currency, {
            lossAmount: formatInsightMoney(r.lossAmount, currency),
          }),
        ),
      };
    case "slowStock":
      return {
        filename: buildExportFilename({ orgName, reportType: "slow-stock", from, to }),
        columns: [
          { key: "product", header: "Product" },
          { key: "branch", header: "Branch" },
          { key: "stockValue", header: "Stock value" },
        ],
        rows: detail.data.items.map((r) => ({
          product: r.productName ?? r.name ?? "",
          branch: r.branchName ?? "",
          stockValue: formatInsightMoney(r.stockValue, currency),
        })),
      };
    case "returns":
      return {
        filename: buildExportFilename({ orgName, reportType: "return-rates", from, to }),
        columns: [
          { key: "product", header: "Product" },
          { key: "branch", header: "Branch" },
          { key: "returnRate", header: "Return rate" },
          { key: "returnCount", header: "Returns" },
        ],
        rows: detail.data.items.map((r) => ({
          product: r.productName ?? r.name ?? "",
          branch: r.branchName ?? "",
          returnRate: r.returnRate ?? "",
          returnCount: r.returnCount ?? "",
        })),
      };
    case "transfer":
      return {
        filename: buildExportFilename({ orgName, reportType: "transfer-problems", from, to }),
        columns: PRODUCT_COLUMNS,
        rows: detail.data.items.map((r) => orgInsightProductToRow(r, currency)),
      };
    case "batch":
      return {
        filename: buildExportFilename({ orgName, reportType: "batch-performance", from, to }),
        columns: BATCH_COLUMNS,
        rows: detail.data.items.map((r) => ({
          product: r.productName ?? "",
          batchNumber: r.batchNumber ?? "",
          branch: r.branchName ?? "",
          roi: r.roi ?? "",
          revenue: r.revenue ?? "",
          cost: r.cost ?? "",
        })),
      };
    case "variance":
      return {
        filename: buildExportFilename({ orgName, reportType: "variance-sales", from, to }),
        columns: PRODUCT_COLUMNS,
        rows: detail.data.items.map((r) => orgInsightProductToRow(r, currency)),
      };
    case "incidents":
      return {
        filename: buildExportFilename({ orgName, reportType: "incident-patterns", from, to }),
        columns: INCIDENT_COLUMNS,
        rows: detail.data.items.map((r) => ({
          label: r.label ?? "",
          window: r.window ?? "",
          count: r.count ?? "",
          lossAmount: formatInsightMoney(r.lossAmount, currency),
          description: r.description ?? "",
        })),
      };
    case "staff":
      return {
        filename: buildExportFilename({ orgName, reportType: "staff-stock-review", from, to }),
        columns: STAFF_COLUMNS,
        rows: detail.data.items.map((r) => orgInsightStaffToRow(r)),
      };
    default:
      return null;
  }
}
