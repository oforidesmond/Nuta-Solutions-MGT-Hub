# NutaPOS Management Hub - Design & integration

This document describes how the hub works in **this repository**: structure, auth, navigation, data patterns, and a **deep pass on products** (model, APIs, UI, inventory, sales interactions, edge cases).

---

## 1. Repository overview

### 1.1 Two surfaces in one Next.js app

| Surface | Route group | Who |
| --- | --- | --- |
| **Tenant Management Hub** | `(dashboard)` - `/`, `/products`, etc. | `ADMIN`, `MANAGER`, `STAFF`, `SALES_AGENT` (organisation-scoped users) |
| **Platform Admin Console** | `(platform)` - `/platform`, … | `SUPER_ADMIN` with **`organizationId === null`** |

They use different shells and API modules (`lib/api/*` vs `lib/api/platform/*`). `postLoginRedirect` in `lib/platform-access.ts` sends SUPER_ADMIN users to `/platform` and everyone else to `/`.

### 1.2 Layout & auth gates

- **Root:** `app/layout.tsx` - `QueryProvider`, `AuthProvider`, global toaster.
- **Tenant:** `app/(dashboard)/layout.tsx` - `DashboardAuthGate` → `DashboardShell`.
- **Platform:** `app/(platform)/layout.tsx` - `PlatformAuthGate` → `PlatformShell`.
- **No `middleware.ts`:** route protection is handled in gate components plus API authorization.

Session lives in **`stores/auth-store.ts`** (Zustand).

### 1.3 Tenant navigation

- **Config:** `components/layout/nav-config.ts` (`navSections`, `mobileBottomNav`).
- **Sidebar:** `components/layout/app-sidebar.tsx` hides `/inventory/stock-take` unless `canManageStockTakes(role)` (`lib/inventory-access.ts`).
- **Operations subtree** (`/operations/*`): gated by `app/(dashboard)/operations/layout.tsx` using `canViewStaffReliability` (`lib/operations-access.ts`).

### 1.4 Data layer conventions

- **HTTP:** authenticated client `lib/api/client.ts`, paths in `lib/api/endpoints.ts`.
- **Server state:** TanStack Query v5 (`components/providers/query-provider.tsx`) on many list/dashboard pages.
- **Types:** `lib/types/domain.ts`, `lib/types/phase2.ts`, etc.

---

# 2. Products - complete reference

This section is exhaustive for **everything the frontend implements** around catalogue products: types, endpoints, screens, helpers, how stock is interpreted, how categories attach, how inventory and sales relate, and what is wired only in API code but not in UI.

---

## 2.1 Domain type: `HubProduct`

Defined in `lib/types/domain.ts`. The API may return **string or number** for numeric fields; the UI usually coerces with `Number(...)`.

| Field | Role |
| --- | --- |
| `id` | UUID string - primary key for routes and mutations. |
| `name` | Display name - **required** in forms. |
| `sku` | Optional stock-keeping identifier; monospace in tables. |
| `barcode` | Optional barcode; used heavily for **temporary items** promotion (required there). |
| `description` | Longer text; optional. |
| `categoryId` | FK to category when API uses relational style. |
| `category` | **Polymorphic:** may be **`HubCategory`**, **`string`** (legacy label), or null. Display uses `productCategoryLabel()` (below). |
| `costPrice` | Unit cost - form requires ≥ 0. |
| `sellingPrice` | Retail/unit sell price - form requires ≥ cost (validation warns if sell &lt; cost). |
| `currentStock` | Common Prisma/API name for on-hand qty. |
| `stockQuantity` | Alternate API name - **both** supported (see §2.5). |
| `reorderLevel` | When set and &gt; 0, drives “low stock” colouring vs quantity; if unset, heuristic applies (§2.5). |
| `unit` / `unitOfMeasure` | Unit label (“pcs”, “boxes”…); form writes **both** to the API for compatibility. |
| `taxable`, `customTaxRate`, `taxRate` | Present on model and on `ProductWriteBody`; **product form does not expose them** - backend defaults apply unless PATCH’d elsewhere. |
| `isActive` | Soft-active flag; **low stock fallback** and **expiring fallback** filters use `isActive !== false`. |
| `expirySummary` | Optional human string from API. |
| `nearestExpiryDate` | ISO date - powers **Expiring soon** page and dashboard fallback aggregation. |
| `createdAt`, `updatedAt` | Shown on product detail card. |
| `batches` | Optional **`HubBatch[]`** embedded on `GET /products/:id` (used on detail **Batches** tab). |

