# Backend Integration Requirements — Phase 2

**Last Updated:** 2026-04-18

## Overview

This document tracks API endpoints, database expectations, Management Hub notifications, and sync behavior for Phase 2 of the NutaPOS Staff mobile app. It is maintained alongside mobile implementation and is the handoff artifact for **NestJS backend** and **Next.js Management Hub** teams.

---

## New API Endpoints Needed

### `POST /staff/temporary-items`

| Field | Detail |
|--------|--------|
| **Auth** | Bearer (staff access token) |
| **Purpose** | Record each temporary (unknown-barcode) product sold so the backend can aggregate counts, notify the owner, and reconcile when the product is promoted to permanent inventory. |

**Request body**

```json
{
  "barcode": "string",
  "name": "string",
  "price": 0,
  "sold_at": "2026-04-18T12:00:00.000Z",
  "staff_id": "uuid",
  "branch_id": "uuid | null",
  "local_product_id": "uuid",
  "local_sale_id": "uuid"
}
```

- `local_product_id` / `local_sale_id`: optional idempotency hints from the device (mobile sends these for deduplication).

**Success response (200/201)**

```json
{
  "id": "uuid",
  "received": true
}
```

- **`id`**: placeholder **`Product.id`** (same UUID as `local_product_id`). Backend does **not** return `aggregateId` on this route (see **Deviations from Spec** below).

**Backend action required**

- Upsert into a `TemporaryItemSale` (or equivalent) aggregate; increment org/branch daily counter for hub copy: *"N temporary items sold today. Review?"*
- Emit Management Hub notification (see below).

**Management Hub impact**

- Notification: **"N temporary items sold today. Review?"** → click opens list: `barcode`, `name`, `price`, `quantity sold`, `first_sold_at`.

---

### `POST /products/from-temporary/{tempItemId}`

| Field | Detail |
|--------|--------|
| **Auth** | Bearer (owner/admin — **not** staff mobile) |
| **Purpose** | Promote a backend temporary aggregate to a permanent `Product`; then push updated catalog to staff devices via sync. |

**Request body**

```json
{
  "name": "string",
  "cost_price": 0,
  "category_id": "uuid",
  "stock_quantity": 0,
  "barcode": "string",
  "selling_price": 0
}
```

**Mobile:** not called by the Staff app; documented for Hub/backend only.

---

### `GET /staff/master-data`

| Field | Detail |
|--------|--------|
| **Auth** | Bearer |
| **Query** | `since` — ISO 8601 timestamp; return rows with `updated_at > since`. |

**Response**

```json
{
  "products": [
    {
      "id": "uuid",
      "barcode": "string | null",
      "name": "string",
      "price": 0,
      "cost_price": 0,
      "updated_at": "ISO8601"
    }
  ],
  "settings": {
    "tax_rate": 0,
    "tax_enabled": false
  },
  "updated_at": "ISO8601"
}
```

**Mobile behavior:** replaces local product rows by `id` / `barcode`; clears `is_temporary` when server sends a permanent product for a previously temporary barcode.

**Temporary items — when `POST /staff/temporary-items` fires:** One row is queued **per temporary product line at sale completion** (not at product creation in the scanner), so backend daily counts match “sold today” semantics. Payload includes `local_sale_id` and `local_product_id` for idempotency.

---

### `POST /staff/returns`

**Request body**

```json
{
  "id": "uuid",
  "original_sale_id": "uuid",
  "refund_amount": 0,
  "returned_items": [
    { "product_id": "uuid", "quantity": 0, "unit_price": 0 }
  ],
  "sold_at": "ISO8601",
  "staff_id": "uuid",
  "branch_id": "uuid | null",
  "receipt_number": "string | null",
  "refund_method": "cash"
}
```

- **`refund_method`** (optional): `cash` | `card` | `mobile_money` | `transfer` | `mixed` — mobile sends value derived from the **original sale** `payment_method`; backend can still derive if omitted.

**Success:** `{ "id": "uuid", "syncedAt": "ISO8601" }` (optional; mobile accepts empty object).

