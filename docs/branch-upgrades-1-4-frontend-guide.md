# Branch Upgrades (Sections 1–9) — Frontend & Integration Guide

This document is the canonical reference for the backend changes delivered in sections 1–9 of `docs/branches_backend_upgrades.md`. It is written for frontend engineers (Hub web + mobile) and for future backend work on sections 10+.

All routes are under the global prefix `/api/v1`. Auth is unchanged: send the JWT `Authorization: Bearer <token>` header, and for branch-scoped Hub routes send the `X-Branch-Id` header (resolution order: `X-Branch-Id` header → JWT `activeBranchId` → JWT `defaultBranchId`).

---

## ⚠ Breaking change — `GET /api/v1/branches`

`GET /api/v1/branches` no longer returns a bare array of branches. It now returns an object with `data` and `meta`:

```jsonc
{
  "data": [
    { "id": "...", "organizationId": "...", "name": "Main", "location": null, "isActive": true, "isDefault": true, "createdAt": "...", "updatedAt": "..." }
  ],
  "meta": {
    "limit": 3,            // null means unlimited
    "used": 2,
    "remaining": 1,        // null when limit is unlimited
    "isOverridden": false, // true when a super-admin set a custom limit
    "planType": "PRO"
  }
}
```

Update every consumer that previously treated the response as an array. Read the list from `response.data` and the limit information from `response.meta`.

The branch object shape inside `data` is unchanged from before.

---

## 1. Plan-based branch limits

### Limits by plan

| Plan | Default branch limit |
|------|----------------------|
| `TRIAL` | 1 |
| `FREE` | 1 |
| `PRO` | 3 |
| `ENTERPRISE` | unlimited (`limit: null`) |

A super-admin can override the limit per organization (see section 5). The override convention: `null` = use plan default, a positive integer = hard cap on active branches, and `999999` = unlimited.

### Using `meta` in the UI

- Show usage like "2 of 3 branches used" from `meta.used` / `meta.limit`.
- Disable the "Add Branch" button when `meta.remaining === 0` (and `meta.limit !== null`).
- When `meta.limit === null`, the org is unlimited — never disable the button.
- When `meta.isOverridden === true`, you may show a small badge indicating a custom limit.

### Branch creation is now ADMIN-only

`POST /api/v1/branches` is restricted to `ADMIN`. `MANAGER` can no longer create branches (they can still view and update). Hide or disable the create action for non-admins.

### Creation errors

`POST /api/v1/branches` (body `{ "name": string, "location"?: string }`) can fail with:

| HTTP | `code` | Meaning |
|------|--------|---------|
| 403 | `BRANCH_LIMIT_REACHED` | Plan/override limit hit. Prompt to upgrade. |
| 409 | `BRANCH_NAME_CONFLICT` | An active branch with that name already exists (case-insensitive). |
| 409 | `NO_DEFAULT_BRANCH` | Org has active branches but no default. Needs super-admin repair. |
| 409 | `MULTIPLE_DEFAULT_BRANCHES` | Org has more than one default branch. Needs super-admin repair. |

Renaming via `PATCH /api/v1/branches/:id` also enforces the case-insensitive duplicate-name check and returns `409 BRANCH_NAME_CONFLICT`.

All error bodies follow the shape `{ "statusCode": number, "code": string, "message": string }`.

---

## 2. Stock transfer between branches

Move stock from one branch to another atomically.

```
POST /api/v1/inventory/transfer
Roles: ADMIN
```

This route does **not** use the `X-Branch-Id` header — the branches are explicit in the body.

Request body:

```jsonc
{
  "productId": "uuid",
  "fromBranchId": "uuid",
  "toBranchId": "uuid",
  "quantity": 10,          // > 0, up to 3 decimal places
  "note": "Restock"        // optional
}
```

Success (`200`):

```jsonc
{
  "transferId": "uuid",
  "productId": "uuid",
  "quantity": "10",
  "note": "Restock",
  "fromBranch": { "id": "uuid", "name": "Main", "stockBefore": "100", "stockAfter": "90" },
  "toBranch":   { "id": "uuid", "name": "Annex", "stockBefore": "0", "stockAfter": "10" }
}
```

