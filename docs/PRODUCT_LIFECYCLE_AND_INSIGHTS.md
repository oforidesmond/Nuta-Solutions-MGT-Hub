# Product Lifecycle and Business Insights

Technical guide for the Management Hub frontend (and frontend AI agents) describing the product lifecycle ledger, insight APIs, audit enhancements, and UI integration patterns.

## Why this exists

The global **Activity log** (`GET /api/v1/audit/events`) is an append-only compliance stream. It was not designed for product-specific business questions such as:

- What happened to stock received on a given date?
- Who was responsible when shrinkage occurred?
- How much profit or loss did a product generate?
- Which batch was consumed by which sales?

**Product lifecycle** introduces a canonical `ProductLedgerEntry` projection written on every stock-related mutation. This is the primary read model for timelines, financial summaries, investigations, and insight endpoints.

| Layer | Purpose |
|-------|---------|
| `ProductLedgerEntry` | UI timelines, financials, insights (read-optimized) |
| `EventLog` | Org-wide audit / compliance (append-only) |
| `StockAdjustment` | Relational stock audit (still written; ledger mirrors it) |
| `BatchConsumption` | FEFO batch traceability on sales |

---

## Architecture

```
Mutation (sale, return, stock take, batch, transfer, conversion, void)
  → BranchInventory + StockAdjustment (+ BatchConsumption on sales)
  → ProductLedgerWriterService.record()
  → EventEmitterService (userId + branchId populated)
```

### Financial rules (ledger)

| Category | Revenue | COGS | Loss |
|----------|---------|------|------|
| `SALE` / `VARIANCE_SALE` | lineTotal − tax | qty × unitCost | — |
| `RETURN` | negative revenue | negative COGS | — |
| `SALE_VOID` | reverses sale | reverses COGS | — |
| `STOCK_TAKE` / `DISCREPANCY` (shrink) | — | — | \|delta\| × cost |
| `DAMAGE_EXPIRY` / `BATCH_EXPIRY` | — | — | \|delta\| × cost |
| `RECEIPT` / `INITIAL_STOCK` | — | informational qty × cost | — |
| `PRICE_CHANGE` / `PRODUCT_METADATA` | — | — | — |

Money and quantities in API responses use **string decimals** (`"48.00"`, `"4.000"`).

---

## Data model

### `ProductLedgerEntry`

Key fields: `category`, `sourceType`, `summary`, `occurredAt`, `quantityDelta`, `quantityBefore`, `quantityAfter`, `revenue`, `cogs`, `grossProfit`, `lossAmount`, `actorUserId`, references (`saleId`, `batchId`, `transferId`, `conversionId`, `discrepancyId`, etc.), `hasStockVariance`, `varianceReason`, `metadata`.

### `BatchConsumption`

Links `saleItemId` → `batchId` with `quantityConsumed` and `unitCostAtConsumption`. FEFO order: earliest `expiryDate`, then `createdAt`.

### `EventLog` enhancements

- `branchId` column added for filtering
- `userId` populated from actor on writes

---

## Authentication and roles

| Scope | Roles |
|-------|-------|
| Product lifecycle routes | `ADMIN`, `MANAGER` |
| Org insight routes (`/analytics/org/insights/*`) | `ADMIN` only |
| Enhanced audit | `ADMIN`, `MANAGER` |
| Sale void | `ADMIN`, `MANAGER` |

All routes require JWT + tenant context. Branch-scoped routes use `BranchGuard` or `X-Branch-Id` / active branch JWT.

---

## Product lifecycle APIs

Base: `/api/v1/products/:productId`

### `GET /lifecycle`

Cursor-paginated unified timeline.

**Query**

| Param | Type | Notes |
|-------|------|-------|
| `branchId` | UUID | Optional; all branches if omitted |
| `from`, `to` | ISO date | Optional date range |
| `actorUserId` | UUID | Filter by staff |
| `categories` | enum[] | `SALE`, `STOCK_TAKE`, etc. |
| `cursor` | UUID | Pagination |
| `limit` | 1–100 | Default 50 |

**Response**

