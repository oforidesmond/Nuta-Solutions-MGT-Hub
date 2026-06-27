"use client";

import Link from "next/link";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { safeJsonPretty } from "@/lib/audit-display";
import { auditEventProductId, type AuditEventRow } from "@/lib/types/audit";

function auditEventSaleId(row: AuditEventRow): string | null {
  if (row.eventType !== "SALE_VOIDED") return null;
  const payload = row.payload;
  if (!payload) return null;
  const saleId = payload.saleId;
  return typeof saleId === "string" && saleId.trim() ? saleId.trim() : null;
}

function hasPayload(row: AuditEventRow): boolean {
  return Boolean(row.payload && Object.keys(row.payload).length > 0);
}

export function AuditEventDetailsCell({ row }: { row: AuditEventRow }) {
  const productId = auditEventProductId(row);
  const saleId = auditEventSaleId(row);
  const payloadText = hasPayload(row) ? safeJsonPretty(row.payload) : null;

  if (!payloadText && !productId && !saleId) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <div className="flex max-w-[14rem] flex-col gap-1">
      {payloadText ? (
        <TooltipProvider>
          <UiTooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="interactive-cursor max-w-full truncate text-left font-mono text-xs text-muted-foreground"
              >
                {payloadText.slice(0, 48)}
                {payloadText.length > 48 ? "…" : ""}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <pre className="max-h-64 max-w-md overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
                {payloadText}
              </pre>
            </TooltipContent>
          </UiTooltip>
        </TooltipProvider>
      ) : null}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        {productId ? (
          <Link
            href={`/products/${productId}`}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View product
          </Link>
        ) : null}
        {saleId ? (
          <Link
            href={`/sales/${saleId}`}
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View sale
          </Link>
        ) : null}
      </div>
    </div>
  );
}