Errors:

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `BRANCH_TRANSFER_SAME_BRANCH` | Source and destination are the same. |
| 403 | `BRANCH_NOT_IN_ORG` | A branch is missing/inactive/not in your org. |
| 404 | (product) | Product not found in the org. |
| 422 | `INSUFFICIENT_STOCK_FOR_TRANSFER` | Source branch lacks the requested quantity. |

Each transfer writes two stock adjustments (`STOCK_TRANSFER_OUT` at the source, `STOCK_TRANSFER_IN` at the destination) linked by the shared `transferId` (stored as the adjustment `referenceId`, with `referenceType: "STOCK_TRANSFER"`). These appear in each branch's stock history.

---

## 3. Branch-scoped vs org-wide pricing

Prices can now be overridden per branch. The org-wide price lives on the product; a branch can optionally override cost and/or selling price. When a branch has no override, it inherits the org price.

> Field naming: this backend uses `sellingPrice` (not `salePrice`) everywhere.

### Reading prices — product responses

`GET /api/v1/products`, `GET /api/v1/products/:id`, and low-stock responses now include these fields per product (all stringified decimals):

| Field | Meaning |
|-------|---------|
| `costPrice` / `sellingPrice` | Effective prices for the active branch (override if set, else org default). Use these for display, cart, and POS. |
| `orgCostPrice` / `orgSellingPrice` | Org-wide defaults from the product. |
| `branchCostPriceOverride` / `branchSellingPriceOverride` | The active branch's override, or `null` if none. |
| `hasBranchPriceOverride` | `true` when either branch override is set. |

The active branch is resolved from the `X-Branch-Id` header (or JWT fallback), so send the header to get branch-correct prices.

### Price context endpoint (for the edit modal)

```
GET /api/v1/products/:id/price-context
Roles: ADMIN, MANAGER
```

Returns everything the price-edit modal needs:

```jsonc
{
  "productId": "uuid",
  "orgCostPrice": "10.00",
  "orgSellingPrice": "15.00",
  "branchCostPrice": "12.00",   // null if no branch override
  "branchSellingPrice": null,
  "effectiveCostPrice": "12.00",
  "effectiveSellingPrice": "15.00",
  "activeBranchId": "uuid"
}
```

### Writing prices — `priceScope`

Both `PATCH /api/v1/products/:id/pricing` and `PATCH /api/v1/products/:id` accept a `priceScope` flag alongside price fields:

```jsonc
{
  "costPrice": 12,            // optional
  "sellingPrice": 20,         // optional
  "priceScope": "ORG"         // "ORG" | "BRANCH" — required when a price is present
}
```

Rules:

- If `costPrice` or `sellingPrice` is present but `priceScope` is missing → `400 PRICE_SCOPE_REQUIRED`.
- `priceScope: "ORG"` updates the org-wide product price (the previous behavior). Org prices cannot be set to `null`.
- `priceScope: "BRANCH"` upserts the override for the active branch (`X-Branch-Id`) only; the org price is untouched.
- `priceScope: "BRANCH"` with `costPrice: null` or `sellingPrice: null` **clears** that branch override, so the effective price falls back to the org default.

`PATCH /:id/pricing` still also accepts `customTaxRate` and `reorderLevel` (these remain org-wide on the product and ignore `priceScope`).

The response is the serialized product reflecting the active branch's effective prices and override fields described above.

### Where overrides take effect

Effective branch prices are used when recording sales (Hub `SalesService`) and in the mobile staff catalog (`/staff` catalog + master-data sync), so a branch with an override sells at its overridden price and the line-item snapshots reflect it.

---

## 4. Zero-quantity inventory rows on product creation

When a product is created, promoted from a temporary item, or duplicated, the backend now seeds a zero-quantity `BranchInventory` row for **every active branch** in the org (not just the current one). Likewise, creating a new branch backfills zero-quantity rows for all existing active products.

Frontend impact is minimal — products now consistently appear (at zero stock) across all branches immediately, rather than only after their first stock movement. No request changes are required.

---

## 5. Platform hub — super-admin branch limit override

```
PATCH /api/v1/platform/organizations/:organizationId/branch-limit
Roles: SUPER_ADMIN
```

Request body:

```jsonc
{
  "limit": 10,            // null resets to plan default; 1..999998 = hard cap; 999999 = unlimited
  "reason": "Enterprise pilot"   // optional, audited
}
```

Success (`200`):

