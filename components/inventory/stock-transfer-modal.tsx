"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  ProductLinkPicker,
  type ProductPickValue,
} from "@/components/products/product-link-picker";
import { fetchProductAtBranch } from "@/lib/api/products";
import { transferInventory } from "@/lib/api/inventory-transfer";
import { getApiErrorCode, getApiErrorMessage } from "@/lib/api/error-codes";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { productQuantity } from "@/lib/stock-status";
import type { HubBranch, StockTransferResult } from "@/lib/types/branches";
import { cn } from "@/lib/utils";

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Active branches (length must be > 1 for this feature to be useful). */
  branches: HubBranch[];
  /** Optional preselected product (from the product actions menu). */
  presetProduct?: ProductPickValue | null;
}

export function StockTransferModal({
  open,
  onOpenChange,
  branches,
  presetProduct,
}: StockTransferModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <TransferForm
          key={`${String(open)}-${presetProduct?.id ?? "none"}`}
          branches={branches}
          presetProduct={presetProduct ?? null}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TransferForm({
  branches,
  presetProduct,
  onClose,
}: {
  branches: HubBranch[];
  presetProduct: ProductPickValue | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const activeBranchId = useActiveBranchId();
  const activeBranches = useMemo(
    () => branches.filter((b) => b.isActive !== false),
    [branches],
  );
  const defaultFrom =
    activeBranches.find((b) => b.isDefault)?.id ?? activeBranches[0]?.id ?? "";

  const [product, setProduct] = useState<ProductPickValue | null>(presetProduct);
  const [fromBranchId, setFromBranchId] = useState(defaultFrom);
  const [toBranchId, setToBranchId] = useState("");
  const [qtyInput, setQtyInput] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<StockTransferResult | null>(null);
  const [insufficient, setInsufficient] = useState(false);

  const fromStockQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "transfer-stock", product?.id, fromBranchId),
    queryFn: () => fetchProductAtBranch(product!.id, fromBranchId),
    enabled: Boolean(product?.id && fromBranchId),
    staleTime: 10_000,
  });

  const toStockQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "transfer-stock", product?.id, toBranchId),
    queryFn: () => fetchProductAtBranch(product!.id, toBranchId),
    enabled: Boolean(product?.id && toBranchId),
    staleTime: 10_000,
  });

  const fromStock = fromStockQuery.data ? productQuantity(fromStockQuery.data) : null;
  const toStock = toStockQuery.data ? productQuantity(toStockQuery.data) : null;

  const qty = Number(qtyInput);
  const qtyValid = qtyInput.trim() !== "" && Number.isFinite(qty) && qty > 0;
  const sameBranch = Boolean(fromBranchId && toBranchId && fromBranchId === toBranchId);
  const overStock = qtyValid && fromStock != null && qty > fromStock;

  const canSubmit =
    Boolean(product?.id) &&
    Boolean(fromBranchId) &&
    Boolean(toBranchId) &&
    !sameBranch &&
    qtyValid &&
    !overStock;

  const mutation = useMutation({
    mutationFn: () =>
      transferInventory({
        productId: product!.id,
        fromBranchId,
        toBranchId,
        quantity: qty,
        note: note.trim() || undefined,
      }),
    onSuccess: (res) => {
      setResult(res);
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "transfer-stock"),
      });
    },
    onError: (err) => {
      if (getApiErrorCode(err) === "INSUFFICIENT_STOCK_FOR_TRANSFER") {
        setInsufficient(true);
        void fromStockQuery.refetch();
        return;
      }
      toast.error(getApiErrorMessage(err));
    },
  });

  /** Clear the inline "insufficient stock" hint whenever inputs change. */
  function clearInsufficient() {
    if (insufficient) setInsufficient(false);
  }

  const fromBranchName = activeBranches.find((b) => b.id === fromBranchId)?.name ?? "source branch";

  if (result) {
    return <TransferSuccess result={result} onClose={onClose} onNew={() => resetForNew()} />;
  }

  function resetForNew() {
    setResult(null);
    setProduct(null);
    setToBranchId("");
    setQtyInput("");
    setNote("");
    setInsufficient(false);
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Transfer stock</DialogTitle>
        <DialogDescription>
          Move stock from one branch to another. The change is recorded in both branches&apos; stock
          history.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <ProductLinkPicker
          id="transfer-product"
          label="Product"
          placeholder="Select a product to transfer"
          value={product}
          onChange={(v) => {
            setProduct(v);
            clearInsufficient();
          }}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="transfer-from">From branch</Label>
            <BranchSelect
              id="transfer-from"
              value={fromBranchId}
              branches={activeBranches}
              onChange={(v) => {
                setFromBranchId(v);
                clearInsufficient();
              }}
            />
            <StockHint
              loading={fromStockQuery.isFetching}
              show={Boolean(product?.id && fromBranchId)}
              stock={fromStock}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-to">To branch</Label>
            <BranchSelect
              id="transfer-to"
              value={toBranchId}
              branches={activeBranches}
              onChange={(v) => {
                setToBranchId(v);
                clearInsufficient();
              }}
              placeholder="Choose destination"
            />
            <StockHint
              loading={toStockQuery.isFetching}
              show={Boolean(product?.id && toBranchId)}
              stock={toStock}
            />
          </div>
        </div>

        {sameBranch ? (
          <p className="text-xs text-destructive">
            Source and destination branches must be different.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="transfer-qty">Quantity</Label>
          <Input
            id="transfer-qty"
            inputMode="decimal"
            value={qtyInput}
            onChange={(e) => {
              setQtyInput(e.target.value);
              clearInsufficient();
            }}
            placeholder="e.g. 10"
            aria-invalid={overStock || insufficient ? true : undefined}
          />
          {overStock || insufficient ? (
            <p className="text-xs text-destructive">
              {fromStock != null
                ? `Only ${fromStock} available at ${fromBranchName}. Enter a smaller quantity.`
                : `Not enough stock at ${fromBranchName}.`}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="transfer-note">Note (optional)</Label>
          <Textarea
            id="transfer-note"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Restock for weekend rush"
            maxLength={300}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={!canSubmit || mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Transferring…
            </>
          ) : (
            "Transfer stock"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function BranchSelect({
  id,
  value,
  branches,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  branches: HubBranch[];
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 interactive-cursor"
    >
      {placeholder ? <option value="">{placeholder}</option> : null}
      {branches.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
          {b.isDefault ? " (Default)" : ""}
        </option>
      ))}
    </select>
  );
}

function StockHint({
  loading,
  show,
  stock,
}: {
  loading: boolean;
  show: boolean;
  stock: number | null;
}) {
  if (!show) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {loading ? (
        "Checking stock…"
      ) : stock != null ? (
        <>
          Current stock: <span className="font-medium tabular-nums text-foreground">{stock}</span>
        </>
      ) : (
        "Stock unavailable"
      )}
    </p>
  );
}

function TransferSuccess({
  result,
  onClose,
  onNew,
}: {
  result: StockTransferResult;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          Transfer complete
        </DialogTitle>
        <DialogDescription>
          {result.quantity} unit{result.quantity === "1" ? "" : "s"} moved successfully.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <BranchResultCard
          label="From"
          name={result.fromBranch.name}
          before={result.fromBranch.stockBefore}
          after={result.fromBranch.stockAfter}
        />
        <ArrowRight className="mx-auto hidden size-5 text-muted-foreground sm:block" aria-hidden />
        <BranchResultCard
          label="To"
          name={result.toBranch.name}
          before={result.toBranch.stockBefore}
          after={result.toBranch.stockAfter}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onNew}>
          New transfer
        </Button>
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </DialogFooter>
    </>
  );
}

function BranchResultCard({
  label,
  name,
  before,
  after,
}: {
  label: string;
  name: string;
  before: string;
  after: string;
}) {
  const decreased = Number(after) < Number(before);
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium text-foreground">{name}</p>
      <p className="mt-1 text-sm tabular-nums">
        <span className="text-muted-foreground">{before}</span>
        <ArrowRight className="mx-1 inline size-3 text-muted-foreground" aria-hidden />
        <span
          className={cn(
            "font-semibold",
            decreased ? "text-destructive" : "text-emerald-700 dark:text-emerald-400",
          )}
        >
          {after}
        </span>
      </p>
    </div>
  );
}