**`HubBatch`** (attached to products): `id`, `productId`, `batchNumber`, `quantity`, `remainingQuantity`, `expiryDate`, `manufacturedDate`, `isExpired`, `notes`, optional nested `product` stub (`id`, `name`, `sku`).

---

## 2.2 Write payload: `ProductWriteBody`

`lib/api/products.ts` builds PATCH/POST bodies. All fields optional on PATCH unless business rules say otherwise.

| Field | Typical use |
| --- | --- |
| `name` | Required on create (enforced client-side). |
| `sku`, `barcode`, `description` | Trimmed strings or omitted when empty. |
| `categoryId` | Omit when unset (“Select category” = no id). |
| `category` | Supported for backends that accept free-text category (Prisma-style); **form does not use it**. |
| `costPrice`, `sellingPrice`, `taxRate`, `customTaxRate`, `taxable` | Tax trio unused in UI. |
| `initialStock`, `stockQuantity`, `currentStock` | Form maps **entered stock** to **`currentStock`** only (`ProductForm`). |
| `reorderLevel` | Parsed float or omitted. |
| `unit` + `unitOfMeasure` | Both set from single “Unit of measure” field. |
| `isActive` | Not toggled on current form - delete flow uses **`DELETE`** instead. |

**Create vs edit stock field**

- **Create:** label “Starting stock quantity”; sending a numeric value sets `currentStock` on POST.
- **Edit:** label “Current stock quantity”; initial value = `productQuantity(p)` (§2.5); same PATCH uses `currentStock` when changed.

---

## 2.3 Product REST endpoints (tenant API)

Declared in `lib/api/endpoints.ts`, called from `lib/api/products.ts` unless noted.

| Method | Path | Function | UI usage |
| --- | --- | --- | --- |
| GET | `/products` | `fetchProductsPaginated` | Product list; unwraps `{ items, meta }` via list helper |
| GET | `/products/:id` | `fetchProduct` | Detail page, edit form preload |
| POST | `/products` | `createProduct` | New product |
| PATCH | `/products/:id` | `updateProduct` | Edit product |
| DELETE | `/products/:id` | `deleteProduct` | Detail delete, list delete, **temporary item “ignore”** |
| POST | `/products/:id/duplicate` | `duplicateProduct` | Detail + list row |
| PATCH | `/products/:id/pricing` | `updateProductPricing` | **`updateProductPricing` only - no page calls it today** |
| GET | `/products/low-stock` | `fetchLowStockProducts` | Low stock alerts page (**with 404 fallback** - §2.12) |
| GET | `/products/expiring-soon` | `fetchExpiringSoonProducts` | Expiring page (**with 404 fallback** - §2.12) |
| GET | `/products/:id/stock-history` | `fetchStockHistory` | Detail tab **Stock history** - array / `.data` / `.history` / `.adjustments` tolerant unwrap |
| GET | `/products/:id/inventory-events` | `fetchInventoryEvents` | **InventoryEventHistorySheet** on detail |
| GET | `/products/temporary` | `fetchTemporaryItems` | Temporary items page (+ hook `useTemporaryItems`) |
| POST | `/products/from-temporary/:tempItemId` | `promoteFromTemporary` | Promote modal - **`snake_case` body keys** (`cost_price`, `category_id`, `stock_quantity`, `barcode`, `selling_price`, `name`) |
| *(high limit helper)* | `GET /products?page=1&limit=500` | `fetchProducts` | Dashboard fallback aggregation, category dropdown source for large lists |

