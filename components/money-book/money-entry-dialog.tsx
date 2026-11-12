"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createMoneyEntry,
  fetchMoneyCategories,
  updateMoneyEntry,
} from "@/lib/api/money-book";
import { handleApiError } from "@/lib/api/errors";
import { toYyyyMmDd } from "@/lib/date-range-presets";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { moneyBookKeys } from "@/lib/query/money-book-keys";
import type {
  MoneyEntryDirection,
  MoneyFeedItem,
  MoneyPaymentMethod,
} from "@/lib/types/money-book";
import { MONEY_PAYMENT_LABELS } from "@/lib/types/money-book";
import { cn } from "@/lib/utils";

const PAYMENT_OPTIONS = Object.entries(MONEY_PAYMENT_LABELS) as [
  MoneyPaymentMethod,
  string,
][];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: MoneyEntryDirection;
  editItem?: MoneyFeedItem | null;
};

export function MoneyEntryDialog({
  open,
  onOpenChange,
  direction,
  editItem,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/40 bg-card/95 backdrop-blur-md sm:max-w-lg">
        <MoneyEntryForm
          key={`${direction}-${editItem?.id ?? "new"}-${String(open)}`}
          direction={direction}
          editItem={editItem}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function MoneyEntryForm({
  direction,
  editItem,
  onClose,
}: {
  direction: MoneyEntryDirection;
  editItem?: MoneyFeedItem | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const activeBranchId = useActiveBranchId();
  const isEdit = Boolean(editItem?.editable && editItem.kind === "MANUAL");
  const titleDirection = isEdit
    ? editItem!.direction
    : direction;
  const isIn = titleDirection === "IN";

  const [amount, setAmount] = useState(
    isEdit ? String(Number(editItem?.amount ?? "") || "") : "",
  );
  const [categoryId, setCategoryId] = useState(editItem?.category?.id ?? "");
  const [paymentMethod, setPaymentMethod] = useState<MoneyPaymentMethod>(
    (editItem?.paymentMethod as MoneyPaymentMethod) || "CASH",
  );
  const [occurredDate, setOccurredDate] = useState(() =>
    editItem?.occurredAt
      ? toYyyyMmDd(new Date(editItem.occurredAt))
      : toYyyyMmDd(new Date()),
  );
  const [note, setNote] = useState(editItem?.note ?? "");

  const categoriesQuery = useQuery({
    queryKey: moneyBookKeys.categories(activeBranchId, titleDirection),
    queryFn: () => fetchMoneyCategories({ direction: titleDirection }),
  });

  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0]!.id);
    }
  }, [categories, categoryId]);

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["branch", activeBranchId ?? "none", "money-book"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["branch", activeBranchId ?? "none", "reports"],
    });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter an amount greater than zero.");
      }
      if (!categoryId) {
        throw new Error("Pick what this money is for.");
      }
      const occurredAt = `${occurredDate}T12:00:00.000Z`;
      if (isEdit && editItem) {
        return updateMoneyEntry(editItem.id, {
          amount: parsed,
          categoryId,
          paymentMethod,
          occurredAt,
          note: note.trim() || null,
        });
      }
      return createMoneyEntry({
        direction: titleDirection,
        amount: parsed,
        categoryId,
        paymentMethod,
        occurredAt,
        note: note.trim() || undefined,
      });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Saved.");
      onClose();
    },
    onError: (err) => {
      toast.error(handleApiError(err));
    },
  });

  const chipClass = (active: boolean) =>
    cn(
      "min-h-11 rounded-lg border px-3 py-2 text-sm transition-colors",
      active
        ? "border-primary bg-primary/10 text-foreground font-medium"
        : "border-border/60 bg-background text-muted-foreground hover:bg-muted/40",
    );

  const saveLabel = isIn ? "Save Money In" : "Save Money Out";

  const amountHint = useMemo(
    () => (isIn ? "How much came in?" : "How much went out?"),
    [isIn],
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit
            ? isIn
              ? "Edit Money In"
              : "Edit Money Out"
            : isIn
              ? "Add Money In"
              : "Add Money Out"}
        </DialogTitle>
        <DialogDescription>
          {isIn
            ? "Record other money that came into the business (not from sales)."
            : "Record a bill or spending, like light bill or rent."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 py-1">
        <div className="space-y-2">
          <Label htmlFor="money-amount">{amountHint}</Label>
          <Input
            id="money-amount"
            inputMode="decimal"
            className="h-12 text-lg tabular-nums"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>What for?</Label>
          {categoriesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading list…</p>
          ) : (
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={chipClass(categoryId === c.id)}
                  onClick={() => setCategoryId(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>How paid?</Label>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={chipClass(paymentMethod === value)}
                onClick={() => setPaymentMethod(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="money-when">When?</Label>
          <Input
            id="money-when"
            type="date"
            className="h-11"
            value={occurredDate}
            onChange={(e) => setOccurredDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="money-note">Note (optional)</Label>
          <Input
            id="money-note"
            className="h-11"
            placeholder="e.g. ECG bill March"
            maxLength={240}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          className="min-h-11"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            saveLabel
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