```jsonc
{
  "organizationId": "uuid",
  "branchLimitOverride": 10,
  "effectiveBranchLimit": 10   // null when unlimited
}
```

Errors:

| HTTP | `code` | Meaning |
|------|--------|---------|
| 400 | `BRANCH_LIMIT_OVERRIDE_INVALID` | `limit` is not `null` and not an integer in `1..999999`. |

The override and the computed `effectiveBranchLimit` are also included under `plan` in `GET /api/v1/platform/organizations/:organizationId`.

---

## 6. Org-wide analytics API

Org-wide analytics roll up data across **all branches** for the authenticated organization. These endpoints are **ADMIN-only** and do **not** use `BranchGuard` — do not send `X-Branch-Id` (it is ignored). Managers should continue using branch-scoped `/reports/*` and `/dashboard/*`.

Base path: `GET /api/v1/analytics/org/*`

Responses use **string decimals** for money (`"142500.00"`) and percentages (`"37.54"`). Stock quantities use up to 3 decimal places as strings.

### Shared `period` query parameter

Most endpoints accept:

| Param | Values | Default |
|-------|--------|---------|
| `period` | `today`, `week`, `month`, `quarter`, `year`, `custom` | `month` |
| `from` | `YYYY-MM-DD` — required when `period=custom` | — |
| `to` | `YYYY-MM-DD` — required when `period=custom` | — |

`period=custom` without both `from` and `to` returns `400` with a validation message.

All period-based responses include:

```jsonc
{ "period": { "from": "2025-06-01T00:00:00.000Z", "to": "2025-06-16T12:00:00.000Z" }, ... }
```

### Caching

Responses include `Cache-Control` headers. Time-series endpoints use `private, max-age=60`. Point-in-time snapshots (`low-stock`, `inventory-value`) use `private, max-age=120`.

---

### `GET /api/v1/analytics/org/revenue`

```
Roles: ADMIN
Query: ?period=month&from=&to=
```

```jsonc
{
  "totalRevenue": "142500.00",
  "totalTransactions": 380,
  "averageOrderValue": "375.00",
  "period": { "from": "...", "to": "..." },
  "breakdown": [
    { "date": "2025-06-01", "revenue": "18000.00", "transactions": 45 }
  ]
}
```

---

### `GET /api/v1/analytics/org/profit`

Gross profit uses `SaleItem.unitCost` snapshots at time of sale (no live price joins).

```jsonc
{
  "totalRevenue": "142500.00",
  "totalCOGS": "89000.00",
  "grossProfit": "53500.00",
  "grossMargin": "37.54",
  "period": { "from": "...", "to": "..." }
}
```

---

### `GET /api/v1/analytics/org/top-products`

```
Query: ?by=revenue|quantity&limit=10&period=week
```

| Param | Default | Max |
|-------|---------|-----|
| `by` | `revenue` | — |
| `limit` | `10` | `50` |

```jsonc
{
  "period": { "from": "...", "to": "..." },
  "products": [
    {
      "productId": "uuid",
      "name": "Premium Fuel 5L",
      "totalQuantitySold": 1200,
      "totalRevenue": "48000.00",
      "contributionPercent": "33.70"
    }
  ]
}
```

`contributionPercent` is `"0.00"` when org-wide revenue in the period is zero.

---

### `GET /api/v1/analytics/org/low-stock`

Point-in-time snapshot (no `period` param). Lists products where **any active branch** has stock at or below the effective reorder level (`COALESCE(branchInventory.reorderLevel, product.reorderLevel)`).

Products with **no** reorder level configured on either the branch row or the product are excluded — this is intentional.

```jsonc
{
  "items": [
    {
      "productId": "uuid",
      "name": "Widget A",
      "branches": [
        {
          "branchId": "uuid",
          "branchName": "Main outlet",
          "currentStock": "2.000",
          "reorderLevel": "10.000"
        }
      ]
    }
  ],
  "totalAffectedProducts": 5
}
```

---

### `GET /api/v1/analytics/org/branch-comparison`

Side-by-side metrics for all active branches (or a subset).

```
Query: ?period=month&branchIds=uuid,uuid
```

`branchIds` is optional — comma-separated UUIDs filter to specific branches.

