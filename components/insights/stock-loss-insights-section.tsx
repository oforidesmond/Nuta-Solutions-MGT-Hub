"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Clock,
  Package,
  RotateCcw,
  ScanLine,
  Truck,
  TrendingDown,
  Users,
} from "lucide-react";
import type { OrgAnalyticsPeriod } from "@/lib/api/analytics-org";
import {
  fetchOrgInsightBatchPerformance,
  fetchOrgInsightIncidentPatterns,
  fetchOrgInsightReturnRates,
  fetchOrgInsightShrinkage,
  fetchOrgInsightSlowStock,
  fetchOrgInsightStaffAccountability,
  fetchOrgInsightTransferLeakage,
  fetchOrgInsightVarianceSales,
} from "@/lib/api/org-insights";
import { OrgInsightCard } from "@/components/insights/org-insight-card";
import { OrgInsightDetailSheet } from "@/components/insights/org-insight-detail-sheet";
import { ExportButton } from "@/components/exports/export-button";
import { StaffStockActivitySheet } from "@/components/insights/staff-stock-activity-sheet";
import { BatchTraceDrawer } from "@/components/batches/batch-trace-drawer";
import { orgInsightExportConfig } from "@/lib/exports/org-insight-export";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { orgInsightKeys } from "@/lib/query/product-lifecycle-keys";
import {
  accountabilityReviewLabel,
  formatInsightMoney,
  productConcernLabel,
  rowDisplayName,
  type OrgInsightBatchPerformance,
  type OrgInsightIncidentPatterns,
  type OrgInsightReturnRates,
  type OrgInsightShrinkage,
  type OrgInsightSlowStock,
  type OrgInsightStaffAccountability,
  type OrgInsightDetailState,
  type OrgInsightTransferLeakage,
  type OrgInsightVarianceSales,
} from "@/lib/types/org-insights";
import { toNumericAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

type DetailState = OrgInsightDetailState | null;

type Props = {
  period: OrgAnalyticsPeriod;
  currency: string;
};

function RankedRows({
  rows,
  limit,
  renderRow,
}: {
  rows: unknown[];
  limit?: number;
  renderRow: (row: unknown, index: number) => React.ReactNode;
}) {
  const slice = limit != null ? rows.slice(0, limit) : rows;
  if (slice.length === 0) return null;
  return (
    <ul className="space-y-1">
      {slice.map((row, i) => (
        <li key={i}>{renderRow(row, i)}</li>
      ))}
    </ul>
  );
}

function RankBadge({ index }: { index: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
      {index + 1}
    </span>
  );
}

function ProductRow({
  index,
  name,
  branch,
  value,
  href,
  onClick,
}: {
  index: number;
  name: string;
  branch?: string | null;
  value?: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <RankBadge index={index} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        {branch ? <p className="truncate text-xs text-muted-foreground">{branch}</p> : null}
      </div>
      {value ? <span className="shrink-0 text-sm font-medium tabular-nums">{value}</span> : null}
    </>
  );
  const className =
    "flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40";
  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }
  return (
    <div className={cn(className, onClick && "interactive-cursor")} onClick={onClick} role={onClick ? "button" : undefined}>
      {inner}
    </div>
  );
}

