"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCatalogAssist } from "@/lib/api/catalog-assist";
import { validateProductName } from "@/lib/product-naming";
import type { CatalogAssistResponse } from "@/lib/types/catalog-assist";
import type { HubCategory } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

/** Subtle filled treatment so "Use suggestions" reads as a button, not helper text. */
export const useSuggestionsButtonClassName =
  "min-h-9 bg-primary/10 border-primary/25 text-primary hover:bg-primary/15 shadow-sm";

export type CatalogAssistFieldMode = "promote" | "create" | "edit";

export type CatalogAssistFieldHandle = {
  /** Run client-side name validation; returns false when invalid. */
  validateName: () => boolean;
  /** Apply server or assist suggested name (e.g. after PRODUCT_NAME_INVALID). */
  applySuggestedName: (suggestedName: string) => void;
  /** Clear external/server name error. */
  clearNameError: () => void;
  /** Whether catalog suggestions are available to apply. */
  canUseSuggestions: () => boolean;
  /** Apply assist suggestions (name + category). */
  useSuggestions: () => void;
};

type CatalogAssistFieldProps = {
  mode: CatalogAssistFieldMode;
  name: string;
  onNameChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: HubCategory[];
  excludeProductId?: string;
  /** Initial draft when dialog opens — triggers assist fetch even before edits. */
  initialDraftName?: string;
  categoryRequired?: boolean;
  nameError?: string | null;
  onNameErrorChange?: (message: string | null) => void;
  onAssistLoaded?: (response: CatalogAssistResponse | null) => void;
  /** Notifies parent when Use suggestions becomes available (e.g. dialog footer). */
  onCanUseSuggestionsChange?: (canUse: boolean) => void;
};

