# Phase 1: Branch Context - Frontend Integration Guide

## Why these changes exist

The backend previously had a `Branch` model in the database but no proper branch lifecycle or request scoping. Several Hub APIs accepted a `branchId` query parameter where passing the **organization ID** (or omitting `branchId`) meant “show org-wide data.” That was a temporary workaround: it broke owner-level analytics, caused incorrect data scoping, and blocked a correct multi-branch Hub experience.

Phase 1 establishes real branch entities, default branches at signup, JWT branch context, header-based branch switching, and branch-scoped list/analytics endpoints.

---

## Schema change

`Branch` now includes:

| Field | Type | Notes |
|-------|------|-------|
| `isDefault` | `boolean` | Exactly one default branch per org (set at signup). Not settable via branch CRUD API. |

Existing fields unchanged: `id`, `organizationId`, `name`, `location`, `isActive`, timestamps.

Every new organization signup atomically creates a default branch named after the organization with `isDefault: true`.

---

## Auth responses - `defaultBranchId`

The following endpoints now include `defaultBranchId` (`string | null`):

| Endpoint | Method |
|----------|--------|
| `/api/v1/auth/signup` | POST |
| `/api/v1/auth/login` | POST |
| `/api/v1/auth/staff/login` | POST |
| Handoff session consume (via `AuthService.issueSessionForUserId`) | POST |
| `/api/v1/users/me` | GET |

There is no `GET /auth/me`. Use **`GET /api/v1/users/me`** as the current-user endpoint.

Example login response shape:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "defaultBranchId": "uuid-of-default-branch",
  "user": { "id": "...", "email": "...", "role": "ADMIN", "organizationId": "..." }
}
```

Example `GET /users/me` response:

```json
{
  "user": { ... },
  "organization": { ... },
  "defaultBranchId": "uuid-or-null"
}
```

If an org has no default branch (legacy data edge case), `defaultBranchId` is `null` and the server logs a warning. Do not rely on this in normal flows.

---

## JWT claims

Access tokens now include:

| Claim | Type | Meaning |
|-------|------|---------|
| `defaultBranchId` | `string \| null` | Org's branch where `isDefault: true` |
| `activeBranchId` | `string \| null` | Staff's assigned `staffProfile.branchId`, or `defaultBranchId` for ADMIN / unassigned staff |

On token refresh, branch IDs are re-resolved from the database (staff reassignment and default branch changes are reflected).

---

## Request branch context - `X-Branch-Id` header

For branch-scoped Hub APIs, send:

```
X-Branch-Id: <branch-uuid>
```

**Resolution order (server-side):**

1. `X-Branch-Id` header (if present)
2. JWT `activeBranchId`
3. JWT `defaultBranchId`

**Role behavior:**

| Role | Branch access |
|------|----------------|
| `ADMIN` | Any active branch in the org (switch via header) |
| `MANAGER`, `STAFF`, `SALES_AGENT` | Only their `staffProfile.branchId`; wrong branch → `403` |

---

## Removed: `?branchId=` query parameters

Do **not** send `branchId` as a query or body field on these endpoints anymore:

- `GET /api/v1/sales`
- `GET /api/v1/sales/with-variances`
- `GET /api/v1/sales/stats`
- `GET /api/v1/sales/export`
- `GET /api/v1/returns`
- `GET /api/v1/inventory/stock-takes`
- `POST /api/v1/inventory/stock-takes`

Use the `X-Branch-Id` header instead. If omitted, the server uses JWT branch context.

---

## New Branches API

Base path: `/api/v1/branches`

All routes require authentication and tenant context (`organizationId` in JWT).

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/branches` | ADMIN, MANAGER, STAFF, SALES_AGENT | List all branches for the org (default branch first) |
| POST | `/branches` | ADMIN, MANAGER | Create branch (`name` required, `location` optional). Never `isDefault`. |
| PATCH | `/branches/:id` | ADMIN, MANAGER | Update `name`, `location`, `isActive`. Cannot set `isDefault`. |

**Create body:**

```json
{ "name": "Osu Express", "location": "Osu" }
```

**Update body (all optional):**

```json
{ "name": "Osu Express", "location": "Osu", "isActive": true }
```

**List response:** array of branch objects including `isDefault`.

---

## Branch-scoped endpoints (require branch context)

These routes use `BranchGuard`. They need a resolvable branch (header or JWT):

- `GET /api/v1/dashboard/summary`
- `GET /api/v1/dashboard/reliability-summary`
- `GET /api/v1/sales` (and stats, export, with-variances)
- `GET /api/v1/returns`
- `GET /api/v1/inventory/stock-takes`
- `POST /api/v1/inventory/stock-takes`

