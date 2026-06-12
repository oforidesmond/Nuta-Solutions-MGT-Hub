"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  Boxes,
  ClipboardCheck,
  Copy,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { HubProduct } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type ProductActionsMenuProps = {
  product: HubProduct;
  canStockTake: boolean;
  canConvert: boolean;
  hasConversion: boolean;
  conversionsLoading: boolean;
  onAdjustStock: () => void;
  onStockCount: () => void;
  onSplitPack: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenChange?: (open: boolean) => void;
  /** Table rows use icon-only trigger; grid cards use labelled "More" button. */
  triggerVariant?: "icon" | "labelled";
  align?: "start" | "end";
};

function InventoryMenuItem({
  icon: Icon,
  title,
  description,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <DropdownMenuItem
      className="items-start gap-2.5 py-2.5 focus:bg-primary/10"
      disabled={disabled}
      onClick={onClick}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium leading-tight text-foreground">{title}</span>
        <span className="text-xs leading-snug text-muted-foreground">{description}</span>
      </span>
    </DropdownMenuItem>
  );
}

function StandardMenuItem({
  icon: Icon,
  title,
  href,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const content = (
    <>
      <Icon className="size-4 text-muted-foreground" aria-hidden />
      <span>{title}</span>
    </>
  );

  if (href) {
    return (
      <DropdownMenuItem className="py-2" render={<Link href={href} />}>
        {content}
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuItem className="py-2" disabled={disabled} onClick={onClick}>
      {content}
    </DropdownMenuItem>
  );
}

export function ProductActionsMenu({
  product,
  canStockTake,
  canConvert,
  hasConversion,
  conversionsLoading,
  onAdjustStock,
  onStockCount,
  onSplitPack,
  onDuplicate,
  onDelete,
  onOpenChange,
  triggerVariant = "icon",
  align = "end",
}: ProductActionsMenuProps) {
  const showInventorySection = canStockTake || canConvert;

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          triggerVariant === "icon" ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="min-h-9 min-w-9"
              aria-label={`Actions for ${product.name}`}
            />
          ) : (
            <Button type="button" variant="outline" size="sm" className="min-h-9 gap-1.5" />
          )
        }
      >
        {triggerVariant === "icon" ? (
          <MoreHorizontal className="size-4" aria-hidden />
        ) : (
          <>
            More
            <MoreHorizontal className="size-4" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-64 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate px-2 py-1.5 text-sm font-medium text-foreground">
            {product.name}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel>Product</DropdownMenuLabel>
          <StandardMenuItem icon={ExternalLink} title="View details" href={`/products/${product.id}`} />
          <StandardMenuItem icon={Pencil} title="Edit" href={`/products/${product.id}/edit`} />
        </DropdownMenuGroup>

        {showInventorySection ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup
              className={cn(
                "rounded-md border border-primary/15 bg-primary/4 p-1 dark:bg-primary/6",
              )}
            >
              <DropdownMenuLabel className="px-2 text-primary">Inventory</DropdownMenuLabel>
              {canStockTake ? (
                <>
                  <InventoryMenuItem
                    icon={SlidersHorizontal}
                    title="Adjust stock"
                    description="Add, remove, or correct on-hand quantity"
                    onClick={onAdjustStock}
                  />
                  <InventoryMenuItem
                    icon={ClipboardCheck}
                    title="Stock count"
                    description="Reconcile physical count with system"
                    onClick={onStockCount}
                  />
                </>
              ) : null}
              {canConvert && conversionsLoading ? (
                <DropdownMenuItem className="items-start gap-2.5 py-2.5" disabled>
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium leading-tight">Split/Pack</span>
                    <span className="text-xs text-muted-foreground">Checking conversion…</span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              {canConvert && hasConversion && !conversionsLoading ? (
                <InventoryMenuItem
                  icon={Boxes}
                  title="Split/Pack"
                  description="Convert between packs and singles"
                  onClick={onSplitPack}
                />
              ) : null}
            </DropdownMenuGroup>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <StandardMenuItem icon={Copy} title="Duplicate" onClick={onDuplicate} />
        </DropdownMenuGroup>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" className="py-2" onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            Delete product
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
