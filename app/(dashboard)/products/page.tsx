"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConvertProductModal } from "@/components/inventory/convert-product-modal";
import { StockAdjustmentModal } from "@/components/inventory/stock-adjustment-modal";
import { StockTakeRecordModal } from "@/components/inventory/stock-take-record-modal";
import { StockTransferModal } from "@/components/inventory/stock-transfer-modal";
import { ExportButton } from "@/components/exports/export-button";
import { ProductActionsMenu } from "@/components/products/product-actions-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { HoverOrTapHint } from "@/components/ui/hover-or-tap-hint";
import { TruncatedHint } from "@/components/ui/truncated-hint";
import { fetchCategories } from "@/lib/api/categories";
import {
  deleteProduct,
  duplicateProduct,
  fetchAllProducts,
  fetchProductsPaginated,
  type ProductQueryParams,
} from "@/lib/api/products";
import { handleApiError } from "@/lib/api/errors";
import { EXPORT_ROW_CAP } from "@/lib/exports/constants";
import { buildExportFilename } from "@/lib/exports/filename";
import {
  PRODUCT_LIST_EXPORT_COLUMNS,
  productToExportRow,
} from "@/lib/exports/product-export";
import { formatCurrency } from "@/lib/format";
import { productCategoryLabel } from "@/lib/product-helpers";
import { getStockStatus, productQuantity, productReorderLevel } from "@/lib/stock-status";
import { canManageInventoryConversions, canManageStockTakes } from "@/lib/inventory-access";
import { canTransferStock } from "@/lib/branch-access";
import { useActiveBranchId } from "@/lib/hooks/use-active-branch-id";
import { withBranchKey } from "@/lib/query/branch-query-keys";
import { fetchProductConversions } from "@/lib/api/product-conversions";
import { fetchBranchesList } from "@/lib/api/branches";
import { useAuthStore } from "@/stores/auth-store";
import type { HubCategory, HubProduct, PageMeta } from "@/lib/types/domain";
import { cn } from "@/lib/utils";

type StockFilter = "all" | "in_stock" | "low" | "out";
type ViewMode = "table" | "grid";

const LIMIT_OPTIONS = [20, 50, 100] as const;
const PRODUCT_NAME_HINT_MAX = 32;

function ProductNameLink({ id, name }: { id: string; name: string }) {
  const link = (
    <Link
      href={`/products/${id}`}
      className="block truncate text-primary underline-offset-2 hover:underline"
    >
      {name}
    </Link>
  );
  if (name.length <= PRODUCT_NAME_HINT_MAX) return link;
  return (
    <HoverOrTapHint contentClassName="max-w-md" trigger={link}>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px]">
        {name}
      </pre>
    </HoverOrTapHint>
  );
}

function stockBadgeClass(tone: ReturnType<typeof getStockStatus>) {
  if (tone === "out") return "bg-destructive/15 text-destructive border-destructive/30";
  if (tone === "low") return "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100";
  return "border-emerald-600/30 bg-emerald-600/10 text-emerald-900 dark:text-emerald-100";
}

function applyClientFilters(
  items: HubProduct[],
  stockFilter: StockFilter,
  priceMin: string,
  priceMax: string,
): HubProduct[] {
  let out = items;
  const minN = priceMin === "" ? null : parseFloat(priceMin);
  const maxN = priceMax === "" ? null : parseFloat(priceMax);
  if (minN != null && Number.isFinite(minN)) {
    out = out.filter((p) => {
      const pr = Number(p.sellingPrice ?? 0);
      return Number.isFinite(pr) && pr >= minN;
    });
  }
  if (maxN != null && Number.isFinite(maxN)) {
    out = out.filter((p) => {
      const pr = Number(p.sellingPrice ?? 0);
      return Number.isFinite(pr) && pr <= maxN;
    });
  }
  if (stockFilter === "all") return out;
  return out.filter((p) => {
    const q = productQuantity(p);
    const tone = getStockStatus(q, productReorderLevel(p));
    if (stockFilter === "in_stock") return tone === "ok";
    if (stockFilter === "low") return tone === "low";
    if (stockFilter === "out") return tone === "out";
    return true;
  });
}