Sales, returns, and dashboard sales metrics are filtered by staff who belong to the active branch (`staffProfile.branchId`). Catalog/product counts on the dashboard remain org-wide (Phase 3 will add per-branch inventory).

---

## Recommended Hub UI flows

### Initial load after login

1. Store `defaultBranchId` from login/signup/`/users/me`.
2. Set active branch to `defaultBranchId`.
3. Include `X-Branch-Id: <activeBranchId>` on all branch-scoped Hub API calls.

### Branch switcher (ADMIN)

1. `GET /branches` to populate the list.
2. On selection, update local active branch state.
3. Send `X-Branch-Id` on subsequent requests.
4. No re-login required.

### Staff users

- Do not show a branch switcher unless the user is ADMIN.
- Staff are locked to their assigned branch; sending a different `X-Branch-Id` returns `403`.

### After creating a new branch

1. `POST /branches`
2. Refresh branch list via `GET /branches`
3. ADMIN may switch to the new branch via header

---

## Error codes

| Status | When |
|--------|------|
| `403 Forbidden` | No branch resolved, staff accessing wrong branch, or missing staff branch assignment |
| `404 Not Found` | `X-Branch-Id` or JWT branch ID does not exist in the org or is inactive |
| `400 Bad Request` | Handler called without `BranchGuard` (internal; should not occur on documented routes) |

---

## Out of scope for Phase 1 (do not expect yet)

- `branchId` on `Sale`, `Return`, or `StockAdjustment` records (Phase 2)
- Per-branch product stock / catalog duplication (Phase 3)
- Branch delete endpoint (use `PATCH` with `isActive: false`)

---

## Seed / local dev

After pulling these changes, reset and re-seed the database:

```bash
npm run db:reset   # or migrate + seed manually
```

Seed data creates `Main outlet` with `isDefault: true` and `Express counter` with `isDefault: false`.

---

## Phase 2: branchId on Operational Data

Phase 2 stamps a non-nullable `branchId` foreign key directly on operational records at write time, and replaces join-through-staff read filters with direct `branchId` queries.

### Schema changes

`branchId` (`UUID`, FK → `Branch`, `onDelete: Restrict`) was added to:

| Table | Notes |
|-------|-------|
| `Sale` | Stamped on hub create and mobile upload |
| `Return` | Stamped on mobile `POST /staff/returns` |
| `StockAdjustment` | All adjustment types including stock takes |
| `StockDiscrepancy` | Column added for schema completeness (no create paths yet) |

Each table also has indexes on `(organizationId, branchId)` and `branchId` where useful.

Stock takes are **`StockAdjustment` rows with `type: STOCK_TAKE`** - there is no separate stock-take table.

### Write-time stamping

| Context | Branch resolution |
|---------|-------------------|
| Hub routes (`BranchGuard` + `@CurrentBranch()`) | Active branch from `X-Branch-Id` header or JWT default |
| Mobile staff routes (no `BranchGuard`) | `staffProfile.branchId` via `BranchContextService.requireStaffBranchId()` |

Hub write routes that stamp `branchId`:

- `POST /sales`
- `POST /inventory/stock-takes`
- `POST /inventory/convert-bulk`
- `POST /batches`, `PATCH /batches/:id`, `POST /batches/:id/remove-expired`
- `POST /products`, `PATCH /products/:id`, `POST /products/from-temporary/:productId`

Mobile write routes (staff branch only - header must not override):

- `POST /staff/sales`
- `POST /staff/returns`
- `POST /staff/stock-adjustments`

### Read filters

Phase 1 used join-through-staff:

```typescript
where.createdBy = { staffProfile: { branchId } }
```

Phase 2 uses direct column filters:

```typescript
where.branchId = branchId
```

Affected list/analytics endpoints: sales, returns, stock takes, inventory adjustments, dashboard summary, and all report endpoints (`/reports/sales-summary`, `/reports/staff-performance`, `/reports/revenue-trends`).

Reports are now **branch-scoped** via `BranchGuard`. ADMIN users switch branch with `X-Branch-Id` to view another branch's reports.