**Backend / Hub:** notification **"Return processed by [Staff Name]"** with original sale reference, items, refund; link to sale in analytics.

---

### `POST /staff/inventory-events`

**Request body**

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "event_type": "SALE | RETURN | ADJUSTMENT | RESTOCK",
  "quantity_change": 0,
  "reference_id": "uuid",
  "staff_id": "uuid",
  "notes": "string | null",
  "created_at": "ISO8601"
}
```

**Hub:** Inventory → product → **View History** chronological list.

---

### `GET /time`

**Response**

```json
{ "timestamp": "2026-04-18T12:00:00.000Z" }
```

**Note:** May be public or Bearer — mobile uses Bearer when logged in; falls back if 401.

---

### `POST /staff/time-warning`

**Request body**

```json
{
  "staff_id": "uuid",
  "device_time": "ISO8601",
  "offset_minutes": 0,
  "device_model": "string"
}
```

**Hub:** staff profile badge **"Device time incorrect"**; detail: offset and disclaimer on timestamp accuracy.

---

### `POST /staff/stock-adjustments`

**Request body**

```json
{
  "id": "uuid",
  "product_id": "uuid",
  "change": -2,
  "reason": "SALE | RETURN | ADJUSTMENT | RESTOCK",
  "reference_id": "uuid",
  "staff_id": "uuid",
  "created_at": "ISO8601"
}
```

**Backend:** `UPDATE products SET stock = stock + change` (transactional, idempotent by `id`).

---

### `POST /analytics/performance`

```json
{
  "metric": "sale_completion | scan_speed | sync_duration",
  "duration_ms": 0,
  "device_model": "string",
  "extra": {}
}
```

### `POST /analytics/crash`

```json
{
  "error": "string",
  "stack": "string",
  "is_fatal": false,
  "device_info": {}
}
```

**Hub:** optional dashboard for slow devices / crash rates.

---

## Database Schema Changes (PostgreSQL / Prisma)

| Area | Change |
|------|--------|
| Temporary item tracking | Table or fields to aggregate temp barcode sales per org/day; link to `NotificationType.TEMPORARY_ITEM_SOLD`. |
| Returns | Align with existing `Return` model; ensure `originalSaleId`, line items, refund totals. |
| Inventory audit | Optional `InventoryEvent` table mirroring mobile `inventory_events`. |
| Staff device | Optional fields for last `time_warning_at`, `offset_minutes`. |

**Migration required:** Yes on backend for new notification types and analytics endpoints.

**Affects:** Backend, Management Hub, Mobile (contract only for mobile SQLite).

---

## Notifications / Alerts for Management Hub

| Alert | Trigger | Message (example) | Owner action |
|-------|---------|---------------------|--------------|
| Temporary items | `POST /staff/temporary-items` aggregated | *"5 temporary items sold today. Review?"* | Open list; use `POST /products/from-temporary/...` |
| Return | `POST /staff/returns` | *"Return processed by [Name] — ₵X"* | View sale / return detail |
| Time skew | `POST /staff/time-warning` | Staff badge warning | Contact staff / ignore |
| Delayed sync | Server: `synced_at - sold_at > 24h` | Analytics ⚠️ on sale row | Investigate offline period |

---

## Sync Behavior Changes

| Feature | Mobile sends | Backend processes | Hub displays |
|---------|--------------|-------------------|--------------|
| Delayed sale | `sold_at`, `syncedAt` on sale | Flag if delay > 24h | Tooltip on sale |
| Master data | Pull `GET /staff/master-data?since=` | Delta products/settings | N/A |
| Stock delta | `POST /staff/stock-adjustments` | Apply relative change | Inventory matches |

---

## Security & Tokens (Mobile)

| Topic | Spec |
|-------|------|
| Access token TTL | 15 minutes (backend JWT) |
| Refresh token TTL | 30 days |
| Storage | `react-native-keychain` for tokens and device-binding flag |
| SQLCipher | **Follow-up spike:** replace `expo-sqlite` with an encrypted driver (e.g. SQLCipher bindings) + one-time migration of `nutapos_staff.db`; coordinate with Expo prebuild / dev client. Tokens and binding flag already use Keychain. |

---

## Testing Checklist

- [x] `POST /staff/temporary-items` idempotent / duplicate-safe
- [x] Hub receives temporary-item notification
- [x] `GET /staff/master-data?since=` returns promoted products
- [x] `POST /staff/returns` + hub notification
- [x] `POST /staff/inventory-events` stored and visible in Hub history
- [x] `GET /time` + `POST /staff/time-warning`
- [x] `POST /staff/stock-adjustments` idempotent
- [x] Analytics endpoints accept payloads from mobile

---

## Mobile client (React Native) — NutaPOS Staff

Implementation in this repo is aligned with **Backend Implementation Notes** and **Deviations from Spec** below.

| Topic | Behavior |
|-------|----------|
| **`GET /time`** | Uses **`buildRootPath('/time')`** (full URL = API origin + `/time`, **no** `/api/v1` prefix). Matches Nest: time routes live on the server root. |
| **`POST /staff/temporary-items`** | Waits for HTTP **200/201/409** before `sync_queue` → `COMPLETED` and `UPDATE products.synced_at` for `local_product_id`. Response **`id`** = placeholder **Product** id. |
| **`POST /staff/returns`** | **Online-only** (API success before local DB write); **`refund_method`** sent from original sale; **30s** client timeout with user messaging on failure. |
| **Analytics** | **`POST /analytics/performance`** and **`POST /analytics/crash`** only — same as **Analytics Endpoint Structure (FINAL)**. |
| **Sales payload** | Sends **`receipt_number`** + **`receiptNumber`** (and `RCP-YYYYMMDD-XXXXXX` generation) for `POST /staff/sales`. |

---

## Backend Implementation Notes

**Completed by:** Cursor Agent  
**Date:** 2026-04-18  
**Backend Commit/PR:** _(add link when merged)_

### API base path

All authenticated JSON routes use the global prefix **`/api/v1`** (see `main.ts`). **`GET /time`** and **`GET /health`** are excluded from the prefix and remain at **`/time`** and **`/health`** on the server root.

### Endpoints Implemented

- ✅ `POST /api/v1/staff/temporary-items` → [`src/modules/staff/staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-temporary-items.service.ts`](src/modules/staff/staff-temporary-items.service.ts)
- ✅ `POST /api/v1/products/from-temporary/{productId}` (placeholder **product** id) → [`products.controller.ts`](src/modules/products/products.controller.ts) + [`products.service.ts`](src/modules/products/products.service.ts) (`promoteFromTemporary`)
- ✅ `GET /api/v1/staff/master-data` → [`staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-catalog.service.ts`](src/modules/staff/staff-catalog.service.ts) (`getMasterData`)
- ✅ `POST /api/v1/staff/returns` → [`staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-returns.service.ts`](src/modules/staff/staff-returns.service.ts)
- ✅ `POST /api/v1/staff/inventory-events` → [`staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-inventory-events.service.ts`](src/modules/staff/staff-inventory-events.service.ts)
- ✅ `GET /time` (public) → [`src/health/time.controller.ts`](src/health/time.controller.ts)
- ✅ `POST /api/v1/staff/time-warning` → [`staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-time-warning.service.ts`](src/modules/staff/staff-time-warning.service.ts)
- ✅ `POST /api/v1/staff/stock-adjustments` → [`staff-mobile.controller.ts`](src/modules/staff/staff-mobile.controller.ts) + [`staff-stock-adjustments.service.ts`](src/modules/staff/staff-stock-adjustments.service.ts)
- ✅ `POST /api/v1/analytics/performance` and `POST /api/v1/analytics/crash` → [`src/modules/analytics/analytics.controller.ts`](src/modules/analytics/analytics.controller.ts)
- ✅ `GET /api/v1/notifications` (Hub) → [`src/modules/notifications/notifications.controller.ts`](src/modules/notifications/notifications.controller.ts)
- ✅ `GET /api/v1/products/:id/inventory-events` (Hub) — read model for mobile-posted inventory audit rows → [`products.controller.ts`](src/modules/products/products.controller.ts)

### Database Migrations

- `prisma/migrations/20260418213445_phase2_mobile_staff_integration/` — Phase 2 core tables and enums.
- `prisma/migrations/20260419164317_phase2_alignment_receipt_refund_daily_notify/` — `Sale.receipt_number` (`receiptNumberMobile`), `Return.refund_method`, `TemporaryItemOrgDayNotification` (one batched temp-item notification row per org per UTC day).

### Notification Types Added / Used

- `TEMPORARY_ITEM_SOLD` — **one hub notification per organization per UTC calendar day** (daily batch). Rows are materialized at **00:05 UTC** (cron) and lazily when an admin opens **`GET /api/v1/notifications`** (yesterday’s batch if missing). `metadata.summaryUtcDate`, `metadata.items` (deduped lines). **No per-item / per-request spam** from `POST /staff/temporary-items`.
- `RETURN_PROCESSED` — **hub-only** in-app notification (no mobile push). `metadata` includes `original_sale_id`, `return_id`, `refund_method`, `hub_only: true`.
- `STAFF_TIME_WARNING` — org-wide alert; staff badge data on `StaffProfile` (`lastDeviceTimeWarningAt`, `lastDeviceTimeOffsetMinutes`, `lastDeviceTimeModel`, `deviceTimeWarningCount`)
- Delayed sync: `isDelayedSync` on sale payloads when `syncedAt` minus `soldAt` &gt; 24h — see [`sales.service.ts`](src/modules/sales/sales.service.ts) `serializeSale` (Hub matches this using **`synced_at` / `sold_at`** only; see [`lib/sale-sync.ts`](lib/sale-sync.ts)).

### Resolved Questions (Phase 2 alignment)

1. **Temporary notifications:** **DAILY** batch per organization (UTC day). Aggregation job: cron at **00:05 UTC** plus lazy materialize on hub `GET /notifications`.
2. **Return notifications:** **Hub-only** — `RETURN_PROCESSED` is stored for the Management Hub only; staff are not sent a push or in-app duplicate (staff already processed the return; mobile requires online for returns).
3. **Temporary products:** **Option B** — placeholder `Product` rows use the mobile **`local_product_id` as `Product.id`** (`isTemporary: true`, `needsReview: true`). Promotion: **`POST /api/v1/products/from-temporary/{productId}`** updates that product and clears related `TemporaryItemSaleLine` rows.
4. **Temporary items auto-dismiss:** **NO** — items remain in the owner review queue until **Promote** or **Ignore/Delete**; no 7-day auto-hide (could hide real catalog gaps). Optional Hub UX: badge when first sold &gt; 7 days ago.
5. **Return notifications (staff mobile):** **NO** duplicate confirmation — hub-only notifications; aligns with item 2.
6. **Delayed sync threshold:** **FIXED at 24 hours** — no org setting in the Hub for now (`YAGNI`). Warning when `synced_at - sold_at &gt; 24h` (see backend `serializeSale` and Hub [`lib/sale-sync.ts`](lib/sale-sync.ts)).

### Resolved Questions (Management Hub — product decisions)

1. ✅ **Temporary items:** NO auto-dismiss (manual review required: promote or ignore/delete).
2. ✅ **Return notifications:** HUB-ONLY (staff receives no confirmation notification).
3. ✅ **Delayed sync threshold:** FIXED at 24 hours (no setting UI needed).

### Field Additions (Phase 2)

- **`Sale.receipt_number`** — stored as optional column **`receipt_number`** (`receiptNumberMobile` in Prisma). `POST /api/v1/staff/sales` accepts **`receipt_number`** and/or **`receiptNumber`** (at least one required); canonical unique receipt remains **`receiptNumber`**. List/detail responses include **`receipt_number`** and **`receipt_number_mobile`** on serialized sales (see [`sales.service.ts`](src/modules/sales/sales.service.ts)).
- **`Return.refund_method`** — optional string column; set from **`refund_method`** on the request if present, otherwise derived from the original sale’s **`paymentMethod`** (`cash`, `card`, `mobile_money`, `transfer`, `mixed`). See [`staff-returns.service.ts`](src/modules/staff/staff-returns.service.ts).
- **Product ID strategy:** Temporary lines use **`local_product_id` = `Product.id`** for the placeholder product.

### Analytics Endpoint Structure (FINAL)

Mobile should call **two separate endpoints** (no combined `/analytics/events`):

- **`POST /api/v1/analytics/performance`** — body: `{ "metric": "sale_completion" | "scan_speed" | "sync_duration", "duration_ms": number, "device_model": string, "extra"?: object }`
- **`POST /api/v1/analytics/crash`** — body: `{ "error": string, "stack"?: string, "is_fatal": boolean, "device_info"?: object }`

### Deviations from Spec

- **`POST /staff/temporary-items`** response is **`{ "id": "<local_product_id>", "received": true }`** — `id` is the placeholder **product** id (not a sale-line id); **`aggregateId` was removed** from the mobile response.
- **`POST /products/from-temporary/{productId}`** — path parameter is the **placeholder product UUID**, not a `TemporaryItemDailyAggregate` id.
- Controllers live under **`src/modules/…`** (Nest module layout), not flat `src/staff/…`.
- **`GET /time`** is served at **`/time`**, not under `/api/v1`.
- **`GET /products/:id/inventory-events`** added so the Management Hub can list `InventoryEvent` rows (spec implied history; mobile only posts via `POST /staff/inventory-events`).

### Testing Notes

- Postman collection: [`docs/postman/Phase2_Mobile_Endpoints.json`](docs/postman/Phase2_Mobile_Endpoints.json)
- Set `accessToken`, `staffUserId`, `productId`, `saleId`, `categoryId`, `tempAggregateId` as collection variables for your environment.
- Idempotency: repeat the same UUID body for temporary lines, returns, inventory events, and stock adjustments — expect **200** and no duplicate rows.

### Open Questions for Mobile/Hub Teams

_(None blocking Phase 2 Hub — routes and fields aligned.)_

---

## Management Hub Implementation Notes

**Completed by:** Cursor Agent  
**Date:** 2026-04-18  
**Frontend Commit/PR:** _(add link when merged)_

### Pages/Components Added

- `/inventory/temporary-items` → [`app/(dashboard)/inventory/temporary-items/page.tsx`](app/(dashboard)/inventory/temporary-items/page.tsx)
- `/sales/[saleId]/return/[returnId]` → [`app/(dashboard)/sales/[saleId]/return/[returnId]/page.tsx`](app/(dashboard)/sales/[saleId]/return/[returnId]/page.tsx)
- `/staff/[staffId]/devices` → [`app/(dashboard)/staff/[staffId]/devices/page.tsx`](app/(dashboard)/staff/[staffId]/devices/page.tsx)
- Inventory event history (sheet) → [`components/inventory/inventory-event-history-sheet.tsx`](components/inventory/inventory-event-history-sheet.tsx)
- Delayed sync warning column → [`components/sales/sales-table.tsx`](components/sales/sales-table.tsx)
- Notifications popover → [`components/layout/notifications-menu.tsx`](components/layout/notifications-menu.tsx)
- Device performance / crashes (reports) → [`components/reports/device-performance-section.tsx`](components/reports/device-performance-section.tsx) + [`app/(dashboard)/reports/page.tsx`](app/(dashboard)/reports/page.tsx)

### Field Integration Confirmed (Phase 2)

- ✅ **Receipt number:** Sales table shows `receipt_number` / `receiptNumber` via [`normalizeSale`](lib/api/sales.ts) (`N/A` when absent). [`components/sales/sales-table.tsx`](components/sales/sales-table.tsx)
- ✅ **Refund method:** Return detail shows `refund_method`, falling back to `payment_method` when needed. [`app/(dashboard)/sales/[saleId]/return/[returnId]/page.tsx`](app/(dashboard)/sales/[saleId]/return/[returnId]/page.tsx), [`lib/api/returns.ts`](lib/api/returns.ts)
- ✅ **Temporary items:** List uses **placeholder product `id`** for promote / ignore (`DELETE` removes placeholder); `aggregateId` is internal/legacy — optional `?highlightProductId=` or `?aggregateId=` for row highlight only.
- ✅ **Sync delay:** Fixed **24h** threshold; `isSaleDelayedSync` requires **`synced_at`** (no warning if not synced yet). [`lib/sale-sync.ts`](lib/sale-sync.ts)

### Notification Handlers

- `TEMPORARY_ITEM_SOLD` — Uses `actionUrl` when present; otherwise `/inventory/temporary-items` with optional `?highlightProductId=` from metadata (`productId`), legacy `?aggregateId=` supported. [`lib/navigation/notification-href.ts`](lib/navigation/notification-href.ts)
- `RETURN_PROCESSED` — Resolves `/sales/{saleId}/return/{returnId}` from `metadata` or `actionUrl`.
- `STAFF_TIME_WARNING` — Resolves `/staff/{staffId}/devices` from `metadata` or `actionUrl`.
- Delayed sync — Visual indicator in sales table only (no notification type). [`lib/sale-sync.ts`](lib/sale-sync.ts)

### API Integration

- Uses existing [`lib/api/client.ts`](lib/api/client.ts) (`axios` + Bearer).
- New/extended modules:
  - [`lib/api/notifications.ts`](lib/api/notifications.ts) — `fetchNotifications()` → `GET /notifications`
  - [`lib/api/products.ts`](lib/api/products.ts) — `fetchTemporaryItems()` → `GET /products/temporary`, `promoteFromTemporary()` → `POST /products/from-temporary/{id}`, `fetchInventoryEvents()` → `GET /products/{id}/inventory-events`
  - [`lib/api/returns.ts`](lib/api/returns.ts) — `fetchReturnDetail()` → `GET /sales/{saleId}/return/{returnId}`
  - [`lib/api/analytics-hub.ts`](lib/api/analytics-hub.ts) — `fetchAnalyticsPerformance()`, `fetchAnalyticsCrashes()` (treats **404** as “endpoint not available yet”)
  - [`lib/api/staff.ts`](lib/api/staff.ts) — `parseStaffMember` extended with device time fields from `StaffProfile`
- Hooks: [`lib/hooks/use-temporary-items.ts`](lib/hooks/use-temporary-items.ts), [`lib/hooks/use-notifications.ts`](lib/hooks/use-notifications.ts)

### UI/UX Decisions

- Temporary items: `Table` + **Promote** dialog + **Ignore** (deletes placeholder product); no auto-dismiss; optional **“Sold _n_ days ago”** badge when first sold &gt; 7 days; `?highlightProductId=` / `?aggregateId=` highlights a row (amber).
- Return details: Full page with two cards (original sale vs return); link back to `/sales`.
- Inventory events: **Sheet** from the right on product detail (`View history` next to duplicate/edit actions).
- Delayed sync: Amber **AlertTriangle** with tooltip — same 24h rule as backend; tooltip uses **floored whole hours** between `sold_at` and `synced_at`.
- Reports: Device section shows a friendly message when `GET /analytics/performance` and `GET /analytics/crash` return **404** (mobile-only POST documented elsewhere).

### Deviations from Spec

- Product detail and inventory audit trail live under **`/products/[id]`** (existing Hub routes), not `/inventory/products/{id}`.
- **`GET /sales/{saleId}/return/{returnId}`** — Hub calls this path; confirm with backend if the controller uses a different segment (e.g. `returns` plural).
- **Dismiss device time warning** — Not implemented (no `PATCH` endpoint in shared spec).
- **Promote mutation** — Invoked from the page via `promoteFromTemporary()`; no separate `usePromoteTemporaryItem` hook (optional follow-up).

### Testing Notes

- Run `npm run build` and `npm run lint` locally.
- Manual: notifications → navigate; temporary: promote + ignore; return page shows refund method; sales: delayed icon when `synced_at - sold_at &gt; 24h` and `synced_at` present.

### Open Questions for Backend/Mobile Teams

- Optional: enable **`GET /analytics/performance`** and **`GET /analytics/crash`** for Hub aggregates (reports section shows a message when **404**).