```jsonc
{
  "period": { "from": "...", "to": "..." },
  "branches": [
    {
      "branchId": "uuid",
      "branchName": "Main outlet",
      "revenue": "95000.00",
      "transactions": 240,
      "averageOrderValue": "395.83",
      "grossProfit": "35000.00",
      "grossMargin": "36.84",
      "topProduct": { "name": "Premium Fuel 5L", "revenue": "12000.00" },
      "stockAlerts": 2
    }
  ],
  "winner": {
    "byRevenue": "uuid-of-main-outlet",
    "byMargin": "uuid-of-express-counter"
  }
}
```

**Winner tie-break:** equal metric → `isDefault: true` branch wins → earliest `createdAt` wins. Handles zero-revenue new orgs where all branches tie at zero.

---

### `GET /api/v1/analytics/org/staff-performance`

Org-wide staff ranking (not limited to one branch).

```
Query: ?period=month&limit=10
```

```jsonc
{
  "period": { "from": "...", "to": "..." },
  "staff": [
    {
      "staffId": "STF-001",
      "name": "Jane Doe",
      "branchId": "uuid",
      "branchName": "Main outlet",
      "totalSales": "32000.00",
      "transactions": 80
    }
  ]
}
```

---

### `GET /api/v1/analytics/org/returns-summary`

```jsonc
{
  "totalReturns": 12,
  "returnRate": "3.16",
  "totalReturnValue": "4800.00",
  "period": { "from": "...", "to": "..." },
  "byBranch": [
    {
      "branchId": "uuid",
      "branchName": "Main outlet",
      "returns": 8,
      "returnRate": "3.33"
    },
    {
      "branchId": "uuid",
      "branchName": "New counter",
      "returns": 0,
      "returnRate": null
    }
  ]
}
```

**Nullable rates:** `returnRate` at org level and per branch is `null` when there were zero sales in the period (not `0`). Use `null` to mean "no sales data"; use `"0.00"` to mean sales occurred but no returns.

---

### `GET /api/v1/analytics/org/inventory-value`

Point-in-time snapshot. Value = `currentStock × effectiveCostPrice` per branch (`COALESCE(branchInventory.costPriceOverride, product.costPrice)`).

```jsonc
{
  "totalInventoryValue": "850000.00",
  "byBranch": [
    {
      "branchId": "uuid",
      "branchName": "Main outlet",
      "value": "600000.00",
      "productCount": 42
    }
  ]
}
```

Only **active** branches are included.

---

### `GET /api/v1/analytics/org/sales-velocity`

```
Query: ?period=month&limit=20
```

```jsonc
{
  "period": { "from": "...", "to": "..." },
  "products": [
    {
      "productId": "uuid",
      "name": "Premium Fuel 5L",
      "avgDailySales": "42.3",
      "daysOfStockLeft": 7.1
    }
  ]
}
```

`daysOfStockLeft` uses org-wide stock summed across **active branches only** (inactive branches hold frozen stock and are excluded). `daysOfStockLeft` is `null` when `avgDailySales` is zero.

---

## Request examples

Get branches with limit meta:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Branch-Id: $BRANCH_ID" \
     https://api.example.com/api/v1/branches
```

Transfer stock:

```bash
curl -X POST https://api.example.com/api/v1/inventory/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId":"...","fromBranchId":"...","toBranchId":"...","quantity":10,"note":"Restock"}'
```

Set a branch-only selling price:

```bash
curl -X PATCH https://api.example.com/api/v1/products/$PRODUCT_ID/pricing \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Branch-Id: $BRANCH_ID" \
  -H "Content-Type: application/json" \
  -d '{"sellingPrice":20,"priceScope":"BRANCH"}'
```

Clear a branch selling-price override (fall back to org default):

```bash
curl -X PATCH https://api.example.com/api/v1/products/$PRODUCT_ID/pricing \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Branch-Id: $BRANCH_ID" \
  -H "Content-Type: application/json" \
  -d '{"sellingPrice":null,"priceScope":"BRANCH"}'
```

Super-admin sets a custom branch limit:

```bash
curl -X PATCH https://api.example.com/api/v1/platform/organizations/$ORG_ID/branch-limit \
  -H "Authorization: Bearer $SUPER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"limit":10,"reason":"Enterprise pilot"}'
```

Org-wide revenue (ADMIN — no X-Branch-Id):

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/analytics/org/revenue?period=month"
```

Dashboard summary with branch context:

```bash
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Branch-Id: $BRANCH_ID" \
     https://api.example.com/api/v1/dashboard/summary
```