```json
{
  "product": { "id": "uuid", "name": "Cola 500ml" },
  "data": [
    {
      "id": "uuid",
      "occurredAt": "2026-06-23T04:30:00.000Z",
      "recordedAt": "2026-06-23T04:30:01.000Z",
      "category": "SALE",
      "sourceType": "SALE",
      "summary": "Sold 4.000 units on receipt RCP-...",
      "quantity": { "delta": "-4.000", "before": "100.000", "after": "96.000" },
      "financial": {
        "revenue": "48.00",
        "cogs": "32.00",
        "grossProfit": "16.00",
        "loss": null
      },
      "actor": { "id": "uuid", "name": "Ama Owner", "staffId": "STF-001" },
      "branch": { "id": "uuid", "name": "Main outlet" },
      "references": {
        "saleId": "uuid",
        "receiptNumber": "RCP-...",
        "batchId": null,
        "transferId": null
      },
      "flags": { "hasStockVariance": false, "varianceReason": null },
      "metadata": {}
    }
  ],
  "nextCursor": "uuid-or-undefined"
}
```

### `GET /lifecycle/financials`

Period P&L for one product.

**Query:** `branchId?`, `from?`, `to?` (defaults to current month if omitted via analytics period resolver)

**Response:** `sales`, `returns`, `shrinkage`, `netPosition`, `inventory` blocks with string decimals.

### `GET /lifecycle/stock-balance`

**Requires branch** (`BranchGuard`). Time series of `stockAfter` per ledger row.

### `GET /lifecycle/investigation`

Root-cause mode: same filters as timeline plus `actorUserIds[]`. Adds `netQuantityChange`, `accountability[]`, `highlights`.

### `GET /lifecycle/conversions`

Grouped bulk ↔ singles conversion ledger entries.

### `GET /products/:productId/batches/:batchId/trace`

**Requires branch.** Batch receive → consumptions → write-offs → ROI financials. Lives on `ProductLifecycleController` (not `BatchesController`).

---

## Product insight APIs

Base: `/api/v1/products/:productId/insights`

| Route | Purpose |
|-------|---------|
| `GET /insights/shrinkage` | Product-scoped shrinkage score |
| `GET /insights/variance-sales` | Variance sale patterns |
| `GET /insights/returns` | Return rate summary |
| `GET /insights/margin-erosion` | Weekly margin + price change overlay |
| `GET /insights/price-drift` | Cost/sell price history |
| `GET /insights/velocity` | Days since last sale, slow/dead status |

Shared query: `period`, `from`, `to`, optional `branchId` (from `OrgAnalyticsPeriodQueryDto`).

---

## Org insight APIs

Base: `/api/v1/analytics/org/insights` — **ADMIN only**

| Route | Insight # |
|-------|-----------|
| `GET /shrinkage` | Shrinkage attribution by product and staff |
| `GET /variance-sales` | Variance heatmap, by staff, by reason |
| `GET /batch-performance` | Batch ROI ranking |
| `GET /transfer-leakage` | Inter-branch transfer mismatches |
| `GET /slow-stock` | Products with stock but no recent sales — query: `daysWithoutSale?` (default 30), optional `branchId` — **not** `period` |
| `GET /return-rates` | Top products by return rate |
| `GET /incident-patterns` | Recurring time-window incident clusters |
| `GET /staff-accountability` | Staff operational scrutiny index |
| `GET /staff/:userId/activity` | Cross-product ledger for one staff member |

`Cache-Control: private, max-age=60` (120 for slow-stock).

### Shrinkage score (0–100)

Weighted composite: share of org loss + incident frequency vs peer average. Use for **operational diagnostics**, not punitive HR scoring.

### Staff accountability index (0–100)

Combines manual adjustments, stock takes, variance sales, and shrinkage loss. Label in UI as “operational review” rather than “trust score.”

---

## Enhanced audit API

`GET /api/v1/audit/events`

**New query filters**

| Param | Description |
|-------|-------------|
| `productId` | Matches `aggregateId` when `aggregateType=Product` or `payload.productId` |
| `userId` | Actor filter |
| `branchId` | Branch filter |
| `eventType` | Array of `EventType` |
| `aggregateType` | e.g. `Product`, `Sale` |
| `startDate`, `endDate` | ISO range |
| `cursor`, `limit` | Pagination |

**Response** now includes `userId`, `branchId`, hydrated `actor: { id, name }`.

---

## Sale void

`POST /api/v1/sales/:id/void`

**Body:** `{ "voidReason": "string" }`

**Roles:** `ADMIN`, `MANAGER` (branch-scoped)