List query params for paginated catalogue: **`page`, `limit`, `search`, `categoryId`, `lowStock`** (boolean), **`sortBy`** ∈ `name` \| `createdAt` \| `stockQuantity` \| `sellingPrice`, **`sortOrder`** `asc`|`desc`.

---

## 2.4 Categories and products

### Data model

- **`HubCategory`:** `id`, `name`, optional `description`, optional **`productCount`** (shown in product list category `<select>` when present).

### APIs (`lib/api/categories.ts`)

- `GET /categories` - product form + product list filters + temporary promote dialog + categories admin page.
- `GET /categories/:id`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` - categories CRUD on `/categories` page only.
- `GET /categories/:id/products` - implemented as **`fetchCategoryProducts`** - **nothing in the frontend imports this** today; filtering by category on `/products` uses **`categoryId`** on **`GET /products`** instead.

### Display helper

```ts
// lib/product-helpers.ts - verbatim behaviour
productCategoryLabel(p): string
```

Returns category **name** if `category` is an object; the string itself if legacy string; **`"-"`** if missing.

### Form wiring

Product form **`categoryId`** select: plain `<select>` with “Select category”; optional (empty allowed). Hydration from `fetchProduct`:

- Prefer `categoryId`; else nested `category.id` when `category` is object.

---

## 2.5 Quantity calculation and “running low” rules

Central logic: **`lib/stock-status.ts`**.

### Canonical quantity (`productQuantity`)

```text
raw = stockQuantity ?? currentStock ?? 0
parse string to float → if finite, use it; else 0
```

So whichever field the API prefers wins; **`stockQuantity` takes precedence** when both exist.

### Reorder parsing (`productReorderLevel`)

Null/empty → **null**. Otherwise parse float; valid only if **finite and &gt; 0**.

### Status tone (`getStockStatus(quantity, reorderLevel)`)

Returns **`ok` \| `low` \| `out`**:

1. Quantity **≤ 0** or non-finite → **`out`**.
2. Else threshold =
   - if `reorderLevel` valid → `reorderLevel`
   - else **`DEFAULT_LOW_STOCK_MAX`** (= **5**) - heuristic when API omits reorder.
3. If `quantity <= threshold` → **`low`**; else **`ok`**.

Badge colours tie to tone on **`/products`**, grids, rows, detail card.

---

## 2.6 Product UI routes and responsibilities

| Path | Implementation | Behaviour |
| --- | --- | --- |
| `/products` | `app/(dashboard)/products/page.tsx` | Main catalogue |
| `/products/new` | `.../products/new/page.tsx` | Renders **`ProductForm` `mode="create"`** |
| `/products/[id]` | `.../products/[id]/page.tsx` | Detail: summary, batches table, stock history, placeholder sales tab |
| `/products/[id]/edit` | `.../products/[id]/edit/page.tsx` | **`ProductForm` `mode="edit"`** |
| `/products/expiring` | `.../products/expiring/page.tsx` | Expiring-soon workflow |
| `/inventory/alerts` | Nav label “Low stock” | Uses product low-stock endpoints + fallback |
| `/inventory/temporary-items` | Temporary barcodes aggregation | Lifecycle **before** full product |

**`ProductForm`** - `components/products/product-form.tsx`  
Sections: Basic info (name *, sku, barcode, category, description), Pricing (cost *, sell * + margin hint), Inventory (starting/current stock, reorder, unit), optional **Batch & expiry on create only** (`trackBatch` → after save calls **`createBatch`** - §2.8).

---

## 2.7 Product list (`/products`) - behaviour details

### Data loading

1. Loads **categories** once (`fetchCategories`) for filter `<select>`; failures → empty categories.
2. Debounced search (300 ms).

### Pagination and “client mode”

If user picks **stock filter** `In stock` or `Out`, or fills **price min/max**, the UI switches **`clientMode`**: it fetches **up to 500** products with server params for search/category/lowStock/sort, then applies **filters in the browser**:

- Price min/max filters on `Number(sellingPrice)`.
- Stock filter uses **`getStockStatus` + `productQuantity`**.

Otherwise it passes **`page`, `limit`** straight to **`fetchProductsPaginated`**.

When `clientMode` is on, UI shows yellow helper: *filters use first 500 matches*.

### “Running low” special case

When stock filter is **`Running low`**, **`clientMode` stays false**: the list is **server-driven** pagination with **`GET /products?lowStock=true`**. **`clientMode`** activates only for **`In stock`**, **`Out of stock`**, or **price min/max** filters; those paths fetch **500** rows first but still attach **`lowStock: true`** when the stock dropdown is **`low`** at the same time, then apply client filtering on top.

### Sort options (server-side)

Mapped to **`sortBy` + `sortOrder`**: name asc/desc, sellingPrice asc/desc, stockQuantity asc/desc (note: API sort key **`stockQuantity`** while display uses **`productQuantity`**), createdAt asc/desc.

### Row capabilities

Per row/link: view detail, edit, duplicate (`duplicateProduct`), delete confirm. **`canManageStockTakes(role)`**: extra **clipboard** shortcut + **`StockTakeRecordModal`** preset with that `HubProduct` (§2.11).

### Intentionally weak / stubbed UX

**“Export to Excel”** - button fires **`toast.message("Export to Excel will be available soon.")`** only; **no export**.

---

## 2.8 Batches tied to products

### Creation from product wizard

After **`createProduct`** succeeds, if user enabled **track batches**, form posts **`POST /batches`** via **`createBatch`** with payload:

```ts
{
  productId: saved.id,
  batchNumber: trimmed,
  quantity: parsed float from batch qty,
  expiryDate: ISO from `<input type="date">`,
  costPriceAtPurchase: costPrice from pricing card,
}
```

Failure on batch keeps product saved - **toast error** only for batch step.

### Global batches page `/batches`

`app/(dashboard)/batches/page.tsx` pulls:

- **`fetchBatches({ limit: 100 })`** main table,
- **`fetchExpiringBatches`**, **`fetchExpiredBatches`**, **`removeExpiredBatch`** for sidebar cards.

Shows **`b.product?.name`** when batch embeds product stub - **navigation** relies on **`Link`/product name**, not mandatory link to SKU.

### Detail page batches tab

Renders **`product.batches`** from **`GET /products/:id`**: displays `remainingQuantity ?? quantity`, `expiryDate`, expired badge vs active.

Batch listing API **`fetchBatches`** supports **`productId`, `from`, `to`** query keys - **`/batches` page does not pass `productId` today** (global list).

---

## 2.9 Product detail (`/products/[id]`)

### Header actions

- **View inventory events** (`InventoryEventHistorySheet`) → `GET .../inventory-events`; rows show `HubInventoryEvent` (`eventType`, `quantityChange`, staff, referenceId/type).
- **Duplicate**, **Edit**, **Delete** (confirmation: “hidden from new sales”).

### Stock history tab

Loads **`fetchStockHistory(id)`** when tab selected; entries **`HubStockAdjustment`**: displays `quantityChange` colouring, **`type`** (underscores → spaces), `user`, notes.

### Stock history vs inventory events

| Source | Intended story (per UI copy) |
| --- | --- |
| **Stock history** | Adjustment-style audit |
| **Inventory events sheet** | *“Mobile-posted audit trail: sales, returns, adjustments, restocks”* |

Different endpoints and normalizers - engineers should keep both when debugging “missing line” reports.

### Sales tab

Label **“Sales (soon)”** - static muted text · **no `GET`-by-product line items wired**.

---

## 2.10 Low stock alerts (`/inventory/alerts`)

1. Try **`fetchLowStockProducts()`**.
2. If response non-throwing and **length &gt; 0** → display.
3. Else on **axios 404** only → **`fetchProducts()`** (≤500 aggregated helper), **`isActive !== false`**, filter where **`getStockStatus` ∈ { low, out }**.

**Shortfall helper** displays gap between **`reorderLevel`** and qty; if reorder null uses **`max(0, 5 − q)`** aligned with heuristic.

---

## 2.11 Expiring soon (`/products/expiring`)

1. Try **`fetchExpiringSoonProducts()`**.
2. If **length &gt; 0**, use API list.
3. Else if **404** → **`fetchProducts()`**, active products, **`nearestExpiryDate` within 90 days** (and ≥ today via `daysUntil`).

Badge severity: **`≤30` days destructive**, else secondary.

---

## 2.12 Stock takes (effect on catalog quantity)

Modal **`StockTakeRecordModal`** (`components/inventory/stock-take-record-modal.tsx`):

**POST `/inventory/stock-takes`** with `{ productId, physicalCount, notes?, branchId? }`.

Shows **system stock** via **`productQuantity(product)`**.

**Branches:** `fetchBranchesList` (`GET /branches`) via React Query **`enabled: open`**. **`activeBranches`**, branch `<select>` only if **more than one** branch returned; otherwise hidden. **`/branches` hub page remains a backend placeholder**, but **`/branches` list API** - if absent - yields empty branch list gracefully.

Success toast summarizes **`quantityBefore` → `quantityAfter` (Δ)** from parsed **`StockTakeRow`**.

**History:** `/inventory/stock-take` lists paginated takes with **`product.id`, `product.name`, `product.sku`**, variance and financial aggregates when returned.

Stock take capability on product rows / nav matches **`canManageStockTakes`** - same rule as **`/inventory/stock-take`**.

---

## 2.13 Stock adjustments log (`/inventory/adjustments`)

**`fetchInventoryAdjustmentsPage`** reads **`GET /inventory/adjustments`** with dates + pagination + **`staffId`**.

Rows are **`Record<string, unknown>`**: UI renders **generic key/value formatting** (`cellDisplay`). **Whether each row exposes `productId` / SKU depends entirely on backend shape** - the hub **does not** enforce a typed product slice here.

Interpretation for products: adjustments are organisation-level deltas; correlate with **`HubInventoryEvent` per product** on the sheet when SKU-level investigation is needed.

---

## 2.14 Temporary items (pre-catalog products sold at till)

`/inventory/temporary-items` - **`GET /products/temporary`**.

Normalized fields include **`quantitySold`** (alternate keys `temporarySoldCount`), **`firstSoldAt`**, **`aggregateId`**.

**Promote**

- Opens dialog; requires **category**, **positive cost**, valid sell, **`stock_quantity` integer ≥ 0**, **trimmed barcode & name**.
- **`promoteFromTemporary`** uses **snake_case** JSON (`cost_price`, `category_id`, `stock_quantity`, `barcode`, `selling_price`, `name`).

**Ignore / dismiss**

- Calls **`deleteProduct(ignoreTarget.id)`** - backend model treats temporary IDs as removable via product delete semantics; UI toast: *removed from queue*.

Deep links from notifications (§2.16) scroll/highlight **`highlightProductId` / `aggregateId`**.

---

## 2.15 Sales hub vs product stock (what happens when sold)

**Point-of-sale** lives on mobile; tenant hub **`/sales`** lists **`HubSale`** rows (pagination, totals, filters) via **`fetchSalesPage`** (`GET /sales`). **`HubSale`** has **aggregate** sale fields (**`totalAmount`, `receiptNumber`, `soldAt`, `createdBy`**...) - **not per-line SKU payload** on that type.

Impact on **`HubProduct.stockQuantity/currentStock`** is **computed server-side** when sales sync; **`HubInventoryEvent` `eventType`** may read **`SALE`** (plus `RETURN`, `ADJUSTMENT`, `RESTOCK`). That is how the hub **surfaces stock impact** tied to catalogue entries without reinventing ledger math in TS.

Sales **export** CSV: separate endpoint blob download - unrelated to SKU detail view.

---

## 2.16 Returns (`/returns`)

**`HubReturnDetail`** exposes **`returnedItems[]`** optionally with **`productId`, `productName`, quantity, unitPrice`** (`lib/types/phase2.ts`). Refunds/restocks are processed server-side; hub UI focuses on reconciliation not batch editing (`returns` routes under `sales/...` for specifics).

