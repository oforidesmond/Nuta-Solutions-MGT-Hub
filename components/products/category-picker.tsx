"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createCategory, fetchCategories } from "@/lib/api/categories";
import { handleApiError } from "@/lib/api/errors";
import {
  filterCategoriesBySearch,
  formatCategoryName,
  getTopCategoryMatch,
  isStrongCategoryMatch,
  isWeakCategoryMatch,
} from "@/lib/category-matching";
import type { HubCategory } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

/** Matches CatalogAssistField "Use suggestions" button treatment. */
const useExistingButtonClassName =
  "min-h-9 bg-primary/10 border-primary/25 text-primary hover:bg-primary/15 shadow-sm";

type CategoryPickerProps = {
  id: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: HubCategory[];
  onCategoryCreated?: (category: HubCategory) => void;
  onCategoriesReload?: (categories: HubCategory[]) => void;
  required?: boolean;
  disabled?: boolean;
  canCreate?: boolean;
};

export function CategoryPicker({
  id,
  value,
  onChange,
  categories,
  onCategoryCreated,
  onCategoriesReload,
  disabled,
  canCreate = true,
}: CategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 150);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const selected = useMemo(
    () => categories.find((c) => c.id === value) ?? null,
    [categories, value],
  );

  const triggerLabel = selected?.name ?? "Select category";

  const filtered = useMemo(
    () => filterCategoriesBySearch(debounced, categories),
    [debounced, categories],
  );

  const topMatch = useMemo(
    () => (debounced ? getTopCategoryMatch(debounced, categories) : null),
    [debounced, categories],
  );

  const strongMatch = isStrongCategoryMatch(topMatch);
  const weakMatch = isWeakCategoryMatch(topMatch);

  const formattedCreateName = formatCategoryName(debounced);
  const showCreate =
    canCreate &&
    debounced.length > 0 &&
    formattedCreateName.length > 0 &&
    !strongMatch;

  function selectCategory(id: string) {
    onChange(id);
    setOpen(false);
  }

  async function handleCreate() {
    if (!formattedCreateName || creating || strongMatch) return;
    setCreating(true);
    try {
      const created = await createCategory({ name: formattedCreateName });
      onCategoryCreated?.(created);
      onChange(created.id);
      toast.success("Category added");
      setOpen(false);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        toast.error("This category already exists.");
        try {
          const refreshed = await fetchCategories();
          onCategoriesReload?.(refreshed);
          const match = getTopCategoryMatch(formattedCreateName, refreshed);
          if (match) {
            onChange(match.category.id);
            setOpen(false);
          }
        } catch {
          // Parent list may still be stale; user can pick manually.
        }
        return;
      }
      toast.error(handleApiError(err));
    } finally {
      setCreating(false);
    }
  }

  const highlightedId = topMatch?.category.id;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-11 min-h-11 w-full justify-between font-normal",
              !selected && "text-muted-foreground",
            )}
          />
        }
      >
        <span className="truncate text-left">{triggerLabel}</span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(100vw-2rem,22rem)] max-h-[min(24rem,var(--available-height))] overflow-hidden p-0"
        align="start"
      >
        <div className="shrink-0 border-b border-border/40 p-2">
          <Input
            className="h-9"
            placeholder="Search or add category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search categories"
          />
        </div>

        {strongMatch && topMatch ? (
          <div className="shrink-0 space-y-2 border-b border-border/40 bg-muted/30 p-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{topMatch.category.name}</span> already
              exists.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={useExistingButtonClassName}
              onClick={() => selectCategory(topMatch.category.id)}
            >
              Use {topMatch.category.name}
            </Button>
          </div>
        ) : weakMatch && topMatch ? (
          <div className="shrink-0 border-b border-border/40 px-3 py-2">
            <p className="text-sm text-muted-foreground">
              Similar:{" "}
              <button
                type="button"
                className="font-medium text-primary hover:underline"
                onClick={() => selectCategory(topMatch.category.id)}
              >
                {topMatch.category.name}
              </button>
            </p>
          </div>
        ) : null}

        <ScrollArea className="h-64 min-h-0">
          <div className="p-1">
            {filtered.length === 0 && !showCreate ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No categories found.
              </p>
            ) : (
              <ul className="space-y-0.5">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={cn(
                        "interactive-cursor flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80",
                        value === c.id && "bg-muted",
                        highlightedId === c.id && "ring-1 ring-primary/30 bg-primary/5",
                      )}
                      onClick={() => selectCategory(c.id)}
                    >
                      <span className="font-medium">{c.name}</span>
                      {typeof c.productCount === "number" ? (
                        <span className="text-xs text-muted-foreground">{c.productCount}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>

        {showCreate ? (
          <div className="shrink-0 border-t border-border/40 p-2">
            <button
              type="button"
              disabled={creating}
              className="interactive-cursor flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80 disabled:opacity-50"
              onClick={() => void handleCreate()}
            >
              {creating ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Plus className="size-4 shrink-0 text-primary" aria-hidden />
              )}
              <span>
                Add &ldquo;{formattedCreateName}&rdquo;
              </span>
            </button>
          </div>
        ) : null}

        {value ? (
          <div className="shrink-0 border-t border-border/40 p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear selection
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