Restores stock, reverses batch consumption, writes `SALE_VOID` ledger rows, emits `SALE_VOIDED`.

---

## Deprecated / migrated endpoints

| Old | New |
|-----|-----|
| `GET /products/:id/stock-history` | Still works; delegates to ledger (same response shape) |
| `GET /products/:id/inventory-events` | **Deprecated** — use `GET /products/:id/lifecycle` |

---

## Recommended frontend surfaces

### 1. Product detail → Lifecycle tab

- Infinite scroll on `GET /lifecycle`
- Filters: date range, branch, category chips, staff
- Stock balance chart from `/lifecycle/stock-balance`
- Financial summary card from `/lifecycle/financials`

### 2. Investigation drawer

- Date range + multi-select staff
- Call `/lifecycle/investigation`
- Show `accountability` table and `highlights`

### 3. Batch detail → Trace

- Use `/batches/:batchId/trace` for ROI card and consumption list

### 4. Org analytics → Insights section

Cards linking to each `/analytics/org/insights/*` endpoint.

### 5. Activity log page

Add filter bar wired to enhanced `/audit/events` (`productId`, `userId`, dates, `eventType`).

---

## Example frontend flows

### Timeline infinite scroll

```typescript
let cursor: string | undefined;
const rows = [];
do {
  const res = await api.get(`/products/${productId}/lifecycle`, {
    params: { cursor, limit: 50, branchId, from, to },
  });
  rows.push(...res.data);
  cursor = res.nextCursor;
} while (cursor);
```

### Investigation mode

```typescript
const res = await api.get(`/products/${productId}/lifecycle/investigation`, {
  params: { from: '2026-06-01', to: '2026-06-23', actorUserIds: [staffA, staffB] },
});
// res.accountability, res.highlights, res.data (timeline)
```

---

## Write paths (backend reference)

Ledger rows are written from:

- `SalesService` / `StaffOfflineSalesService` (sales + FEFO)
- `SalesService.voidSale` (void)
- `StaffReturnsService`, `StaffStockAdjustmentsService`
- `InventoryService` (stock take, manual, transfer)
- `BatchesService` (receive, expiry removal)
- `ProductsService` (initial stock, manual stock update)
- `ProductConversionsService` (execute conversion)

Stock takes with non-zero variance also create `StockDiscrepancy` and `STOCK_DISCREPANCY_RECORDED` events.

---

## Migration notes

- Fresh DB or re-seed recommended; no backfill script.
- `InventoryEvent` table retained for mobile compatibility but is not authoritative for lifecycle UI.
- Re-run `npx prisma migrate dev` after pulling this branch.

---

## Module map (backend)

```
src/modules/product-lifecycle/
  product-lifecycle.module.ts      # Global module
  product-ledger-writer.service.ts # Canonical writer
  product-lifecycle.service.ts     # Read APIs
  product-insights.service.ts      # Insight computations
  product-lifecycle.controller.ts
  org-product-insights.controller.ts
src/modules/batches/batch-allocation.service.ts  # FEFO
```

---

## Frontend implementation plan

Strategic, phase-by-phase guide for integrating product lifecycle and insights into the Management Hub. **Do not skip phases** — each phase delivers a shippable slice and builds on the previous one.

This plan assumes the ledger (`ProductLedgerEntry`) is the **single source of truth** for revenue, costs, margins, returns, shrinkage, and stock-value figures. The hub **presents and aggregates** those numbers; it does not recalculate them independently.

---

### Product decisions (locked in)

| Topic | Decision |
|-------|----------|
| **Database / history** | Non-production environment — no backfill script or migration messaging for legacy data. |
| **Who uses the hub** | Primarily **ADMIN**. Platform hub (`/platform/*`) is **SUPER_ADMIN** only. **MANAGER** is supported by APIs but not a primary UX focus for now. |
| **Staff** | Use the **mobile app only** — no Management Hub access. Staff can process **returns** on mobile; **void sale** is **ADMIN-only** in the hub. |
| **Mobile app** | Will be updated to use the new ledger system and **retire `InventoryEvent`** as the read model. |
| **Void sale** | Must be **hard to discover**, used sparingly, with a **mandatory reason** and clear confirmation copy. Not surfaced on high-traffic screens. |
| **Shrinkage alerts** | **Deferred / out of scope** — no inbox notifications. Owners use Phase 3 org insights (dashboard teasers, Stock & loss section) and per-product health strip. May revisit in a future phase. |
| **Exports** | **CSV export** for all report and insight surfaces across the hub (`components/exports/export-button.tsx`). Client-side cursor export capped at **5,000 rows** per download. |
| **Branch manager view** | Out of scope — org-wide and branch-filtered views for **ADMIN** only. |
| **Localization** | **English only**; copy written for lay business owners in Ghana. |
| **Media** | No images in lifecycle timelines or insight cards. |
| **Reports** | Consume the same lifecycle / ledger financial APIs — aggregate and present only; **never duplicate financial logic** in the frontend or ad-hoc report calculations. |

