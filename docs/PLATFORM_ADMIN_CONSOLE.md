# Platform Admin Console (SUPER_ADMIN)

The platform admin console is a separate surface from the tenant Management Hub. It is mounted under `/platform/*` and is reachable only by users whose JWT carries `role === "SUPER_ADMIN"` AND `organizationId === null`. Backend contract: see [`docs/SUPER_ADMIN_API.md`](SUPER_ADMIN_API.md) and [`docs/SUPER_ADMIN_IMPLEMENTATION_SUMMARY.md`](SUPER_ADMIN_IMPLEMENTATION_SUMMARY.md).

This document reflects **Phase 1** (foundation + dashboard), **Phase 2** (organizations), and **Phases 3–6** (users, devices, analytics, telemetry, audit, notifications). All **24** `/platform/*` REST endpoints described in those docs now have matching UI surfaces.

---

## 1. Routes

| Route | Purpose |
| --- | --- |
| `/platform` | Dashboard headline metrics |
| `/platform/organizations` | Tenant directory + mutations |
| `/platform/organizations/:id` | Org overview |
| `/platform/organizations/:id/users` | Org-scoped user list → links to `/platform/users/:userId` |
| `/platform/organizations/:id/devices` | Org-scoped devices → `/platform/devices/:deviceId` |
| `/platform/organizations/:id/activity` | Org-scoped audit feed (`AuditEventRow`) |
| `/platform/users` | Cross-org user directory + bulk actions (`UserActionsMenu`) |
| `/platform/users/:id` | Profile, org link, deactivate / reset-password |
| `/platform/devices` | Global device roster + revoke/suspend/unsuspend (`?organizationId=` / `?userId=` supported on first paint) |
| `/platform/devices/:id` | Device detail + telemetry stats |
| `/platform/analytics` | Landing links |
| `/platform/analytics/growth` | Growth charts (**Recharts**) + CSV export of current buckets |
| `/platform/analytics/plans` | Plan mix + migrations + CSV for transitions |
| `/platform/telemetry` | Telemetry hub + quick KPIs |
| `/platform/telemetry/crashes` | Crash summaries, filters, expandable stacks |
| `/platform/telemetry/performance` | Latency aggregates + slow operations |
| `/platform/telemetry/device-health` | Storage / DB / backups snapshot |
| `/platform/audit` | Global audit feed (`AuditEventRow` + `showOrganization`) |
| `/platform/notifications` | Platform notification inbox + broadcast dialog |

Missing paths now yield the default Next.js **404** (the former `[...slug]` catch‑all placeholder was deleted once every route landed).

---

## 2. Auth & route gating

There is **no** Next `middleware.ts`; gating mirrors the backend `SuperAdminGuard` purely on the client (access token memory + refresh token persistence - see Phase 1 notes).

| Helper | Used in |
| --- | --- |
| `isPlatformAdmin(user)` in [`lib/platform-access.ts`](../lib/platform-access.ts) | `PlatformAuthGate`, redirects |
| `postLoginRedirect(user)` | login + OAuth callback |

[`components/auth/platform-auth-gate.tsx`](../components/auth/platform-auth-gate.tsx) and [`components/auth/dashboard-auth-gate.tsx`](../components/auth/dashboard-auth-gate.tsx) document the redirects.

---

## 3. Layout

```
app/(platform)/layout.tsx
└── PlatformAuthGate
    └── PlatformShell (`components/platform/platform-shell.tsx`)
```

Navigation constants: [`components/platform/nav-config.ts`](../components/platform/nav-config.ts).

Grouped areas (**Analytics**, **Telemetry**) use dedicated `layout.tsx` files with bookmarkable **`Link`** sub-navigation (same pattern as `organizations/[id]/layout.tsx`).

---

## 4. API service layer