Serialized API responses expose `branchId` from the operational record (not inferred from the creating staff member's profile).

### Out of scope for Phase 2

- Platform-admin cross-tenant analytics
- Per-branch product stock / catalog (`Product.currentStock`, batch catalog) - Phase 3
- `StockDiscrepancy` create flows (column exists only)

### Seed / local dev

After pulling Phase 2 changes, reset and re-seed so all operational rows have `branchId`:

```bash
npm run db:reset
```

Seeded sales and stock adjustments use `mainBranch.id` (`Main outlet`).

---

## Phase 3: Branch-Scoped Inventory

Phase 3 separates the **org-wide product catalog** from **per-branch stock levels**.

### BranchInventory model

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | Primary key |
| `branchId` | UUID FK → `Branch` | Non-nullable |
| `productId` | UUID FK → `Product` | Non-nullable |
| `currentStock` | Decimal(12,3) | Default `0` |
| `reorderLevel` | Decimal?, nullable | Per-branch override; falls back to `Product.reorderLevel` |
| `updatedAt` | timestamp | Auto-updated |

Unique constraint: `(branchId, productId)` - one inventory row per product per branch.

`Product.currentStock` was **removed**. All user-facing stock reads go through `BranchInventory` via `BranchInventoryService` (`getStock`, `applyDelta`, `setStock`, `seedRow`).

### Batch.branchId

`Batch` is branch-scoped: a stock delivery lands at a specific branch. All batch reads and writes filter or stamp `branchId`.

### Org catalog vs branch stock boundary

| Org-scoped (never branch-filtered) | Branch-scoped |
|-----------------------------------|---------------|
| Product name, SKU, price, category | `BranchInventory.currentStock` |
| Categories, tax defaults | Batches (`branchId`) |
| `GET /products` catalog list (all org products) | Stock figures joined for active branch |
| User accounts, billing, plan | Sales, returns, adjustments (Phase 2) |

`GET /products` and `GET /products/:id` resolve the active branch via `BranchContextService.resolveHubBranchId()` (same validation as `BranchGuard`) but do **not** use `BranchGuard` on the list route - the catalog is org-wide; only stock overlay is branch-aware. Missing `BranchInventory` row → `currentStock: "0"`.

`GET /products/low-stock`, `GET /products/expiring-soon`, batch endpoints, and stock-mutating routes use `BranchGuard` + `@CurrentBranch()`.

### Stock write paths

All stock mutations use `BranchInventoryService` with the correct `branchId`:

- Hub sales, stock-takes, product create/update, batch receipt, bulk conversion → `@CurrentBranch()`
- Mobile sales, returns, adjustments → `requireStaffBranchId()`

### Stock read paths

- `GET /products` - org catalog + `BranchInventory` join for active branch
- `GET /products/low-stock` - `BranchInventory` vs reorder level (branch override or product default)
- `GET /products/expiring-soon` - batches filtered by `branchId`
- Dashboard `lowStockCount` / `expiringSoonCount` - branch-scoped; `totalActiveProducts` remains org-wide
- Mobile catalog (`/staff/inventory`, `/staff/master-data`, `/sync/initial-pull`) - staff branch stock

### Seed

Seed creates `BranchInventory` rows on `mainBranch` instead of `Product.currentStock`. Batches include `branchId: mainBranch.id`.

---

## Phase 4: Full Read Path Audit

Mechanical verification that branch context is wired consistently across modules.

### Module outcomes

| Module | Outcome |
|--------|---------|
| **Dashboard** | Sales/revenue aggregates use `saleScope.branchId` (Phase 2). `totalActiveProducts` org-wide. `lowStockCount` / `expiringSoonCount` branch-scoped via `BranchInventory` / `Batch.branchId`. |
| **Products** | Catalog org-wide; stock from `BranchInventory`. `resolveHubBranchId` on list/detail without `BranchGuard`. |
| **Inventory** | Adjustments and stock-takes filter `StockAdjustment.branchId`. Response `branchId` from record (not staff profile join). |
| **Sales / Returns** | Direct `branchId` filters (Phase 2). |
| **Reports** | Branch-scoped via `BranchGuard` (Phase 2). |
| **Batches** | All reads/writes branch-scoped; `BranchGuard` on read endpoints. |
| **Notifications** | Nullable `Notification.branchId`; operational alerts (e.g. `STOCK_VARIANCE_SALE`) stamped with branch. Inbox filters `(branchId IS NULL OR branchId = activeBranch)`. Org-wide alerts (billing, plan) remain `branchId: null`. |
| **Staff** | `GET /staff/performance` branch-scoped. `GET /staff` accepts optional `?branchId=` filter. |

### Remains org-scoped

Plan/billing, user accounts, product catalog master, categories, tax/VAT defaults, org settings, platform-admin cross-tenant analytics.

### Verification

- No reads from deprecated `Product.currentStock`
- Operational aggregates on `Sale` / `Return` / `StockAdjustment` include `branchId`
- Join-through-staff for operational branch resolution removed (staff profile joins remain only for telemetry/reliability and display fields)