---

### UX principles

1. **Summary first, story second, investigation last** — most owners need a few big numbers and a simple timeline before any forensic UI.
2. **Progressive disclosure** — financial detail, charts, and investigation mode behind taps/expands, not on first paint.
3. **Familiar patterns** — vertical activity feed (receipt / mobile-money style), not audit tables on mobile.
4. **Plain language** — avoid accounting jargon in labels (see copy table below).
5. **Admin-first** — optimize for the business owner reviewing stock and money, not for staff self-service in the hub.
6. **Mobile-first layout** — large tap targets, filter chips, bottom sheets for detail; tables acceptable on desktop org insight drill-downs only.

#### UI copy (API term → hub label)

| Internal / API | Show in UI |
|----------------|------------|
| `SALE` | Sold |
| `RETURN` | Customer return |
| `SALE_VOID` | Sale cancelled |
| `RECEIPT` / `INITIAL_STOCK` | Stock received |
| `STOCK_TAKE` / `DISCREPANCY` | Stock count — short or extra |
| `DAMAGE_EXPIRY` / `BATCH_EXPIRY` | Damaged or expired |
| `VARIANCE_SALE` | Sold without scanning *(tooltip)* |
| `grossProfit` | Profit on sales |
| `cogs` | What it cost you |
| `lossAmount` / shrinkage | Stock lost |
| Shrinkage score (0–100) | **High / Medium / Low concern** — avoid raw scores on first release |
| Staff accountability index | **Worth a review** or **Stock activity review** — never “trust score” or punitive HR language |

Money: always org currency (e.g. **GH₵**) via existing `formatCurrency`. Quantities: human units (“4 bottles”), not raw `"-4.000"`. Dates: existing `formatDateDMY` / `formatTime12h`; use “Today” / “Yesterday” for recent rows.

---

### Caching and API efficiency

| Pattern | Rule |
|---------|------|
| **React Query** | All lifecycle and insight reads via `@tanstack/react-query` with `withBranchKey(activeBranchId, …)` where branch-scoped. |
| **staleTime** | `60_000` ms for org insight routes (matches `Cache-Control: max-age=60`); `120_000` ms for `slow-stock`. |
| **Lazy loading** | Fetch timeline only when the Activity tab is active; financial summary in parallel on tab open. |
| **Infinite scroll** | `useInfiniteQuery` + `cursor` for `GET /lifecycle` — never prefetch all pages in the UI. |
| **On-demand endpoints** | `/lifecycle/investigation`, `/lifecycle/stock-balance`, and per-product `/insights/*` beyond velocity/shrinkage — load only when the user opens that panel. Debounce filter changes (300–500 ms). |
| **Invalidation** | After stock mutations or void sale, invalidate narrow keys: `['product-lifecycle', productId, branchId]` (and related financials), not entire product lists. |
| **Remove duplicates** | Retire `fetchInventoryEvents` and redundant stock-history UI once Activity tab ships; `stock-history` may remain as API alias during transition. |
| **Dashboard home** | Keep `fetchDashboardSummary`; insight **teaser cards** link out — do not load full org insight payloads on `/`. |

---

### Where data lives in the hub (target surfaces)