export default function ProductsPage() {
  const router = useRouter();
  const activeBranchId = useActiveBranchId();
  const currency = useAuthStore((s) => s.organization?.currency) ?? "GHS";
  const orgName = useAuthStore((s) => s.organization?.name) ?? "export";
  const role = useAuthStore((s) => s.user?.role);
  const canStockTake = canManageStockTakes(role);
  const canConvert = canManageInventoryConversions(role);
  const canTransfer = canTransferStock(role);
  const [categories, setCategories] = useState<HubCategory[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(20);
  const [sortBy, setSortBy] = useState<ProductQueryParams["sortBy"]>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [items, setItems] = useState<HubProduct[]>([]);
  const [meta, setMeta] = useState<PageMeta>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [stockTakeProduct, setStockTakeProduct] = useState<HubProduct | null>(null);
  const [adjustStockProduct, setAdjustStockProduct] = useState<HubProduct | null>(null);
  const [convertProduct, setConvertProduct] = useState<HubProduct | null>(null);
  const [transferProduct, setTransferProduct] = useState<HubProduct | null>(null);
  const [actionsMenuProductId, setActionsMenuProductId] = useState<string | null>(null);

  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: fetchBranchesList,
    enabled: canTransfer,
    staleTime: 60_000,
  });
  const activeBranches = useMemo(
    () => (branchesQuery.data ?? []).filter((b) => b.isActive !== false),
    [branchesQuery.data],
  );
  const canTransferStockNow = canTransfer && activeBranches.length > 1;

  const actionsConversionsQuery = useQuery({
    queryKey: withBranchKey(activeBranchId, "product-conversions", actionsMenuProductId),
    queryFn: () => fetchProductConversions(actionsMenuProductId!),
    enabled: !!actionsMenuProductId,
    staleTime: 15_000,
  });

  function hasActiveConversionForMenuRow(p: HubProduct): boolean {
    if (actionsMenuProductId !== p.id || !actionsConversionsQuery.data) return false;
    const d = actionsConversionsQuery.data;
    return (
      d.asParent.some((c) => c.isActive) ||
      d.asChild.some((c) => c.isActive)
    );
  }

  function conversionsLoadingForRow(p: HubProduct): boolean {
    return actionsMenuProductId === p.id && actionsConversionsQuery.isPending;
  }

  const clientMode = useMemo(() => {
    if (stockFilter === "in_stock" || stockFilter === "out") return true;
    if (priceMin !== "" || priceMax !== "") return true;
    return false;
  }, [stockFilter, priceMin, priceMax]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const cats = await fetchCategories().catch(() => [] as HubCategory[]);
        if (!cancelled) setCategories(cats);
      } catch {
        if (!cancelled) setCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      if (clientMode) {
        const raw = await fetchAllProducts({
          search: debouncedSearch || undefined,
          categoryId: categoryId || undefined,
          lowStock: stockFilter === "low" ? true : undefined,
          sortBy,
          sortOrder,
        });
        const filtered = applyClientFilters(raw, stockFilter, priceMin, priceMax);
        const total = filtered.length;
        const totalPages = total === 0 ? 0 : Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, Math.max(1, totalPages));
        const start = (safePage - 1) * limit;
        const slice = filtered.slice(start, start + limit);
        setItems(slice);
        setMeta({
          page: safePage,
          limit,
          total,
          totalPages,
        });
        if (safePage !== page) setPage(safePage);
      } else {
        const { items: rows, meta: m } = await fetchProductsPaginated({
          page,
          limit,
          search: debouncedSearch || undefined,
          categoryId: categoryId || undefined,
          lowStock: stockFilter === "low" ? true : undefined,
          sortBy,
          sortOrder,
        });
        setItems(rows);
        setMeta(m);
      }
    } catch (e) {
      toast.error(handleApiError(e));
      setItems([]);
      setMeta((prev) => ({ ...prev, total: 0, totalPages: 0 }));
    } finally {
      setLoading(false);
    }
  }, [
    page,
    limit,
    debouncedSearch,
    categoryId,
    stockFilter,
    sortBy,
    sortOrder,
    clientMode,
    priceMin,
    priceMax,
    activeBranchId,
  ]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, stockFilter, priceMin, priceMax, limit, sortBy, sortOrder, clientMode]);

  async function onConfirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteProduct(deleteId);
      toast.success("Product removed");
      setDeleteId(null);
      await loadProducts();
    } catch (e) {
      toast.error(handleApiError(e));
    } finally {
      setDeleting(false);
    }
  }

  async function onDuplicate(id: string) {
    try {
      const p = await duplicateProduct(id);
      toast.success("Product duplicated", {
        action: {
          label: "View",
          onClick: () => router.push(`/products/${p.id}`),
        },
      });
      await loadProducts();
    } catch (e) {
      toast.error(handleApiError(e));
    }
  }

  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1;
  const to = meta.total === 0 ? 0 : Math.min(meta.page * meta.limit, meta.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Search by name, code, or barcode. Tap a row to see full details.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            label="Export to Excel"
            filename={buildExportFilename({ orgName, reportType: "products" })}
            columns={PRODUCT_LIST_EXPORT_COLUMNS}
            disabled={loading}
            getRows={async () => {
              const raw = await fetchAllProducts({
                search: debouncedSearch || undefined,
                categoryId: categoryId || undefined,
                lowStock: stockFilter === "low" ? true : undefined,
                sortBy,
                sortOrder,
              });
              const filtered = applyClientFilters(raw, stockFilter, priceMin, priceMax);
              const truncated = filtered.length > EXPORT_ROW_CAP;
              const slice = filtered.slice(0, EXPORT_ROW_CAP);
              return {
                rows: slice.map(productToExportRow),
                truncated,
              };
            }}
          />
          <Button type="button" className="min-h-9" render={<Link href="/products/new" />}>
            <Plus className="size-4" aria-hidden />
            Add product
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="h-11 min-h-11 pl-9"
            placeholder="Search by name, SKU, or barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 shrink-0 sm:hidden"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          {filtersOpen ? "Hide filters" : "Filters"}
        </Button>
        <div
          className={cn(
            "flex flex-col gap-3 rounded-xl border border-border/40 bg-card/60 p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0",
            !filtersOpen && "hidden sm:flex",
          )}
        >
          <select
            className="h-11 min-h-11 rounded-lg border border-input bg-background px-3 text-sm interactive-cursor"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Category"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {typeof c.productCount === "number" ? ` (${c.productCount})` : ""}
              </option>
            ))}
          </select>
          <select
            className="h-11 min-h-11 rounded-lg border border-input bg-background px-3 text-sm interactive-cursor"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            aria-label="Stock status"
          >
            <option value="all">All stock levels</option>
            <option value="in_stock">In stock</option>
            <option value="low">Running low</option>
            <option value="out">Out of stock</option>
          </select>
          <div className="flex gap-2">
            <Input
              className="h-11 min-h-11"
              inputMode="decimal"
              placeholder="Min price"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              aria-label="Minimum price"
            />
            <Input
              className="h-11 min-h-11"
              inputMode="decimal"
              placeholder="Max price"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              aria-label="Maximum price"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9 self-start"
            onClick={() => {
              setCategoryId("");
              setStockFilter("all");
              setPriceMin("");
              setPriceMax("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `Showing ${from}–${to} of ${meta.total} products`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-input p-0.5">
            <Button
              type="button"
              variant={view === "table" ? "secondary" : "ghost"}
              size="sm"
              className="min-h-9"
              onClick={() => setView("table")}
              aria-pressed={view === "table"}
            >
              <List className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Table</span>
            </Button>
            <Button
              type="button"
              variant={view === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="min-h-9"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
            >
              <LayoutGrid className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only sm:ml-1">Grid</span>
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="whitespace-nowrap">Per page</span>
            <select
              className="h-9 rounded-lg border border-input bg-background px-2 text-sm interactive-cursor"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <select
            className="h-9 rounded-lg border border-input bg-background px-2 text-sm interactive-cursor"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split("-") as [ProductQueryParams["sortBy"] & string, "asc" | "desc"];
              setSortBy(sb as ProductQueryParams["sortBy"]);
              setSortOrder(so);
            }}
            aria-label="Sort by"
          >
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="sellingPrice-asc">Price (low to high)</option>
            <option value="sellingPrice-desc">Price (high to low)</option>
            <option value="stockQuantity-desc">Stock (high to low)</option>
            <option value="stockQuantity-asc">Stock (low to high)</option>
            <option value="createdAt-desc">Newest first</option>
            <option value="createdAt-asc">Oldest first</option>
          </select>
        </div>
      </div>

      {clientMode && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          Filters for price and some stock levels use the first 500 matches. Add server filters later.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<span>📦</span>}
          title={debouncedSearch || categoryId || stockFilter !== "all" ? "No matches" : "No products yet"}
          description={
            debouncedSearch || categoryId || stockFilter !== "all"
              ? "Try changing your search or filters."
              : "Add your first product to start selling it from the till."
          }
          action={{ label: "Add product", onClick: () => router.push("/products/new") }}
        />
      ) : view === "table" ? (
        <Card className="border-border/40 bg-card/80 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[1%] max-w-56">Product</TableHead>
                  <TableHead className="w-[1%] max-w-32">SKU</TableHead>
                  <TableHead className="w-[1%] max-w-36">Category</TableHead>
                  <TableHead className="w-[1%] text-right">Stock</TableHead>
                  <TableHead className="w-[1%] text-right">Cost</TableHead>
                  <TableHead className="w-[1%] text-right">Price</TableHead>
                  <TableHead className="w-px text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((p) => {
                  const q = productQuantity(p);
                  const tone = getStockStatus(q, productReorderLevel(p));
                  const cost = Number(p.costPrice ?? 0);
                  const price = Number(p.sellingPrice ?? 0);
                  return (
                    <TableRow key={p.id} className="hover:bg-muted/40">
                      <TableCell className="w-[1%] max-w-56 min-w-0 font-medium">
                        <ProductNameLink id={p.id} name={p.name} />
                      </TableCell>
                      <TableCell className="w-[1%] max-w-32 min-w-0">
                        <TruncatedHint text={p.sku ?? "-"} maxLength={16} />
                      </TableCell>
                      <TableCell className="w-[1%] max-w-36 min-w-0">
                        <TruncatedHint text={productCategoryLabel(p)} maxLength={20} monospace={false} />
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap text-right">
                        <Badge variant="outline" className={cn("tabular-nums", stockBadgeClass(tone))} title={tone === "low" ? "Below reorder level" : undefined}>
                          {Number.isFinite(q) ? q : "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap text-right tabular-nums text-muted-foreground">
                        {formatCurrency(Number.isFinite(cost) ? cost : 0, currency)}
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap text-right font-medium tabular-nums">
                        {formatCurrency(Number.isFinite(price) ? price : 0, currency)}
                      </TableCell>
                      <TableCell className="w-px whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          {canStockTake ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="min-h-9 min-w-9"
                                  aria-label={`Adjust stock for ${p.name}`}
                                  onClick={() => setAdjustStockProduct(p)}
                                >
                                  <SlidersHorizontal className="size-4" aria-hidden />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Adjust stock</TooltipContent>
                            </Tooltip>
                          ) : null}
                          <ProductActionsMenu
                            product={p}
                            canStockTake={canStockTake}
                            canConvert={canConvert}
                            canTransfer={canTransferStockNow}
                            hasConversion={hasActiveConversionForMenuRow(p)}
                            conversionsLoading={conversionsLoadingForRow(p)}
                            onAdjustStock={() => setAdjustStockProduct(p)}
                            onStockCount={() => setStockTakeProduct(p)}
                            onSplitPack={() => setConvertProduct(p)}
                            onTransferStock={() => setTransferProduct(p)}
                            onDuplicate={() => onDuplicate(p.id)}
                            onDelete={() => setDeleteId(p.id)}
                            onOpenChange={(open) => {
                              setActionsMenuProductId(open ? p.id : null);
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const q = productQuantity(p);
            const tone = getStockStatus(q, productReorderLevel(p));
            const price = Number(p.sellingPrice ?? 0);
            return (
              <Card key={p.id} className="border-border/40 bg-card/80 shadow-sm">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/products/${p.id}`} className="font-semibold text-foreground underline-offset-2 hover:text-primary hover:underline">
                      {p.name}
                    </Link>
                    <Badge variant="outline" className={cn("shrink-0 tabular-nums", stockBadgeClass(tone))}>
                      {Number.isFinite(q) ? q : "-"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-mono">{p.sku ?? "-"}</span>
                    <span className="mx-1">·</span>
                    {productCategoryLabel(p)}
                  </p>
                  <p className="text-lg font-semibold tabular-nums">{formatCurrency(Number.isFinite(price) ? price : 0, currency)}</p>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" render={<Link href={`/products/${p.id}/edit`} />}>
                      Edit
                    </Button>
                    <ProductActionsMenu
                      product={p}
                      canStockTake={canStockTake}
                      canConvert={canConvert}
                      canTransfer={canTransferStockNow}
                      hasConversion={hasActiveConversionForMenuRow(p)}
                      conversionsLoading={conversionsLoadingForRow(p)}
                      onAdjustStock={() => setAdjustStockProduct(p)}
                      onStockCount={() => setStockTakeProduct(p)}
                      onSplitPack={() => setConvertProduct(p)}
                      onTransferStock={() => setTransferProduct(p)}
                      onDuplicate={() => onDuplicate(p.id)}
                      onDelete={() => setDeleteId(p.id)}
                      onOpenChange={(open) => {
                        setActionsMenuProductId(open ? p.id : null);
                      }}
                      triggerVariant="labelled"
                      align="start"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {meta.totalPages > 1 ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>
              This hides the product from sales. If you are not sure, cancel and check with your manager first.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void onConfirmDelete()}>
              {deleting ? "Removing…" : "Delete product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockAdjustmentModal
        open={!!adjustStockProduct}
        onOpenChange={(open) => {
          if (!open) setAdjustStockProduct(null);
        }}
        product={adjustStockProduct}
        onAdjusted={() => loadProducts()}
      />

      <StockTakeRecordModal
        open={!!stockTakeProduct}
        onOpenChange={(open) => {
          if (!open) setStockTakeProduct(null);
        }}
        product={stockTakeProduct}
        onRecorded={() => loadProducts()}
      />

      <ConvertProductModal
        open={!!convertProduct}
        onOpenChange={(open) => {
          if (!open) setConvertProduct(null);
        }}
        product={convertProduct}
        onSuccess={() => loadProducts()}
      />

      {canTransferStockNow ? (
        <StockTransferModal
          open={!!transferProduct}
          onOpenChange={(open) => {
            if (!open) setTransferProduct(null);
          }}
          branches={activeBranches}
          presetProduct={
            transferProduct
              ? { id: transferProduct.id, name: transferProduct.name ?? "Product" }
              : null
          }
        />
      ) : null}
    </div>
  );
}