Branch comparison with custom date range:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.example.com/api/v1/analytics/org/branch-comparison?period=custom&from=2025-06-01&to=2025-06-15"
```

---

## Error code reference

All error responses use `{ "statusCode": number, "code": string, "message": string }`.

| `code` | HTTP | Endpoint(s) |
|--------|------|-------------|
| `BRANCH_LIMIT_REACHED` | 403 | `POST /branches` |
| `BRANCH_NAME_CONFLICT` | 409 | `POST /branches`, `PATCH /branches/:id` |
| `NO_DEFAULT_BRANCH` | 409 | `POST /branches` |
| `MULTIPLE_DEFAULT_BRANCHES` | 409 | `POST /branches` |
| `BRANCH_TRANSFER_SAME_BRANCH` | 400 | `POST /inventory/transfer` |
| `BRANCH_NOT_IN_ORG` | 403 | `POST /inventory/transfer` |
| `INSUFFICIENT_STOCK_FOR_TRANSFER` | 422 | `POST /inventory/transfer` |
| `PRICE_SCOPE_REQUIRED` | 400 | `PATCH /products/:id`, `PATCH /products/:id/pricing` |
| `BRANCH_LIMIT_OVERRIDE_INVALID` | 400 | `PATCH /platform/organizations/:id/branch-limit` |

---

---

## 7. Branch identity in existing API responses

### ⚠ Breaking change — branch-scoped reports (`/reports/*`)

`GET /api/v1/reports/sales-summary`, `GET /api/v1/reports/staff-performance`, and `GET /api/v1/reports/revenue-trends` no longer return report fields at the top level. Each response is now:

```jsonc
{
  "branch": { "id": "uuid", "name": "Main outlet" },
  "reportData": {
    // previous top-level payload unchanged inside here
  }
}
```

Migrate every report consumer to read metrics from `response.reportData` and branch context from `response.branch`.

---

Section 7 adds branch context across list/detail endpoints so the Hub can show which branch a row belongs to. **Almost all changes are additive** — existing fields are preserved. The exception is `/reports/*` (see breaking change above).

All branch-scoped routes still require `X-Branch-Id` (or JWT fallback) where they did before.

### Shared fields

| Field | Meaning |
|-------|---------|
| `branchId` | UUID of the branch the record belongs to; `null` when org-wide (notifications only) |
| `branchName` | Human-readable branch name; `null` when org-wide or unassigned |
| `branch` | Object on dashboard summary and reports envelope: `{ id, name, isDefault? }` |

---

### Sales — `GET /api/v1/sales` (and sale detail/create responses)

Each sale item now includes:

```jsonc
{
  "branchId": "uuid",
  "branchName": "Main outlet",
  // ...existing sale fields unchanged
}
```

`branchId` was already present; `branchName` is new.

---

### Returns — `GET /api/v1/returns`

Each return item now includes top-level branch fields:

```jsonc
{
  "branchId": "uuid",
  "branchName": "Main outlet",
  "processedBy": {
    "branchId": "uuid",   // still present for backward compatibility
    ...
  },
  ...
}
```

---

### Inventory — `GET /api/v1/inventory/stock-takes` and `GET /api/v1/inventory/adjustments`

Each row in `data` now includes:

```jsonc
{
  "branchId": "uuid",
  "branchName": "Main outlet",
  "user": { "branchId": "uuid", ... },  // unchanged
  ...
}
```

Create responses (`POST` stock-take, manual adjustment) use the same shape.

---

### Staff — `GET /api/v1/staff` and `GET /api/v1/staff/:id`

Each staff member now includes top-level branch assignment:

```jsonc
{
  "branchId": "uuid",       // null if unassigned
  "branchName": "Main outlet",
  "staffProfile": { "branchId": "uuid", ... },  // unchanged
  ...
}
```

---

### Staff performance — `GET /api/v1/staff/performance`

Each ranking row now includes:

```jsonc
{
  "branchId": "uuid",
  "branchName": "Main outlet",
  "userId": "...",
  "staffId": "STF-001",
  ...
}
```

The same `branchId` / `branchName` fields appear on each staff row inside `reportData.rankings.*` on `GET /api/v1/reports/staff-performance`.

---

### Notifications — `GET /api/v1/notifications`

Inbox filtering is unchanged: you see org-wide alerts (`branchId: null`) plus alerts for the active branch.

Each notification item now includes:

```jsonc
{
  "branchId": "uuid",     // null = org-wide (billing, plan, platform messages)
  "branchName": "Main outlet",
  ...
}
```

**Unread count cache:** `GET /api/v1/notifications/unread-count` is now cached per `(user, activeBranch)`. Switching `X-Branch-Id` refetches the correct badge count instead of reusing another branch's cached value.

**Operational `branchId` stamping:** return-processed, staff time-warning, stock-variance, and stock-transfer hub notifications now stamp `branchId`. Org-wide alerts (manual hub sends, platform broadcasts, billing) remain `branchId: null`.

Stock transfers create a hub notification (`type: STOCK_TRANSFER_COMPLETED`, `metadata.source: "stock_transfer"`) visible when viewing the source branch. (Previously this used `type: OTHER`.)

**New notification types (section 8).** The following branch notification types may now appear in the inbox. See section 8 for the full list and `branchId` semantics:

| Type | When | `branchId` |
|------|------|------------|
| `BRANCH_CREATED` | A branch is created | the new branch |
| `BRANCH_DEACTIVATED` | A non-default branch is deactivated | the branch |
| `BRANCH_LIMIT_APPROACHING` | Org reaches its last available branch slot | `null` (org-wide) |
| `STOCK_TRANSFER_COMPLETED` | A stock transfer succeeds | source branch |
| `PRICE_OVERRIDE_APPLIED` | A branch price override is set or cleared | active branch |
| `BRANCH_STOCK_VARIANCE` | A sale is recorded with stock variance (renamed from `STOCK_VARIANCE_SALE`) | the sale's branch |

> Breaking change: `STOCK_VARIANCE_SALE` has been removed from the `NotificationType` enum and replaced by `BRANCH_STOCK_VARIANCE`. Any client that filters notifications on the literal string `"STOCK_VARIANCE_SALE"` must switch to `"BRANCH_STOCK_VARIANCE"`.

---

### Dashboard — `GET /api/v1/dashboard/summary`

```jsonc
{
  "branch": { "id": "uuid", "name": "Main outlet", "isDefault": true },
  "totalSales": 120,
  "totalRevenue": 45000,
  "totalActiveProducts": 85,
  "todaySales": 8,
  "todayRevenue": 3200,
  "lowStockCount": 3,
  "expiringSoonCount": 2,
  "pendingTemporaryItems": 1
}
```

`GET /api/v1/dashboard/reliability-summary` is unchanged (no `branch` object in this pass).

---

### Batches — `GET /api/v1/batches`, `GET /api/v1/batches/:id`, expiring/expired lists

Each batch now includes:

```jsonc
{
  "branchId": "uuid",
  "branchName": "Main outlet",
  ...
}
```

---

### Reports — branch-scoped (`/reports/*`)

See the breaking change at the top of this document. Example for sales summary:

```jsonc
{
  "branch": { "id": "uuid", "name": "Main outlet" },
  "reportData": {
    "dateRange": { "startDate": "2026-06-01", "endDate": "2026-06-15" },
    "totalSales": 42,
    "totalRevenue": 18500,
    "count": 42,
    "average": 440.48,
    "paymentBreakdown": [...]
  }
}
```

Staff performance `reportData.rankings` rows include `branchId` and `branchName` per staff member.

---

## Out of scope (remaining backend work)

- `GET /api/v1/users/me` does **not** include branch usage metadata. Use `GET /api/v1/branches` → `meta` instead.
- Automated `LOW_STOCK_BRANCH` / expiry alert notification pipelines are not implemented yet (the enum value exists, but nothing emits it).
- Default-branch reassignment API. Deactivating the default branch is blocked (see section 9); there is no endpoint yet to move the default flag to another branch.
- `BRANCH_SWITCHED` server-side event. Switching the active branch is a client-side `X-Branch-Id` header change; the server does not record a switch event.

---

## 7. Branch creation — roles & validation

This was delivered in section 1; the rules are restated here for completeness.

- `POST /api/v1/branches` is **ADMIN only**. `MANAGER` can no longer create branches.
- `PATCH /api/v1/branches/:id` remains open to `ADMIN` and `MANAGER`.
- Creation enforces, in order: default-branch integrity, case-insensitive duplicate-name check, then the plan limit. See section 1 for the error codes (`NO_DEFAULT_BRANCH`, `MULTIPLE_DEFAULT_BRANCHES`, `BRANCH_NAME_CONFLICT`, `BRANCH_LIMIT_REACHED`).

---

## 8. Branch error codes & enums

All branch error responses follow the shape `{ "statusCode": number, "code": string, "message": string }`. The `code` is stable; key off it rather than the message.

### Branch error codes

| `code` | Typical HTTP | Meaning |
|--------|--------------|---------|
| `BRANCH_LIMIT_REACHED` | 403 | Plan/override branch limit hit. |
| `BRANCH_LIMIT_OVERRIDE_INVALID` | 400 | Super-admin override value is invalid. |
| `NO_DEFAULT_BRANCH` | 409 | Org has active branches but no default. |
| `MULTIPLE_DEFAULT_BRANCHES` | 409 | Org has more than one default branch. |
| `BRANCH_NAME_CONFLICT` | 409 | Active branch with that name already exists (case-insensitive). |
| `BRANCH_NOT_FOUND` | 404 | Branch id is not in your organization. |
| `BRANCH_INACTIVE` | 403 | Branch exists but is deactivated. |
| `BRANCH_ACCESS_DENIED` | 403 | Staff attempted a branch other than their assignment. |
| `BRANCH_CONTEXT_MISSING` | 403 | No branch could be resolved (no `X-Branch-Id` header and no default). |
| `BRANCH_TRANSFER_SAME_BRANCH` | 400 | Stock transfer source and destination are identical. |
| `BRANCH_NOT_IN_ORG` | 403 | A transfer branch is missing/inactive/not in your org. |
| `INSUFFICIENT_STOCK_FOR_TRANSFER` | 422 | Source branch lacks the requested quantity. |
| `PRICE_SCOPE_REQUIRED` | 400 | Price update omitted `priceScope`. |
| `BRANCH_CANNOT_DEACTIVATE_DEFAULT` | 409 | Attempt to deactivate the default branch (see section 9). |

The branch guard (`X-Branch-Id` resolution) now returns these structured codes. A missing/unresolvable branch returns `BRANCH_CONTEXT_MISSING`, an unknown branch returns `BRANCH_NOT_FOUND`, a deactivated branch returns `BRANCH_INACTIVE`, and a staff member hitting the wrong branch returns `BRANCH_ACCESS_DENIED`.

### Notification types

The new branch `NotificationType` values are listed in the notifications section above. `STOCK_VARIANCE_SALE` has been removed in favor of `BRANCH_STOCK_VARIANCE`.

### Plan tiers

Branch limits are driven by the existing `PlanType` enum (`TRIAL`, `FREE`, `PRO`, `ENTERPRISE`) — there is no separate `PlanTier`. See section 1 for the per-plan limits.

---

## 9. Branch deactivation rules

`PATCH /api/v1/branches/:id` with `{ "isActive": false }`:

- On the **default** branch → `409 BRANCH_CANNOT_DEACTIVATE_DEFAULT`. The default branch can never be deactivated; the org must always have an active default.
- On a **non-default** branch → succeeds. This emits a `BRANCH_DEACTIVATED` audit event and a `BRANCH_DEACTIVATED` notification.

UI guidance: disable the deactivate control for the default branch, and surface a message asking the admin to assign a different default first (a reassignment endpoint is not part of this pass — see "Out of scope").

Renaming via `PATCH` continues to enforce the case-insensitive duplicate-name check (`409 BRANCH_NAME_CONFLICT`).

---

## Migration / deployment note

Two Prisma migrations back these features:

1. `prisma/migrations/20260615000000_branch_limits_pricing_transfer` adds `Organization.branchLimitOverride`, `BranchInventory.costPriceOverride`, `BranchInventory.sellingPriceOverride`, and the `STOCK_TRANSFER_OUT` / `STOCK_TRANSFER_IN` stock-adjustment enum values.
2. `prisma/migrations/20260617000000_branch_enums` adds the branch `EventType` values and the branch `NotificationType` values, and **removes** `STOCK_VARIANCE_SALE` (existing rows are migrated to `BRANCH_STOCK_VARIANCE` as part of the migration).

Apply them with `npx prisma migrate deploy` (or `migrate dev` locally) before deploying the API.