---

## 2.17 Dashboard KPIs referencing products (`/`)

`fetchDashboardSummary` (`lib/api/dashboard.ts`):

Primary path **`GET /dashboard/summary`** for **`inventoryCount`, `lowStockCount`, `expiringSoonCount`, totalSales`** etc.

When that returns **404**, client **fallback** runs:

| Metric | Fallback logic |
| --- | --- |
| `inventoryCount` | **`fetchProducts()`** then count **`isActive !== false`** |
| `lowStockCount` | Same list + **`countRestockAttention`** = **low OR out** tones (§2.5) |
| `expiringSoonCount` | Active products whose **`nearestExpiryDate` &lt; now+90d and &gt; now** |
| `totalSales` | **`fetchSalesStats`** this_month keys heuristically, else **`fetchSalesPage` limit 500** sum |

Thus product API shape directly affects KPI accuracy in environments without **`/dashboard/summary`**.

---

## 2.18 Notifications bridging to catalogue

`lib/navigation/notification-href.ts` maps **`TEMPORARY_ITEM_SOLD`** notifications to **`/inventory/temporary-items`** with **`productId`** or **`aggregateId`** highlight query params (`metadata.productId`, etc.), unless **`actionUrl`** overrides.

Owners land from header notification menu onto **temporary item review**.

---

## 2.19 API surface present but orphaned in UI (products domain)

These exist in **`lib/api/products.ts`** / **`categories.ts`** but have **zero component imports**:

| Capability | Evidence |
| --- | --- |
| `updateProductPricing` | Only defined - no page/mutation imports |
| `fetchCategoryProducts` | Only exported - catalogue filters use **`GET /products?categoryId=`** instead |

---

## 2.20 Delete semantics (copy vs backend guarantee)

Dialogs state product will be **“removed” / hidden from sales** (`deleteProduct` = HTTP DELETE soft-delete semantics **assumed** - exact DB behaviour is whichever your Nest/layer exposes).

---

## 3. Other tenant areas - single-line map

Brief pointer only:

| Routes | Topic |
| --- | --- |
| `/sales`, `/returns` | Receipt-level sales + returns drill-down |
| `/staff`, `/settings` | People + organisation profile |
| `/reports`, `/audit` | Reporting & activity |
| `/branches` | **Placeholder hub page** pending backend **`GET /branches`** parity |
| `/operations/*` | Device/reliability (role-gated) |

---

## 4. Verification checklist

- Product create + optional first batch persists; redirects to **`/products/:id`**.
- Edit PATCH updates category + stock via **`currentStock`**.
- Duplicate returns new **`id`** and navigates/list refreshes.
- Low stock page works with or without **`/products/low-stock`** route.
- Expiring page works with or without **`/products/expiring-soon`** route.
- Stock take adjusts quantity and **`/inventory/stock-take`** reflects new row.
- Temporary promote + ignore behaviours succeed/fail loudly with **`sonner`** toasts.
- SUPER_ADMIN tenant cannot linger on **`/`**, tenant roles cannot open **`/platform`** (gates).

---

## 5. Target users & UX principles (tenant hub)

Small/medium merchants; favour **clear language**, destructive confirmations, **`GHS`/org currency formatting**, skeletons/loaders for async, **`MobileBottomNav` + sidebar** responsiveness, **`DEFAULT_LOW_STOCK_MAX`** aligning “we warn early” expectation when reorder omitted.