| Surface | Route / file (today) | What to add |
|---------|----------------------|-------------|
| **Product Activity** | `app/(dashboard)/products/[id]/page.tsx` | Replace **Stock history** tab + `InventoryEventHistorySheet` + **Sales (soon)** with unified **Activity** tab. |
| **Batch trace** | `app/(dashboard)/batches/page.tsx`, product batches table | Row click → drawer: receive → sold → removed + simple ROI. |
| **Org insights** | `app/(dashboard)/branches/analytics/page.tsx` | New **Stock & loss insights** section (ADMIN). |
| **Dashboard teasers** | `app/(dashboard)/page.tsx` | 1–2 tappable warning cards linking to insights (ADMIN). |
| **Reports** | `app/(dashboard)/reports/page.tsx` | Refactor to ledger financial APIs (see Phase 4). |
| **Activity log** | `app/(dashboard)/audit/page.tsx` | Enhanced filters: product, staff, event type, date range. |
| **Void sale** | Sales detail (existing or new) | Buried admin action — see Phase 6. |
| **Notifications** | `app/(dashboard)/notifications/*` | Shrinkage-driven alerts — see Phase 7. |

**Do not add** a top-level sidebar item named “Lifecycle”. Owners already think in **Products**, **Inventory**, and **Reports**.

**Platform hub** (`/platform/*`): no tenant lifecycle work in these phases.

---

### Suggested frontend module layout

```
lib/api/
  product-lifecycle.ts     # lifecycle, financials, investigation, stock-balance, conversions
  product-insights.ts      # GET /products/:id/insights/*
  org-insights.ts          # GET /analytics/org/insights/*
lib/types/
  product-lifecycle.ts     # ledger entry types, category enums, label helpers

components/products/
  product-activity-tab.tsx
  product-investigation-drawer.tsx
  lifecycle-entry-card.tsx
  product-health-strip.tsx   # velocity + shrinkage concern chips

components/batches/
  batch-trace-drawer.tsx

components/insights/
  org-insight-card.tsx       # reusable card + ranked list drill-down

components/exports/
  export-button.tsx          # shared CSV/Excel trigger for reports and insights
```

Register paths in `lib/api/endpoints.ts` alongside existing product routes.

---

## Phase 0 — API foundation

**Goal:** Typed clients and query keys only — no new pages yet.

**Tasks**

- [x] Add endpoint constants for lifecycle, product insights, org insights, batch trace, sale void.
- [x] Implement `lib/api/product-lifecycle.ts`, `product-insights.ts`, `org-insights.ts` with response normalizers (string decimals preserved).
- [x] Add `lib/types/product-lifecycle.ts` and category → UI label map.
- [x] Define React Query key factories: `productLifecycleKeys`, `productInsightKeys`, `orgInsightKeys`.
- [x] Document role gates in client helpers: lifecycle + insights → `ADMIN` (and `MANAGER` where API allows, but UI defaults to admin flows).

**Exit criteria:** Can call all read endpoints from a dev-only smoke test or Storybook-less manual check; no UI changes.

---

## Phase 1 — Product detail: Activity tab

**Goal:** One place to answer “What happened to this product?” for the business owner.

**Tasks**

- [x] Add **Activity** tab on `products/[id]` (rename from “Stock history”; remove **Sales (soon)** as separate tab).
- [x] **Summary card** at top: `GET /lifecycle/financials` (current month, active branch) — sold, profit on sales, stock lost, returns.
- [x] **Filter chips:** All · Sold · Received · Problems (map to `categories` query param).
- [x] **Timeline feed:** `useInfiniteQuery` on `GET /lifecycle` using `lifecycle-entry-card` (icon, colour, `summary`, actor, branch, money).
- [x] **Product health strip** (optional row under summary): `GET /insights/velocity` + `GET /insights/shrinkage` — slow/dead label and concern level only.
- [x] Remove or redirect `InventoryEventHistorySheet` to Activity tab; stop calling `fetchInventoryEvents`.
- [x] Deprecate in-app use of `fetchStockHistory` for the history tab (lifecycle replaces it).

**Wireframe (conceptual)**

```
┌─────────────────────────────────────────┐
│  Cola 500ml          96 units  ● OK     │
├─────────────────────────────────────────┤
│  This month                             │
│  Sold: GH₵ 1,240   Profit: GH₵ 320      │
│  Stock lost: GH₵ 45   Returns: 2         │
├─────────────────────────────────────────┤
│  [All] [Sold] [Received] [Problems]     │
├─────────────────────────────────────────┤
│  ● Sold 4 units · RCP-0042              │
│    Today 2:30pm · Ama · Main shop       │
│    +GH₵ 48                              │
│  ● Stock received · Batch B-2024-01     │
│    Mon · Kofi · +24 units               │
└─────────────────────────────────────────┘
```

