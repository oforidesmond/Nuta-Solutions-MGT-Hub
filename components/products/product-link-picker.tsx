"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchProductsPaginated } from "@/lib/api/products";
import type { HubProduct } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

export type ProductPickValue = { id: string; name: string };

type ProductLinkPickerProps = {
  id: string;
  label: string;
  placeholder: string;
  excludeProductId?: string;
  value: ProductPickValue | null;
  onChange: (next: ProductPickValue | null) => void;
  disabled?: boolean;
};

export function ProductLinkPicker({
  id,
  label,
  placeholder,
  excludeProductId,
  value,
  onChange,
  disabled,
}: ProductLinkPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HubProduct[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items: rows } = await fetchProductsPaginated({
        page: 1,
        limit: 20,
        search: debounced || undefined,
        sortBy: "name",
        sortOrder: "asc",
      });
      const filtered = excludeProductId
        ? rows.filter((p) => p.id !== excludeProductId)
        : rows;
      setItems(filtered);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debounced, excludeProductId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const triggerLabel = useMemo(() => {
    if (value) return value.name;
    return placeholder;
  }, [value, placeholder]);

  return (
    <div className="space-y-2">
      <Label htmlFor={`${id}-trigger`}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={`${id}-trigger`}
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "h-11 min-h-11 w-full justify-between font-normal",
                !value && "text-muted-foreground",
              )}
            />
          }
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-[min(100vw-2rem,22rem)] p-0" align="start">
          <div className="border-b border-border/40 p-2">
            <Input
              className="h-9"
              placeholder="Search by name, SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <ScrollArea className="h-64">
            <div className="p-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Searching…
                </div>
              ) : items.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No products found.</p>
              ) : (
                <ul className="space-y-0.5">
                  {items.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80",
                          value?.id === p.id && "bg-muted",
                        )}
                        onClick={() => {
                          onChange({ id: p.id, name: p.name ?? "Product" });
                          setOpen(false);
                        }}
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.sku ? (
                          <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
          {value ? (
            <div className="border-t border-border/40 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                Clear selection
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
