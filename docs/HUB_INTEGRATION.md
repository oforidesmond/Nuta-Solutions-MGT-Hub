# NutaPOS Hub - Nest & Astro integration

This document describes how the Next.js Management Hub (`npm run dev` on port **5174**), the Astro marketing site (**4321**), and the Nest API (**3000**) work together.

## Why handoff codes exist

`localStorage` is **per origin**. A refresh token stored on `http://localhost:4321` is **not visible** to `http://localhost:5174`. After signup, the marketing app must not assume the Hub can read its storage.

## Recommended flow

1. **Astro:** `POST /auth/signup` → receives `accessToken`, `refreshToken`, `user`.
2. **Astro:** Immediately `POST /auth/handoff` with `{ "refreshToken": "<from signup>" }` (or server-issued session id).
3. **Nest:** Creates a **short-lived, single-use** code (TTL e.g. 60–120s), stores it server-side, returns `{ "code": "...", "expiresInSeconds": 90 }`.
4. **Astro:** Redirects the **same tab**:  
   `window.location.assign("http://localhost:5174/auth/callback?code=" + encodeURIComponent(code))`
5. **Hub:** `POST /auth/handoff/consume` with `{ "code": "<from query>" }`.
6. **Nest:** Returns `{ accessToken, refreshToken, user, organization? }` (snake_case variants optional if documented).
7. **Hub:** Persists **only** `refreshToken` in `localStorage` under key `nutapos_hub_refresh_token`. Keeps `accessToken` **in memory** (Zustand).

## Hub environment

Copy `.env.local.example` to `.env.local`:

- `NEXT_PUBLIC_API_URL` - Nest base URL including `/api/v1` (e.g. `http://localhost:3000/api/v1`).
- `NEXT_PUBLIC_HUB_URL` - Hub public URL (e.g. `http://localhost:5174`) for documentation and deep links.

Staff APK storage and Blob credentials live on **Nest only**. Do not set `BLOB_READ_WRITE_TOKEN` or `STAFF_APP_BLOB_URL` on the Hub.

## Nest endpoints the Hub calls

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/refresh` | Body `{ refreshToken }` (or align with existing DTO). |
| POST | `/auth/login` | Email/password; same token shape as signup. |
| POST | `/auth/handoff` | Mint code (Astro-only, or shared). |
| POST | `/auth/handoff/consume` | Exchange code for tokens + user. |
| GET | `/users/me` | JWT org scope; may return nested `organization`. |
| GET | `/organizations/:id` | Used when `me` has `organizationId` but no embedded org. |
| GET | `/products`, `/sales`, `/users` | Expected org-scoped by JWT. |
| GET | `/products` | Query: `page`, `limit`, `search`, `categoryId`, `lowStock`, `sortBy`, `sortOrder`. |
| POST/PATCH/DELETE | `/products/:id` | Catalog CRUD; soft delete for admins per API. |
| POST | `/products/:id/duplicate`, PATCH `/products/:id/pricing` | Optional product helpers. |
| GET | `/products/low-stock`, `/products/expiring-soon`, `/products/:id/stock-history` | Alerts and history. |
| CRUD | `/categories`, `/categories/:id`, `/categories/:id/products` | Category tree (when enabled in API). |
| CRUD | `/batches`, `/batches/expiring`, `/batches/expired`, POST `/batches/:id/remove-expired` | Lots and expiry. |
| POST | `/users/staff` | MVP “add staff”; adjust path/DTO to match Nest. |
| PATCH | `/organizations/:id` | Settings save (business, tax, expiry, discount limits when supported). |
| GET | `/dashboard/summary` | Optional; Hub falls back to aggregating products + sales if **404**. |
| GET | `/staff-app/update` | Public; current Staff APK version + `downloadUrl`. **404** = no release; **503** = Nest public base misconfigured. |
| GET | `/staff-app/download` | Public; Nest 302 to Blob for current APK. Hub may 302 here via `/api/staff-app/download`. |
| GET | `/platform/staff-app/releases` | SUPER_ADMIN; list releases. |
| GET | `/platform/staff-app/releases/current` | SUPER_ADMIN; current release (404 if none). |
| POST | `/platform/staff-app/releases` | SUPER_ADMIN; multipart publish (`versionName`, `versionCode`, file). |
| POST | `/platform/staff-app/releases/register` | SUPER_ADMIN; register existing Blob URL. |

### Hub routes (Next.js app)

| Path | Purpose |
|------|---------|
| `/` | Dashboard (metrics + quick actions). |
| `/products` | Product list, search, filters. |
| `/products/new`, `/products/[id]`, `/products/[id]/edit` | Create, detail, edit. |
| `/products/expiring` | Expiring-soon list (API or client filter). |
| `/categories` | Categories CRUD. |
| `/batches` | Batch list + expiry panels. |
| `/inventory` | Inventory hub (links to alerts, batches, placeholders). |
| `/inventory/alerts` | Low stock. |
| `/inventory/adjustments`, `/inventory/stock-take` | Phase 2 placeholders. |
| `/sales`, `/staff`, `/settings` | Transactions, team, organization settings. |
| `/branches`, `/reports` | Branches placeholder; reports includes device performance. |
| `/operations/device-backups`, `/operations/device-storage-warnings`, `/operations/database-warnings`, `/operations/mobile-crashes` | Phase 3 staff reliability (admin/manager); list APIs return **404** until Nest adds read routes. |

All API paths are centralized in `lib/api/endpoints.ts` for easy alignment when controllers differ.

## Security notes

- Do not persist `accessToken` in `localStorage` or session cookies from JS unless you deliberately change the threat model.
- Rate-limit `handoff` and `handoff/consume`; invalidate code after first successful consume.