| Module | Endpoints |
| --- | --- |
| [`lib/api/platform/dashboard.ts`](../lib/api/platform/dashboard.ts) | dashboard |
| [`lib/api/platform/organizations.ts`](../lib/api/platform/organizations.ts) | org CRUD-ish + activity |
| [`lib/api/platform/users.ts`](../lib/api/platform/users.ts) | users |
| [`lib/api/platform/devices.ts`](../lib/api/platform/devices.ts) | devices |
| [`lib/api/platform/analytics.ts`](../lib/api/platform/analytics.ts) | analytics |
| [`lib/api/platform/telemetry.ts`](../lib/api/platform/telemetry.ts) | telemetry |
| [`lib/api/platform/audit.ts`](../lib/api/platform/audit.ts) | audit/events |
| [`lib/api/platform/notifications.ts`](../lib/api/platform/notifications.ts) | notifications |

Shared types: [`lib/types/platform.ts`](../lib/types/platform.ts). Repeated array query serialization: [`lib/api/platform/_pagination.ts`](../lib/api/platform/_pagination.ts).

CSV helpers (client-side only): [`lib/utils/csv.ts`](../lib/utils/csv.ts) (`rowsToCsv`, `downloadTextFile` with UTF‑8 BOM for Excel).

---

## 5. Page & component map

### Dashboard

[`app/(platform)/platform/page.tsx`](../app/(platform)/platform/page.tsx) - auto-refresh dashboard query; quick-action links resolve to concrete pages.

### Organizations (Phase 2)

Unchanged behaviour: list + `[id]` layout + sub-pages + four org modals. See prior sections in git history if you need the detailed mutation table.

### Users & Devices (Phase 3)

| Area | Highlights |
| --- | --- |
| [`components/platform/users/`](../components/platform/users/) | `UserFiltersBar`, `UserActionsMenu`, `DeactivateUserModal`, `ResetPasswordUserModal` |
| [`components/platform/devices/`](../components/platform/devices/) | `DeviceFiltersBar`, `DeviceActionsMenu`, revoke / suspend / unsuspend modals |
| [`components/platform/org-filter-picker.tsx`](../components/platform/org-filter-picker.tsx) | Debounced tenant search surfaced on users/devices/crash/notifications filters |

Destructive confirmations follow the Phase 2 modal contract (`reason`, checkboxes where appropriate, `"platform"` query invalidation, `toast`).

### Analytics (Phase 4)

[`app/(platform)/platform/analytics/`](../app/(platform)/platform/analytics/) - `recharts` charts; Growth page exposes **CSV download** for the currently loaded timeline. Plans page supports transitions CSV export.

### Telemetry (Phase 5)

[`app/(platform)/platform/telemetry/`](../app/(platform)/platform/telemetry/) - hub summarizes crash totals + heuristic health rollup; crashes page mirrors API `summary`; performance page renders horizontal percentile chart + tables.

### Audit & notifications (Phase 6)

[`app/(platform)/platform/audit/page.tsx`](../app/(platform)/platform/audit/page.tsx) - filters + curated event-type presets (platform actions + common tenant plan events).

[`app/(platform)/platform/notifications/page.tsx`](../app/(platform)/platform/notifications/page.tsx) - filters + pagination + **[`BroadcastNotificationModal`](../components/platform/notifications/broadcast-notification-modal.tsx)** (all-org vs explicit org picker, optional role fan-out consistent with `/platform/notifications/broadcast` semantics).

---

## 6. Theming & mobile

Reuse tenant tokens; differentiated via Platform shell chrome. Responsive tables collapse to stacked cards wherever list pages mirror `/platform/organizations`. Shell retains bottom safe-area padding for [`PlatformMobileNav`](../components/platform/platform-mobile-nav.tsx).

---

## 7. Verification checklist

- [ ] SUPER_ADMIN → `/platform` dashboard renders.
- [ ] Tenant ADMIN cannot stay on `/platform` (toast + bounce).
- [ ] Smoke each nav item from [`nav-config.ts`](../components/platform/nav-config.ts).
- [ ] Org-scoped user/device drill-down links resolve globally.
- [ ] Crash / telemetry filters hit real query params (observe network tab - no erroneous `X-Tenant-ID`).
- [ ] Broadcast flow: toggle all-orgs vs explicit org selections (must pick ≥1 org when “all” is off).
- [ ] `npm run build` succeeds (workspace currently clean aside from unrelated lint **warnings** in non-platform API helpers).

---

## 8. Environment variables

No additions beyond tenant hub defaults - `NEXT_PUBLIC_API_URL` (base `…/api/v1`) remains the lone requirement.