export const CatalogAssistField = forwardRef<CatalogAssistFieldHandle, CatalogAssistFieldProps>(
  function CatalogAssistField(
    {
      mode,
      name,
      onNameChange,
      categoryId,
      onCategoryChange,
      categories,
      excludeProductId,
      initialDraftName,
      categoryRequired = false,
      nameError: externalNameError,
      onNameErrorChange,
      onAssistLoaded,
      onCanUseSuggestionsChange,
    },
    ref,
  ) {
    const nameId = useId();
    const categoryIdAttr = useId();

    const [assist, setAssist] = useState<CatalogAssistResponse | null>(null);
    const [assistLoading, setAssistLoading] = useState(false);
    const [categoryTouched, setCategoryTouched] = useState(false);
    const [internalNameError, setInternalNameError] = useState<string | null>(null);
    const [debouncedDraft, setDebouncedDraft] = useState(name);
    const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
    const preselectAppliedRef = useRef<string | null>(null);

    const nameError = externalNameError ?? internalNameError;

    useEffect(() => {
      const t = setTimeout(() => setDebouncedDraft(name.trim()), 300);
      return () => clearTimeout(t);
    }, [name]);

    const loadAssist = useCallback(async () => {
      const draft = debouncedDraft;
      if (!draft) {
        setAssist(null);
        onAssistLoaded?.(null);
        return;
      }
      setAssistLoading(true);
      try {
        const response = await fetchCatalogAssist({
          draftName: draft,
          excludeProductId,
        });
        setAssist(response);
        onAssistLoaded?.(response);
      } catch {
        setAssist(null);
        onAssistLoaded?.(null);
      } finally {
        setAssistLoading(false);
      }
    }, [debouncedDraft, excludeProductId, onAssistLoaded]);

    useEffect(() => {
      void loadAssist();
    }, [loadAssist]);

    // Reset touch state when a new draft session starts (e.g. new temp item).
    useEffect(() => {
      setCategoryTouched(false);
      setSuggestionsDismissed(false);
      preselectAppliedRef.current = null;
    }, [initialDraftName, excludeProductId]);

    function handleNameBlur() {
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (active?.closest("[data-catalog-assist-zone]")) return;
        setSuggestionsDismissed(true);
      });
    }

    // Pre-select category when backend is confident and owner has not chosen manually.
    useEffect(() => {
      if (!assist || categoryTouched) return;
      const suggestedId = assist.suggestedCategoryId;
      if (!suggestedId) return;
      const exists = categories.some((c) => c.id === suggestedId);
      if (!exists) return;
      const key = `${excludeProductId ?? "new"}:${assist.draftName}:${suggestedId}`;
      if (preselectAppliedRef.current === key) return;
      preselectAppliedRef.current = key;
      onCategoryChange(suggestedId);
    }, [assist, categories, categoryTouched, excludeProductId, onCategoryChange]);

    const clientValidation = validateProductName(name);

    useEffect(() => {
      if (externalNameError != null) return;
      if (!name.trim()) {
        setInternalNameError(null);
        return;
      }
      if (!clientValidation.valid) {
        setInternalNameError(clientValidation.humanMessage);
      } else {
        setInternalNameError(null);
      }
    }, [name, clientValidation.valid, clientValidation.humanMessage, externalNameError]);

    const suggestedName = assist?.suggestedName?.trim() ?? "";

    const showCatalogPanel =
      assist?.source === "catalog_pattern" &&
      suggestedName.length > 0 &&
      suggestedName !== name.trim() &&
      !suggestionsDismissed;

    const canUseSuggestions =
      !!assist &&
      suggestedName.length > 0 &&
      (suggestedName !== name.trim() ||
        (!!assist.suggestedCategoryId && assist.suggestedCategoryId !== categoryId));

    const showUseSuggestions = canUseSuggestions && !suggestionsDismissed;

    useEffect(() => {
      onCanUseSuggestionsChange?.(showUseSuggestions);
    }, [showUseSuggestions, onCanUseSuggestionsChange]);

    const applySuggestions = useCallback(() => {
      if (!assist?.suggestedName) return;
      onNameChange(assist.suggestedName);
      onNameErrorChange?.(null);
      setInternalNameError(null);
      if (assist.suggestedCategoryId) {
        const exists = categories.some((c) => c.id === assist.suggestedCategoryId);
        if (exists) {
          onCategoryChange(assist.suggestedCategoryId);
          setCategoryTouched(false);
        }
      }
      setSuggestionsDismissed(true);
    }, [assist, categories, onCategoryChange, onNameChange, onNameErrorChange]);

    useImperativeHandle(
      ref,
      () => ({
        validateName: () => {
          if (!name.trim()) {
            const msg = "Product name is required.";
            setInternalNameError(msg);
            onNameErrorChange?.(msg);
            return false;
          }
          const result = validateProductName(name);
          if (!result.valid) {
            setInternalNameError(result.humanMessage);
            onNameErrorChange?.(result.humanMessage);
            return false;
          }
          setInternalNameError(null);
          onNameErrorChange?.(null);
          return true;
        },
        applySuggestedName: (suggestedName: string) => {
          onNameChange(suggestedName);
          setInternalNameError(null);
          onNameErrorChange?.(null);
        },
        clearNameError: () => {
          setInternalNameError(null);
          onNameErrorChange?.(null);
        },
        canUseSuggestions: () => showUseSuggestions,
        useSuggestions: applySuggestions,
      }),
      [applySuggestions, showUseSuggestions, name, onNameChange, onNameErrorChange],
    );

    const categoryHintText =
      assist?.categoryHint ??
      (assist?.suggestedCategoryId && assist.suggestedCategoryName && !categoryTouched
        ? `Suggested — similar products use ${assist.suggestedCategoryName}.`
        : null);

    const reference = assist?.referenceProducts?.[0];

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={nameId}>
            {mode === "promote" ? "Name" : "Product name"} *
          </Label>
          <Input
            id={nameId}
            className={cn("min-h-11", nameError && "border-destructive")}
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
              onNameErrorChange?.(null);
            }}
            onFocus={() => setSuggestionsDismissed(false)}
            onBlur={handleNameBlur}
            autoComplete="off"
            aria-invalid={!!nameError}
          />
          <p className="text-xs text-muted-foreground">
            Title Case: Brand + Product Name + Size (e.g. Vaseline Aloe Pomade 500g).
          </p>
          {nameError ? (
            <p className="text-sm text-destructive">{nameError}</p>
          ) : null}
        </div>

        {assistLoading && !suggestionsDismissed ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking your catalog…
          </div>
        ) : null}

        {showCatalogPanel ? (
          <div
            data-catalog-assist-zone
            className="space-y-2 rounded-lg border border-border/40 bg-muted/30 p-4"
          >
            <p className="text-sm text-muted-foreground">
              Suggested:{" "}
              <span className="font-medium text-foreground">{suggestedName}</span>
            </p>
            {reference ? (
              <p className="text-sm text-muted-foreground">
                Similar:{" "}
                <Link
                  href={`/products/${reference.id}`}
                  className="font-medium text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {reference.name} →
                </Link>
              </p>
            ) : null}
            {onCanUseSuggestionsChange == null && showUseSuggestions ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={useSuggestionsButtonClassName}
                onClick={applySuggestions}
              >
                Use suggestions
              </Button>
            ) : null}
          </div>
        ) : assistLoading && !suggestionsDismissed ? (
          <Skeleton className="h-16 w-full rounded-lg" />
        ) : null}

        <div className="space-y-2">
          <Label htmlFor={categoryIdAttr}>
            Category
            {categoryRequired ? " *" : null}
          </Label>
          <select
            id={categoryIdAttr}
            className="flex h-11 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm interactive-cursor"
            value={categoryId}
            onChange={(e) => {
              setCategoryTouched(true);
              onCategoryChange(e.target.value);
            }}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {categoryHintText ? (
            <p className="text-xs text-muted-foreground">{categoryHintText}</p>
          ) : null}
        </div>
      </div>
    );
  },
);
