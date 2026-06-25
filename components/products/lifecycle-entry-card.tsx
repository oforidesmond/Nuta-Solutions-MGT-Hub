"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
  Package,
  PackageMinus,
  Receipt,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductLedgerEntry } from "@/lib/types/product-lifecycle";
import { ledgerCategoryTone } from "@/lib/types/product-lifecycle";
import { formatCurrency, formatLedgerWhen, toNumericAmount } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  entry: ProductLedgerEntry;
  currency: string;
};

function categoryIcon(category: string): LucideIcon {
  switch (category) {
    case "SALE":
    case "VARIANCE_SALE":
      return Receipt;
    case "RETURN":
      return RotateCcw;
    case "SALE_VOID":
      return RotateCcw;
    case "RECEIPT":
    case "INITIAL_STOCK":
    case "TRANSFER_IN":
    case "CONVERSION_IN":
      return Package;
    case "STOCK_TAKE":
    case "DISCREPANCY":
    case "MANUAL_ADJUSTMENT":
      return ClipboardList;
    case "DAMAGE_EXPIRY":
    case "BATCH_EXPIRY":
      return PackageMinus;
    case "TRANSFER_OUT":
    case "CONVERSION_OUT":
    case "TRANSFER":
      return Truck;
    default:
      return AlertTriangle;
  }
}

function toneClasses(tone: ReturnType<typeof ledgerCategoryTone>): string {
  switch (tone) {
    case "positive":
      return "border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300";
    case "negative":
      return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
    case "loss":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    default:
      return "border-border/50 bg-muted/40 text-muted-foreground";
  }
}

function moneyLine(entry: ProductLedgerEntry, currency: string): string | null {
  const fin = entry.financial;
  const profit = fin.grossProfit != null ? toNumericAmount(fin.grossProfit) : null;
  const revenue = fin.revenue != null ? toNumericAmount(fin.revenue) : null;
  const loss = fin.loss != null ? toNumericAmount(fin.loss) : null;

  if (profit != null && profit !== 0) {
    const sign = profit >= 0 ? "+" : "−";
    return `${sign}${formatCurrency(Math.abs(profit), currency)}`;
  }
  if (revenue != null && revenue !== 0) {
    const sign = revenue >= 0 ? "+" : "−";
    return `${sign}${formatCurrency(Math.abs(revenue), currency)}`;
  }
  if (loss != null && loss !== 0) {
    return `−${formatCurrency(Math.abs(loss), currency)}`;
  }

  const delta = toNumericAmount(entry.quantity?.delta);
  if (delta !== 0) {
    const sign = delta >= 0 ? "+" : "";
    return `${sign}${delta} units`;
  }
  return null;
}

export function LifecycleEntryCard({ entry, currency }: Props) {
  const tone = ledgerCategoryTone(entry.category);
  const Icon = categoryIcon(entry.category);
  const actorName = entry.actor?.name?.trim() || null;
  const branchName = entry.branch?.name?.trim() || null;
  const metaParts = [formatLedgerWhen(entry.occurredAt), actorName, branchName].filter(Boolean);
  const money = moneyLine(entry, currency);
  const saleId = entry.references?.saleId;
  const receiptNumber = entry.references?.receiptNumber;

  return (
    <li className="flex gap-3 rounded-lg border border-border/40 bg-muted/20 p-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full border",
          toneClasses(tone),
        )}
        aria-hidden
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium leading-snug text-foreground">{entry.summary}</p>
        <p className="text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
        {receiptNumber && saleId ? (
          <Link
            href={`/sales/${saleId}`}
            className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
          >
            <Receipt className="size-3" aria-hidden />
            {receiptNumber}
          </Link>
        ) : null}
        {money ? (
          <p
            className={cn(
              "text-sm font-medium tabular-nums",
              tone === "positive" && "text-emerald-700 dark:text-emerald-400",
              tone === "negative" && "text-amber-800 dark:text-amber-200",
              tone === "loss" && "text-destructive",
            )}
          >
            {money}
            {tone === "positive" ? (
              <ArrowUpRight className="ml-0.5 inline size-3.5" aria-hidden />
            ) : tone === "loss" || tone === "negative" ? (
              <ArrowDownLeft className="ml-0.5 inline size-3.5" aria-hidden />
            ) : null}
          </p>
        ) : null}
      </div>
    </li>
  );
}