**Exit criteria:** Owner can review one product’s month and scroll full history without legacy inventory-events calls.

---

## Phase 2 — Batch trace

**Goal:** Answer “Where did this batch go?” without a new nav item.

**Tasks**

- [x] On batch row click (product detail batches table + `/batches` list): open `batch-trace-drawer.tsx`.
- [x] Call `GET /products/:productId/batches/:batchId/trace` (branch required).
- [x] Show: **Received** → **Sold** (list with receipt refs) → **Removed** (expired/damaged).
- [x] One ROI summary line from API financials: spent · sold for · remaining value (plain labels).

**Exit criteria:** Tapping any batch opens trace; no standalone batch detail route required for v1.

---

## Phase 3 — Org-wide stock & loss insights

**Goal:** ADMIN command center for patterns across the business.

**Tasks**

- [x] Extend `branches/analytics` with section **Stock & loss insights** (below existing KPIs).
- [x] Cards (plain titles), each opens ranked list — not charts first:

| Card label | API |
|------------|-----|
| Missing or lost stock | `GET /analytics/org/insights/shrinkage` |
| Stock not selling | `GET /analytics/org/insights/slow-stock` |
| Customer returns | `GET /analytics/org/insights/return-rates` |
| Transfer problems | `GET /analytics/org/insights/transfer-leakage` |
| Batch performance | `GET /analytics/org/insights/batch-performance` |
| Unusual sales without scanning | `GET /analytics/org/insights/variance-sales` |
| Recurring problems by time | `GET /analytics/org/insights/incident-patterns` |
| Staff stock activity review | `GET /analytics/org/insights/staff-accountability` |

- [x] Staff drill-down: `GET /analytics/org/insights/staff/:userId/activity` linked from staff list or accountability card.
- [x] Dashboard home (`/`): 1–2 **teaser cards** for ADMIN (e.g. high-concern shrinkage count, slow-stock value) linking to analytics section — lightweight counts only.
- [x] Respect `staleTime` / backend cache headers; skeleton per card so one slow endpoint does not block the page.

**Exit criteria:** ADMIN can find org-wide loss and slow stock without opening individual products.

---

## Phase 4 — Reports on ledger (single source of truth)

**Goal:** All hub reports read from lifecycle / ledger financial APIs — no parallel math.

**Tasks**

- [x] Audit `app/(dashboard)/reports/page.tsx` and `lib/api/reports.ts` for any client-side or legacy revenue/COGS/margin calculations.
- [x] Point branch sales summary, product performance, and related widgets at ledger-backed endpoints (`/lifecycle/financials` per product where needed, org analytics / ledger aggregates where available).
- [x] If a report metric has no ledger endpoint yet, **add backend aggregation** rather than recomputing in the frontend.
- [x] Align period selectors (`today` / `week` / `month` / etc.) with `OrgAnalyticsPeriodQueryDto` conventions.
- [x] Add **Export** on each report block (see Phase 8 for shared component; stub allowed in Phase 4 if needed).

**Exit criteria:** Documented mapping table (report widget → API route); no duplicate financial formulas in TSX.

---

## Phase 5 — Investigation mode and activity log

**Goal:** Power tools for when “something doesn’t add up” — not the default experience.

**Tasks**

- [x] On product Activity tab: button **Something doesn’t add up?** → `product-investigation-drawer.tsx`.
- [x] Call `GET /lifecycle/investigation` with date range + multi-select staff (`actorUserIds`).
- [x] Show `highlights`, `accountability` table (plain language), and filtered timeline (`data`).
- [x] Enhance `audit/page.tsx` filter bar: `productId`, `userId`, `branchId`, `eventType[]`, `startDate` / `endDate`, cursor pagination (wire existing `fetchAuditEventsPage` to new query params).

**Exit criteria:** Investigation is opt-in; activity log supports product/staff filters for compliance review.

---

## Phase 6 — Void sale (ADMIN, restricted UX)

**Goal:** Correct stock and ledger when a sale must be undone — rarely used, deliberate friction.

**Tasks**

- [x] Extend `HubSale` / `normalizeSale()` with `isVoided`, `voidedAt`, `voidReason`.
- [x] `canVoidSale()` — ADMIN-only in hub (`lib/inventory-access.ts`).
- [x] `components/sales/void-sale-dialog.tsx` — mandatory reason (min 10 chars), confirmation checkbox, destructive confirm.
- [x] Sale detail footer link only (`app/(dashboard)/sales/[saleId]/page.tsx`) — not on sales list or Activity feed.
- [x] `POST /sales/:id/void` via existing `voidSale()` client; invalidate sales + `product-lifecycle` keys.

