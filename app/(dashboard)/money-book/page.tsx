"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, BookOpen, Settings2 } from "lucide-react";
import { DateRangePresetToolbar } from "@/components/filters/date-range-preset-toolbar";
import { ExportButton } from "@/components/exports/export-button";
import { MoneyCategoriesDialog } from "@/components/money-book/money-categories-dialog";
import { MoneyEntryDialog } from "@/components/money-book/money-entry-dialog";
import { MoneyFeedCard } from "@/components/money-book/money-feed-card";
import { PaginationBar } from "@/components/pagination/pagination-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchMoneyBookFeed,
  fetchMoneyBookSummary,
} from "@/lib/api/money-book";
import type { DateRangePreset } from "@/lib/date-range-presets";
import { rangeForPreset, toYyyyMmDd } from "@/lib/date-range-presets";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { moneyBookKeys } from "@/lib/query/money-book-keys";
import type {
  MoneyEntryDirection,
  MoneyFeedItem,
} from "@/lib/types/money-book";
import { moneyPaymentLabel } from "@/lib/types/money-book";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";

export default function MoneyBookPage() {
  const organization = useAuthStore((s) => s.organization);
  const currency = organization?.currency ?? "GHS";
  const activeBranchId = useActiveBranchId();

  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [customStart, setCustomStart] = useState(() => toYyyyMmDd(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toYyyyMmDd(new Date()));
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryDirection, setEntryDirection] =
    useState<MoneyEntryDirection>("OUT");
  const [editItem, setEditItem] = useState<MoneyFeedItem | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const range = useMemo(
    () => rangeForPreset(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const summaryQuery = useQuery({
    queryKey: moneyBookKeys.summary(activeBranchId, range),
    queryFn: () => fetchMoneyBookSummary(range),
    placeholderData: keepPreviousData,
  });

  const feedQuery = useQuery({
    queryKey: moneyBookKeys.feed(activeBranchId, {
      ...range,
      page,
      limit,
    }),
    queryFn: () =>
      fetchMoneyBookFeed({
        startDate: range.startDate,
        endDate: range.endDate,
        page,
        limit,
      }),
    placeholderData: keepPreviousData,
  });

  const summary = summaryQuery.data;
  const feed = feedQuery.data?.data ?? [];
  const meta = feedQuery.data?.meta;

  const openAdd = (direction: MoneyEntryDirection) => {
    setEditItem(null);
    setEntryDirection(direction);
    setEntryOpen(true);
  };

  const openEdit = (item: MoneyFeedItem) => {
    setEditItem(item);
    setEntryDirection(item.direction);
    setEntryOpen(true);
  };

  const moneyIn = toNumericAmount(summary?.moneyInTotal) ?? 0;
  const moneyOut = toNumericAmount(summary?.moneyOut) ?? 0;
  const whatsLeft = toNumericAmount(summary?.whatsLeft) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Business Money Book
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See money that came in (including sales) and money that went out.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setCategoriesOpen(true)}
          >
            <Settings2 className="size-4" />
            What-for list
          </Button>
          <ExportButton
            filename={`money-book-${range.startDate}-${range.endDate}.csv`}
            label="Export"
            columns={[
              { key: "when", header: "When" },
              { key: "direction", header: "Direction" },
              { key: "label", header: "What for" },
              { key: "amount", header: "Amount" },
              { key: "payment", header: "How paid" },
              { key: "note", header: "Note" },
              { key: "receipt", header: "Receipt" },
            ]}
            getRows={async () => {
              const all: MoneyFeedItem[] = [];
              let p = 1;
              let totalPages = 1;
              do {
                const res = await fetchMoneyBookFeed({
                  startDate: range.startDate,
                  endDate: range.endDate,
                  page: p,
                  limit: 100,
                });
                all.push(...res.data);
                totalPages = res.meta.totalPages;
                p += 1;
              } while (p <= totalPages && p <= 50);
              return all.map((item) => ({
                when: item.occurredAt,
                direction: item.direction === "IN" ? "Money In" : "Money Out",
                label: item.label,
                amount: item.amount,
                payment: moneyPaymentLabel(item.paymentMethod),
                note: item.note ?? "",
                receipt: item.receiptNumber ?? "",
              }));
            }}
          />
        </div>
      </div>

      <DateRangePresetToolbar
        preset={preset}
        onPresetChange={(p) => {
          setPreset(p);
          setPage(1);
        }}
        customStart={customStart}
        customEnd={customEnd}
        onCustomStartChange={(v) => {
          setCustomStart(v);
          setPage(1);
        }}
        onCustomEndChange={(v) => {
          setCustomEnd(v);
          setPage(1);
        }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Money In"
          sub={
            summary
              ? `Sales ${formatCurrency(toNumericAmount(summary.salesIn) ?? 0, currency)} + other ${formatCurrency(toNumericAmount(summary.otherIn) ?? 0, currency)}`
              : undefined
          }
          value={summaryQuery.isPending ? null : formatCurrency(moneyIn, currency)}
          tone="in"
        />
        <SummaryTile
          label="Money Out"
          value={summaryQuery.isPending ? null : formatCurrency(moneyOut, currency)}
          tone="out"
        />
        <SummaryTile
          label="What's left"
          value={summaryQuery.isPending ? null : formatCurrency(whatsLeft, currency)}
          tone={whatsLeft >= 0 ? "in" : "out"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          className="min-h-12 w-full text-base"
          onClick={() => openAdd("IN")}
        >
          <ArrowDownLeft className="size-5" />
          Add Money In
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-12 w-full text-base"
          onClick={() => openAdd("OUT")}
        >
          <ArrowUpRight className="size-5" />
          Add Money Out
        </Button>
      </div>

      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feedQuery.isPending && !feedQuery.data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : feed.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="size-8" />}
              title="No money recorded for this period"
              description="Sales will show here when staff sell. Tap Add Money Out for bills like light or rent."
              action={{
                label: "Add Money Out",
                onClick: () => openAdd("OUT"),
              }}
              secondaryAction={{
                label: "Add Money In",
                onClick: () => openAdd("IN"),
              }}
            />
          ) : (
            feed.map((item) => (
              <MoneyFeedCard
                key={`${item.kind}-${item.id}`}
                item={item}
                currency={currency}
                onEdit={openEdit}
              />
            ))
          )}

          {meta && meta.totalPages > 1 ? (
            <PaginationBar
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={setPage}
            />
          ) : null}
        </CardContent>
      </Card>

      <MoneyEntryDialog
        open={entryOpen}
        onOpenChange={(open) => {
          setEntryOpen(open);
          if (!open) setEditItem(null);
        }}
        direction={entryDirection}
        editItem={editItem}
      />
      <MoneyCategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | null;
  sub?: string;
  tone: "in" | "out";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-4",
        tone === "in"
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-rose-500/25 bg-rose-500/5",
      )}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      {value == null ? (
        <Skeleton className="mt-2 h-8 w-28" />
      ) : (
        <p
          className={cn(
            "mt-1 text-2xl font-semibold tabular-nums tracking-tight",
            tone === "in"
              ? "text-emerald-800 dark:text-emerald-300"
              : "text-rose-800 dark:text-rose-300",
          )}
        >
          {value}
        </p>
      )}
      {sub ? (
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      ) : null}
    </div>
  );
}
