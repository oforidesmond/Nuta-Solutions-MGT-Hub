"use client";

import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { formatCurrency, formatLedgerWhen, toNumericAmount } from "@/lib/format";
import type { MoneyFeedItem } from "@/lib/types/money-book";
import { moneyPaymentLabel } from "@/lib/types/money-book";
import { cn } from "@/lib/utils";

type Props = {
  item: MoneyFeedItem;
  currency: string;
  onEdit?: (item: MoneyFeedItem) => void;
};

export function MoneyFeedCard({ item, currency, onEdit }: Props) {
  const isIn = item.direction === "IN";
  const amount = toNumericAmount(item.amount) ?? 0;
  const payment = moneyPaymentLabel(item.paymentMethod);
  const meta = [
    formatLedgerWhen(item.occurredAt),
    payment,
    item.kind === "SALE" && item.receiptNumber
      ? `Receipt ${item.receiptNumber}`
      : null,
    item.note?.trim() || null,
  ].filter(Boolean);

  const body = (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/50 bg-card/60 px-4 py-3.5 text-left transition-colors",
        item.editable || item.kind === "SALE"
          ? "hover:bg-muted/30 interactive-cursor"
          : "",
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
          isIn ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-rose-500/15 text-rose-700 dark:text-rose-400",
        )}
      >
        {item.kind === "SALE" ? (
          <Receipt className="size-4" aria-hidden />
        ) : isIn ? (
          <ArrowDownLeft className="size-4" aria-hidden />
        ) : (
          <ArrowUpRight className="size-4" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{item.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isIn ? "Money In" : "Money Out"}
              {item.kind === "SALE" ? " · From sales" : ""}
            </p>
          </div>
          <p
            className={cn(
              "shrink-0 text-base font-semibold tabular-nums",
              isIn
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {isIn ? "+" : "−"}
            {formatCurrency(amount, currency)}
          </p>
        </div>
        {meta.length > 0 ? (
          <p className="mt-1.5 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        ) : null}
      </div>
    </div>
  );

  if (item.kind === "SALE") {
    return (
      <Link href={`/sales/${item.id}`} className="block">
        {body}
      </Link>
    );
  }

  if (item.editable && onEdit) {
    return (
      <button type="button" className="block w-full" onClick={() => onEdit(item)}>
        {body}
      </button>
    );
  }

  return body;
}