**Design rules**

- **Not** on dashboard, product Activity feed actions, or sales list row menus.
- Place on **sale detail** only: secondary text link or overflow menu at bottom — e.g. “Cancel this sale (admin)”.
- **Mandatory** `voidReason` (min length enforced in UI).
- Confirmation dialog with plain consequences: *“This puts stock back, reverses the sale from your totals, and is recorded in the activity log. This cannot be undone.”*
- Call `POST /sales/:id/void` with body `{ voidReason }`.
- Invalidate sale queries + `product-lifecycle` keys for affected products.

**Exit criteria:** Void is possible but intentionally hard to stumble into; every void has a reason and audit trail.

---

## Phase 7 — Shrinkage in-app notifications — CANCELLED

**Status:** Out of scope. Shrinkage visibility is delivered in **Phase 3** (`GET /analytics/org/insights/shrinkage`, dashboard teasers, Stock & loss insights, product health strip).

**Tasks** — not implemented:

- [x] ~~Define thresholds~~ — cancelled
- [x] ~~In-app notification creation~~ — cancelled
- [x] ~~Deep links from inbox~~ — cancelled

**Exit criteria:** N/A — use org analytics and product Activity instead.

---

## Phase 8 — Export across the hub

**Goal:** Every report and insight surface supports export for accountants and record-keeping.

**Tasks**

- [x] Shared `components/exports/export-button.tsx` (CSV via `lib/utils/csv.ts`; UTF-8 BOM for Excel).
- [x] `lib/exports/filename.ts`, `fetch-paginated.ts` (cursor loop), `row-mappers.ts`, `org-insight-export.ts`.
- [x] Export targets: org insight drill-downs, product Activity timeline + financials, batch trace, reports sections, audit log (filtered), investigation drawer.
- [x] Long lists: client-side cursor pagination; **5,000 row cap** with toast when truncated (`lib/exports/constants.ts`).
- [x] Filenames: `{org}-{reportType}-{from}-{to}.csv`.

**Exit criteria:** Each surface listed in Phase 3–5 and Phase 4 reports has a working export control.

---

### Phase dependency graph

```
Phase 0 (API foundation)
    ↓
Phase 1 (Product Activity) ──→ Phase 5 (Investigation)
    ↓
Phase 2 (Batch trace)
    ↓
Phase 3 (Org insights) ──→ ~~Phase 7 (Notifications)~~ cancelled
    ↓
Phase 4 (Reports on ledger) ──→ Phase 8 (Export)
    ↓
Phase 6 (Void sale) — sale detail only
```

Phase 6 may proceed in parallel with Phases 3–5 once sale detail page and Phase 0 clients exist. Phase 8 should follow Phase 4 and Phase 3 so export has stable data sources.

---

### Out of scope (this plan)

- Management Hub access or lifecycle UI for **STAFF** (mobile only).
- Primary UX polish for **MANAGER** role.
- Branch-manager-scoped insight dashboards.
- Platform (`/platform/*`) tenant lifecycle features.
- Historical **backfill** or production migration comms.
- Non-English localization.
- Image attachments in timelines.

---

### Implementation checklist (track per phase)

| Phase | Status | Notes |
|-------|--------|-------|
| 0 — API foundation | Complete | endpoints, API clients, types, query keys |
| 1 — Product Activity tab | Complete | Activity tab on product detail; legacy sheet removed |
| 2 — Batch trace | Complete | Drawer on batch rows; batch trace API |
| 3 — Org insights | Complete | Stock & loss section on org analytics; dashboard teasers |
| 4 — Reports on ledger | Complete | Ledger-backed reports; CSV export on each section |
| 5 — Investigation + audit filters | Complete | Investigation drawer + enhanced audit filters |
| 6 — Void sale (restricted) | Complete | Sale detail footer; `void-sale-dialog.tsx` |
| 7 — Shrinkage notifications | Cancelled | Phase 3 org insights cover shrinkage visibility |
| 8 — Export everywhere | Complete | `export-button.tsx`; 5k row cap on cursor exports |
