"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2, Store } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProductPriceContext, updateProductPricing } from "@/lib/api/products";
import { getApiErrorMessage } from "@/lib/api/error-codes";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { formatCurrency, toNumericAmount } from "@/lib/format";
import type { PriceScope } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

interface PriceScopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  /** New cost price typed by the admin; omit/undefined when unchanged. */
  proposedCostPrice?: number;
  proposedSellingPrice?: number;
  currency: string;
  /** Called after the price update succeeds (e.g. navigate / refresh). */
  onApplied?: () => void;
}

export function PriceScopeModal({
  open,
  onOpenChange,
  productId,
  proposedCostPrice,
  proposedSellingPrice,
  currency,
  onApplied,
}: PriceScopeModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <PriceScopeForm
          key={`${productId}-${String(open)}`}
          productId={productId}
          proposedCostPrice={proposedCostPrice}
          proposedSellingPrice={proposedSellingPrice}
          currency={currency}
          onClose={() => onOpenChange(false)}
          onApplied={onApplied}
        />
      </DialogContent>
    </Dialog>
  );
}

function PriceScopeForm({
  productId,
  proposedCostPrice,
  proposedSellingPrice,
  currency,
  onClose,
  onApplied,
}: {
  productId: string;
  proposedCostPrice?: number;
  proposedSellingPrice?: number;
  currency: string;
  onClose: () => void;
  onApplied?: () => void;
}) {
  const queryClient = useQueryClient();
  const activeBranchId = useActiveBranchId();
  const [scope, setScope] = useState<PriceScope | null>(null);

  const contextQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "product-price-context", productId),
    queryFn: () => fetchProductPriceContext(productId),
    staleTime: 0,
  });

  const mutation = useMutation({
    mutationFn: () => {
      if (!scope) throw new Error("No scope selected");
      return updateProductPricing(productId, {
        costPrice: proposedCostPrice,
        sellingPrice: proposedSellingPrice,
        priceScope: scope,
      });
    },
    onSuccess: () => {
      toast.success(
        scope === "ORG"
          ? "Price updated for the whole organisation"
          : "Branch price updated",
      );
      void queryClient.invalidateQueries({
        queryKey: withBranchKey(activeBranchId, "product-price-context", productId),
      });
      onApplied?.();
      onClose();
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const ctx = contextQuery.data;

  return (
    <>
      <DialogHeader>
        <DialogTitle>Where should this price apply?</DialogTitle>
        <DialogDescription>
          You changed a price. Choose whether it updates your whole organisation or only the branch
          you&apos;re currently working in.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {contextQuery.isPending ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : contextQuery.isError ? (
          <p className="text-sm text-destructive">
            Could not load current prices. Close and try again.
          </p>
        ) : (
          <div className="space-y-3">
            <PriceComparison
              label="Cost price"
              proposed={proposedCostPrice}
              org={ctx?.orgCostPrice}
              branch={ctx?.branchCostPrice}
              currency={currency}
            />
            <PriceComparison
              label="Selling price"
              proposed={proposedSellingPrice}
              org={ctx?.orgSellingPrice}
              branch={ctx?.branchSellingPrice}
              currency={currency}
            />
          </div>
        )}

        <div className="grid gap-2">
          <ScopeOption
            icon={Building2}
            title="Update for entire organisation"
            description="Changes the price everywhere. Branches without their own price will use this new value."
            selected={scope === "ORG"}
            onSelect={() => setScope("ORG")}
          />
          <ScopeOption
            icon={Store}
            title="Update for this branch only"
            description="Sets a price just for the branch you're viewing. Your organisation price stays the same."
            selected={scope === "BRANCH"}
            onSelect={() => setScope("BRANCH")}
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
          disabled={!scope || mutation.isPending || contextQuery.isPending}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            "Apply price"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

function PriceComparison({
  label,
  proposed,
  org,
  branch,
  currency,
}: {
  label: string;
  proposed?: number;
  org?: string | null;
  branch?: string | null;
  currency: string;
}) {
  if (proposed == null) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
      <p className="font-medium text-foreground">{label}</p>
      <dl className="mt-1.5 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Org default</dt>
          <dd className="tabular-nums">{org != null ? formatCurrency(toNumericAmount(org), currency) : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">This branch</dt>
          <dd className="tabular-nums">
            {branch != null ? formatCurrency(toNumericAmount(branch), currency) : "No override"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">New price</dt>
          <dd className="font-semibold tabular-nums text-foreground">
            {formatCurrency(proposed, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ScopeOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: typeof Building2;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "interactive-cursor flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5" : "border-border/60 hover:border-border",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