export function StockLossInsightsSection({ period, currency }: Props) {
  const activeBranchId = useActiveBranchId();
  const orgName = useAuthStore((s) => s.organization?.name) ?? "org";
  const [detail, setDetail] = useState<DetailState>(null);
  const [staffReview, setStaffReview] = useState<{ userId: string; name: string } | null>(null);
  const [traceBatch, setTraceBatch] = useState<{
    productId: string;
    id: string;
    label?: string;
    productName?: string;
  } | null>(null);

  const productHref = (productId?: string | null) =>
    productId ? `/products/${productId}` : undefined;

  return (
    <section id="stock-loss-insights" className="scroll-mt-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Stock &amp; loss insights</h2>
        <p className="text-sm text-muted-foreground">
          Patterns across your whole business — tap a card for details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <OrgInsightCard
          title="Missing or lost stock"
          description="Products where stock disappeared"
          icon={TrendingDown}
          period={period}
          queryKey={orgInsightKeys.shrinkage(activeBranchId, period)}
          queryFn={() => fetchOrgInsightShrinkage({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              Total lost:{" "}
              <span className="font-medium text-destructive tabular-nums">
                {formatInsightMoney(d.totalLoss, currency)}
              </span>
              {d.highConcernCount != null ? ` · ${d.highConcernCount} need attention` : ""}
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightShrinkage["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={rowDisplayName(r)}
                    branch={r.branchName}
                    value={productConcernLabel(r)}
                    href={productHref(r.productId)}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "shrinkage", data: d })}
        />

        <OrgInsightCard
          title="Stock not selling"
          description="Money sitting on the shelf"
          icon={Package}
          period={period}
          queryKey={orgInsightKeys.slowStock(activeBranchId)}
          queryFn={() => fetchOrgInsightSlowStock()}
          staleTime={120_000}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              Slow stock value:{" "}
              <span className="font-medium tabular-nums">
                {formatInsightMoney(d.totalValue, currency)}
              </span>
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightSlowStock["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={rowDisplayName(r)}
                    branch={r.branchName}
                    value={formatInsightMoney(r.stockValue, currency)}
                    href={productHref(r.productId)}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "slowStock", data: d })}
        />

        <OrgInsightCard
          title="Customer returns"
          description="Products customers bring back often"
          icon={RotateCcw}
          period={period}
          queryKey={orgInsightKeys.returnRates(activeBranchId, period)}
          queryFn={() => fetchOrgInsightReturnRates({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              {d.items.length} product{d.items.length === 1 ? "" : "s"} with notable returns
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightReturnRates["items"][number];
                const rate = r.returnRate != null ? `${toNumericAmount(r.returnRate).toFixed(1)}%` : "-";
                return (
                  <ProductRow
                    index={i}
                    name={rowDisplayName(r)}
                    branch={r.branchName}
                    value={rate}
                    href={productHref(r.productId)}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "returns", data: d })}
        />

        <OrgInsightCard
          title="Transfer problems"
          description="Stock sent between branches"
          icon={Truck}
          period={period}
          queryKey={orgInsightKeys.transferLeakage(activeBranchId, period)}
          queryFn={() => fetchOrgInsightTransferLeakage({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              {d.items.length} issue{d.items.length === 1 ? "" : "s"} to review
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightTransferLeakage["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={rowDisplayName(r)}
                    branch={r.branchName}
                    value={formatInsightMoney(r.lossAmount, currency)}
                    href={productHref(r.productId)}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "transfer", data: d })}
        />

        <OrgInsightCard
          title="Batch performance"
          description="Which deliveries made money"
          icon={Package}
          period={period}
          queryKey={orgInsightKeys.batchPerformance(activeBranchId, period)}
          queryFn={() => fetchOrgInsightBatchPerformance({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              Top {Math.min(d.items.length, 3)} batches ranked by performance
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightBatchPerformance["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={`${rowDisplayName(r)} · ${r.batchNumber ?? "Batch"}`}
                    branch={r.branchName}
                    value={formatInsightMoney(r.roi ?? r.revenue, currency)}
                    onClick={
                      r.batchId && r.productId
                        ? () =>
                            setTraceBatch({
                              productId: r.productId!,
                              id: r.batchId!,
                              label: r.batchNumber ?? undefined,
                              productName: r.productName ?? undefined,
                            })
                        : undefined
                    }
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "batch", data: d })}
        />

        <OrgInsightCard
          title="Sales without scanning"
          description="Unusual sales without barcode scan"
          icon={ScanLine}
          period={period}
          queryKey={orgInsightKeys.varianceSales(activeBranchId, period)}
          queryFn={() => fetchOrgInsightVarianceSales({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              {d.items.length} pattern{d.items.length === 1 ? "" : "s"} flagged
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightVarianceSales["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={rowDisplayName(r)}
                    branch={r.branchName}
                    value={formatInsightMoney(r.lossAmount, currency)}
                    href={productHref(r.productId)}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "variance", data: d })}
        />

        <OrgInsightCard
          title="Recurring problems by time"
          description="When issues keep happening"
          icon={Clock}
          period={period}
          queryKey={orgInsightKeys.incidentPatterns(activeBranchId, period)}
          queryFn={() => fetchOrgInsightIncidentPatterns({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              {d.items.length} time pattern{d.items.length === 1 ? "" : "s"} found
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightIncidentPatterns["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={r.label ?? r.description ?? "Pattern"}
                    branch={r.window}
                    value={r.count != null ? `${r.count} times` : undefined}
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "incidents", data: d })}
        />

        <OrgInsightCard
          title="Staff stock activity review"
          description="Who may need a conversation — not punishment"
          icon={Users}
          period={period}
          queryKey={orgInsightKeys.staffAccountability(activeBranchId, period)}
          queryFn={() => fetchOrgInsightStaffAccountability({ period })}
          renderSummary={(d) => (
            <p className="text-sm text-muted-foreground">
              {d.items.filter((s) => (s.accountabilityIndex ?? 0) >= 40).length} staff worth reviewing
            </p>
          )}
          renderList={(d, limit) => (
            <RankedRows
              rows={d.items}
              limit={limit}
              renderRow={(row, i) => {
                const r = row as OrgInsightStaffAccountability["items"][number];
                return (
                  <ProductRow
                    index={i}
                    name={r.name ?? "Staff"}
                    branch={r.branchName}
                    value={accountabilityReviewLabel(r.accountabilityIndex)}
                    onClick={
                      r.userId
                        ? () => setStaffReview({ userId: r.userId!, name: r.name ?? "Staff" })
                        : undefined
                    }
                  />
                );
              }}
            />
          )}
          isEmpty={(d) => d.items.length === 0}
          onOpenDetail={(d) => setDetail({ kind: "staff", data: d })}
        />
      </div>

      <OrgInsightDetailSheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={detailTitle(detail)}
        description="Full ranked list for this period"
        headerAction={
          detail ? (
            (() => {
              const config = orgInsightExportConfig(detail, orgName, currency);
              if (!config) return null;
              return (
                <ExportButton
                  filename={config.filename}
                  columns={config.columns}
                  disabled={config.rows.length === 0}
                  getRows={async () => ({ rows: config.rows })}
                />
              );
            })()
          ) : null
        }
      >
        {detail ? renderDetailContent(detail, currency, setStaffReview, setTraceBatch) : null}
      </OrgInsightDetailSheet>

      <StaffStockActivitySheet
        userId={staffReview?.userId ?? null}
        staffName={staffReview?.name}
        period={period}
        open={!!staffReview}
        onOpenChange={(open) => {
          if (!open) setStaffReview(null);
        }}
      />

      <BatchTraceDrawer
        productId={traceBatch?.productId ?? null}
        batchId={traceBatch?.id ?? null}
        batchLabel={traceBatch?.label}
        productName={traceBatch?.productName}
        open={!!traceBatch}
        onOpenChange={(open) => {
          if (!open) setTraceBatch(null);
        }}
      />
    </section>
  );
}

function detailTitle(detail: DetailState): string {
  switch (detail?.kind) {
    case "shrinkage":
      return "Missing or lost stock";
    case "slowStock":
      return "Stock not selling";
    case "returns":
      return "Customer returns";
    case "transfer":
      return "Transfer problems";
    case "batch":
      return "Batch performance";
    case "variance":
      return "Sales without scanning";
    case "incidents":
      return "Recurring problems by time";
    case "staff":
      return "Staff stock activity review";
    default:
      return "Insight details";
  }
}

function renderDetailContent(
  detail: NonNullable<DetailState>,
  currency: string,
  setStaffReview: (v: { userId: string; name: string }) => void,
  setTraceBatch: (v: {
    productId: string;
    id: string;
    label?: string;
    productName?: string;
  }) => void,
) {
  const productHref = (productId?: string | null) =>
    productId ? `/products/${productId}` : undefined;

  switch (detail.kind) {
    case "shrinkage":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.productId ?? i}
              index={i}
              name={rowDisplayName(r)}
              branch={r.branchName}
              value={`${productConcernLabel(r)} · ${formatInsightMoney(r.lossAmount, currency)}`}
              href={productHref(r.productId)}
            />
          ))}
        </ul>
      );
    case "slowStock":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.productId ?? i}
              index={i}
              name={rowDisplayName(r)}
              branch={r.branchName}
              value={formatInsightMoney(r.stockValue, currency)}
              href={productHref(r.productId)}
            />
          ))}
        </ul>
      );
    case "returns":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.productId ?? i}
              index={i}
              name={rowDisplayName(r)}
              branch={r.branchName}
              value={r.returnRate != null ? `${toNumericAmount(r.returnRate).toFixed(1)}%` : "-"}
              href={productHref(r.productId)}
            />
          ))}
        </ul>
      );
    case "transfer":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.productId ?? i}
              index={i}
              name={rowDisplayName(r)}
              branch={r.branchName}
              value={formatInsightMoney(r.lossAmount, currency)}
              href={productHref(r.productId)}
            />
          ))}
        </ul>
      );
    case "batch":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.batchId ?? i}
              index={i}
              name={`${rowDisplayName(r)} · ${r.batchNumber ?? "Batch"}`}
              branch={r.branchName}
              value={formatInsightMoney(r.roi ?? r.revenue, currency)}
              onClick={
                r.batchId && r.productId
                  ? () =>
                      setTraceBatch({
                        productId: r.productId!,
                        id: r.batchId!,
                        label: r.batchNumber ?? undefined,
                        productName: r.productName ?? undefined,
                      })
                  : undefined
              }
            />
          ))}
        </ul>
      );
    case "variance":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.productId ?? i}
              index={i}
              name={rowDisplayName(r)}
              branch={r.branchName}
              value={formatInsightMoney(r.lossAmount, currency)}
              href={productHref(r.productId)}
            />
          ))}
        </ul>
      );
    case "incidents":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={i}
              index={i}
              name={r.label ?? r.description ?? "Pattern"}
              branch={r.window}
              value={
                r.lossAmount
                  ? formatInsightMoney(r.lossAmount, currency)
                  : r.count != null
                    ? `${r.count} times`
                    : undefined
              }
            />
          ))}
        </ul>
      );
    case "staff":
      return (
        <ul className="space-y-1">
          {detail.data.items.map((r, i) => (
            <ProductRow
              key={r.userId ?? i}
              index={i}
              name={r.name ?? "Staff"}
              branch={r.branchName}
              value={accountabilityReviewLabel(r.accountabilityIndex)}
              onClick={
                r.userId
                  ? () => setStaffReview({ userId: r.userId!, name: r.name ?? "Staff" })
                  : undefined
              }
            />
          ))}
        </ul>
      );
    default:
      return null;
  }
}
