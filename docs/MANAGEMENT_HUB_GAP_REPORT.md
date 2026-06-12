# Management Hub - API coverage gap report

Generated as part of the hub API audit roadmap. **Data layer:** TanStack Query v5 with polling (`dashboard` / key widgets **60s**, sales list **20s**, notifications **15s**). See `lib/query/` and root `QueryProvider`.

## Executive summary

- **Upgraded contract** in use: paginated `GET /sales` (`data` + meta), `GET/PATCH /organizations/me`, `GET /sales/stats`, `GET /sales/export`, `GET /returns`, `GET /inventory/adjustments`, `GET /inventory/stock-takes`, `GET /reports/*`, `GET /audit/events`, `PATCH /notifications/:id/read`.
- **`GET /branches`** is **not** available on the backend yet - UI remains a documented placeholder.
- **`GET /organizations`** returns the **same tenant** as `/me` (not multi-org); hub does not use it for an org picker.
- **Mobile-only POSTs** (e.g. `POST /staff/sales`, telemetry uploads) are **N/A** for hub UI - not listed as gaps below.

## Coverage matrix (hub-relevant)

| Endpoint | Hub use | Implemented | Call sites / UI |
|----------|---------|-------------|-----------------|
| `GET /organizations/me` | P0 | Yes | `lib/api/users.ts`, auth bootstrap, settings |
| `PATCH /organizations/me` | P0 | Yes | `lib/api/organization-update.ts`, settings |
| `GET /organizations` | Optional same-as-me | Exposed only if needed | Not used for picker |
| `GET /sales` (paginated) | P0 | Yes | `lib/api/sales.ts`, sales page + React Query |
| `GET /sales/stats` | P0 | Yes | `lib/api/sales.ts`, dashboard query |
| `GET /sales/export` | P1 | Yes | `lib/api/sales.ts`, sales page (CSV UX, 50k cap copy) |
| `GET /returns` | P1 | Yes | `lib/api/returns.ts`, `/returns` |
| `GET /inventory/adjustments` | P1 | Yes | `lib/api/inventory-logs.ts`, adjustments page |
| `GET /inventory/stock-takes` | P1 | Yes | `lib/api/inventory-logs.ts`, stock-take page |
| `GET /reports/sales-summary` | P1 | Yes | `lib/api/reports.ts`, reports page |
| `GET /reports/staff-performance` | P1 | Yes | `lib/api/reports.ts`, reports page (`period` 7d/30d/90d/this_month) |
| `GET /reports/revenue-trends` | P1 | Yes | `lib/api/reports.ts`, reports page (`period` daily/weekly/monthly) |
| `GET /audit/events` | P0 | Yes | `lib/api/audit.ts`, `/audit` |
| `GET /notifications` | P1 | Yes | `lib/api/notifications.ts`, header menu |
| `PATCH /notifications/:id/read` | P1 | Yes | `lib/api/notifications.ts`, menu |
| `GET /dashboard/summary` | P0 | Yes | `lib/api/dashboard.ts`, dashboard |
| `GET /dashboard/reliability-summary` | P1 | Yes | `lib/api/staff-reliability.ts`, dashboard |
| `GET /branches` | - | **No API** | Placeholder page + nav note |

## Report query contracts (enums)

- **sales-summary:** requires **both** `startDate` and `endDate` (YYYY-MM-DD).
- **staff-performance:** `period` = `7d` \| `30d` \| `90d` \| `this_month`.
- **revenue-trends:** `period` = `daily` \| `weekly` \| `monthly`.

## Export contract

- `GET /sales/export?format=csv` - same **date / staff / branch / payment** filters as list; **no** `page` / `sort`; **50,000 row cap** (helper text in UI).

## Removed / mitigated risks (vs legacy hub)

- Raw-array `GET /sales` - replaced by `{ data, page, limit, total, totalPages }`.
- “Last 100 only” - replaced by server pagination.
- No returns list - `GET /returns` + UI.
- `PATCH /organizations/:id` - replaced by **`PATCH /organizations/me`**.

## Remaining / follow-up

- **Branches** when `GET /branches` ships: replace placeholder, wire `lib/api/branches.ts`.
- **Staff profile** route `/staff/[staffId]`: lightweight shell (detail + devices link); full CRUD remains on `/staff`.
- **Management_Hub_API_Integration_Guide.md** in repo may still describe older shapes - regenerate from Nest when convenient.

## Client data layer (plan compliance)

- **Library:** `@tanstack/react-query` v5 (`QueryClientProvider` in `components/providers/query-provider.tsx`).
- **Polling:** `refetchInterval` 60s / 20s / 15s; tab hidden → interval `false` where configured.
- **Sales:** query key includes all list params; `placeholderData` retains rows on refetch.
- **Dashboard:** separate queries for summary, sales stats, reliability - isolated error UI per block.
- **Skeletons:** KPI + table skeletons on initial load (`components/ui/skeleton.tsx`).
