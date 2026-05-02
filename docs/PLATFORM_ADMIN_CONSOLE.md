# Platform Admin Console (SUPER_ADMIN)

The platform admin console is a separate surface from the tenant Management
Hub. It is mounted under `/platform/*` and is reachable only by users whose
JWT carries `role === "SUPER_ADMIN"` AND `organizationId === null`. Backend
contract: see `SUPER_ADMIN_API.md` and `SUPER_ADMIN_IMPLEMENTATION_SUMMARY.md`
in the repo root.

This document captures **Phase 1** (foundation + dashboard). Subsequent
phases will extend each section as they ship.

---

## 1. Routes

```
/platform                        Phase 1 — implemented (this PR)
/platform/organizations          Coming soon (catch-all placeholder)
/platform/organizations/:id      Coming soon
/platform/organizations/:id/activity
/platform/users                  Coming soon
/platform/users/:id              Coming soon
/platform/devices                Coming soon
/platform/devices/:id            Coming soon
/platform/analytics              Coming soon
/platform/analytics/growth       Coming soon
/platform/analytics/plans        Coming soon
/platform/telemetry              Coming soon
/platform/telemetry/crashes      Coming soon
/platform/telemetry/performance  Coming soon
/platform/telemetry/device-health
/platform/audit                  Coming soon
/platform/notifications          Coming soon
```

The catch-all `app/(platform)/platform/[...slug]/page.tsx` renders a
"Coming soon" `EmptyState` for any path that has not yet been implemented.
**Delete it as each phase ships.** When all real pages exist, remove
`[...slug]/page.tsx` to restore Next.js's standard 404 behavior.

## 2. Auth & route gating

There is **no** Next `middleware.ts` and the JWT is not decoded on the
client. Tokens live in:

- Access token → memory (Zustand `useAuthStore`).
- Refresh token → `localStorage` (`nutapos_hub_refresh_token`).

Gating is purely client-side and matches the backend `SuperAdminGuard`
contract:

| Helper | Returns | Used in |
|--------|---------|---------|
| `isPlatformAdmin(user)` in [`lib/platform-access.ts`](../lib/platform-access.ts) | `true` iff `user.role === "SUPER_ADMIN"` AND `!user.organizationId` | `PlatformAuthGate`, `DashboardAuthGate`, `postLoginRedirect` |
| `postLoginRedirect(user)` | `"/platform"` for SUPER_ADMIN, `"/"` otherwise | login page, OAuth callback |

| Component | Behavior |
|-----------|----------|
| [`PlatformAuthGate`](../components/auth/platform-auth-gate.tsx) | unauth → `/login`; tenant role → `/`; super-admin with non-null org → `/`; SUPER_ADMIN with null org → render children |
| [`DashboardAuthGate`](../components/auth/dashboard-auth-gate.tsx) | unauth → `/login`; SUPER_ADMIN → `/platform` (defense in depth, even if they typed `/` directly) |

Login (`app/(auth)/login/page.tsx`) and OAuth callback (`app/auth/callback/page.tsx`) call `router.replace(postLoginRedirect(user))` after `setSession`.

## 3. Layout

```
app/(platform)/layout.tsx
└── PlatformAuthGate
    └── PlatformShell                   (components/platform/platform-shell.tsx)
        ├── PlatformSidebar             (md+ desktop, mirrors AppSidebar styling)
        ├── PlatformHeader              (mobile sheet trigger + account menu)
        ├── <main>{children}</main>
        └── PlatformMobileNav           (md- bottom bar)
```

Navigation lives in [`components/platform/nav-config.ts`](../components/platform/nav-config.ts):
`platformNavSections` (sidebar) and `platformMobileBottomNav` (bottom bar).

The header reads "Platform Console / SUPER ADMIN" instead of the tenant org
name — SUPER_ADMIN tokens carry no organization.

## 4. API service layer

All 24 `/platform/*` endpoints are typed and exported from
`lib/api/platform/*`. The service layer reuses the existing axios `api`
instance (`lib/api/client.ts`):

- The interceptor adds `Authorization: Bearer …` automatically.
- It **omits** `X-Tenant-ID` when no organization is set in the auth store
  — exactly what the backend `SuperAdminGuard` requires.
- 401 responses are auto-refreshed via the standard refresh interceptor.

### Module layout

| File | Endpoints covered |
|------|-------------------|
| [`lib/api/platform/_pagination.ts`](../lib/api/platform/_pagination.ts) | `platformGet/Post/Patch/Delete` helpers + `unwrapPaginated` envelope normalizer + `paramsSerializer` for repeated array query keys (`?planType=PRO&planType=TRIAL`) |
| [`lib/api/platform/dashboard.ts`](../lib/api/platform/dashboard.ts) | `GET /platform/dashboard` |
| [`lib/api/platform/organizations.ts`](../lib/api/platform/organizations.ts) | list, get, updatePlan, suspend, unsuspend, softDelete, activity (7 endpoints) |
| [`lib/api/platform/users.ts`](../lib/api/platform/users.ts) | list, get, deactivate, resetPassword (4 endpoints) |
| [`lib/api/platform/devices.ts`](../lib/api/platform/devices.ts) | list, get, revoke, suspend, unsuspend (5 endpoints) |
| [`lib/api/platform/analytics.ts`](../lib/api/platform/analytics.ts) | growth, plans (2 endpoints) |
| [`lib/api/platform/telemetry.ts`](../lib/api/platform/telemetry.ts) | crashes, performance, device-health (3 endpoints) |
| [`lib/api/platform/audit.ts`](../lib/api/platform/audit.ts) | events (1 endpoint) |
| [`lib/api/platform/notifications.ts`](../lib/api/platform/notifications.ts) | list, broadcast (2 endpoints) |

All shared types live in [`lib/types/platform.ts`](../lib/types/platform.ts) (`PlanType`, `PlanStatus`, `DeviceStatus`, `PlatformOrganization`, `PlatformOrgDetails`, `PlatformDashboardData`, etc.). Endpoint paths are centralized under `endpoints.platform.*` in [`lib/api/endpoints.ts`](../lib/api/endpoints.ts).

### Adding a new platform endpoint

1. Add the path to the `platform` block in [`lib/api/endpoints.ts`](../lib/api/endpoints.ts).
2. Add the request/response types to [`lib/types/platform.ts`](../lib/types/platform.ts).
3. Add a typed wrapper to the relevant `lib/api/platform/<area>.ts` module using `platformGet/Post/Patch/Delete` from `_pagination.ts`. List endpoints should pipe responses through `unwrapPaginated<T>(raw)`.

## 5. Pages

### Dashboard

- File: [`app/(platform)/platform/page.tsx`](../app/(platform)/platform/page.tsx)
- Data: `useQuery({ queryKey: ["platform","dashboard"], queryFn: fetchPlatformDashboard, refetchInterval: 60_000 })`.
- Loading: [`PlatformDashboardSkeleton`](../components/platform/dashboard-skeleton.tsx).
- Error: inline `Card` with a `Try again` button calling `query.refetch()`.
- Composition:
  - 4 `MetricCard`s — Organizations, Users, Devices, Revenue.
  - 3 `StatusCard`s — Org status, Plan distribution, Health alerts.
  - Quick actions row linking to upcoming surfaces (currently land on the catch-all).

### Adding a new platform page

1. Create `app/(platform)/platform/<area>/page.tsx`. The `(platform)` group's layout already wraps it in `PlatformAuthGate` + `PlatformShell`.
2. Use `useQuery` with a `["platform", "<area>", ...params]` query key for caching.
3. Mutations should `queryClient.invalidateQueries({ queryKey: ["platform"] })` (or be more targeted if performance matters).
4. Compose UI from existing primitives in `components/ui/*` and platform primitives in `components/platform/*`. The codebase has no `react-hook-form`, no `date-fns`, and no `react-day-picker` — keep new pages aligned with that.

## 6. Theming

The platform console reuses the tenant theme tokens (defined in `app/globals.css`) and is visually differentiated by:

- A `Shield` icon next to "NutaPOS / Platform Console" in both the sidebar and the header.
- Mobile bottom-bar items map to platform routes only.

No new CSS variables were introduced.

## 7. Mobile responsiveness

- Desktop sidebar is `hidden md:flex`.
- Mobile uses the `Sheet`-based sidebar from `PlatformHeader` plus `PlatformMobileNav` along the bottom.
- Cards and grids stack below the `md` breakpoint.
- The shell sets `pb-24 md:pb-8` to keep the bottom nav from covering content.

## 8. Verification checklist

- [ ] Sign in as SUPER_ADMIN → land on `/platform` with metrics rendered.
- [ ] Sign in as ADMIN → land on `/`. Visit `/platform` → bounce back to `/` with a toast.
- [ ] Visit `/` (or any `/dashboard` route) as SUPER_ADMIN → bounce to `/platform`.
- [ ] DevTools → `/api/v1/platform/dashboard` request has `Authorization: Bearer …` and **no** `X-Tenant-ID` header.
- [ ] Hard refresh from `/platform` keeps the user on `/platform` after `bootstrap()` completes.
- [ ] `npm run lint` clean.

## 9. Out of scope (Phase 1)

The following are intentionally deferred to follow-up phases. Their service-layer functions are already implemented, so each follow-up phase only adds UI:

- Organizations list / details + suspend / unsuspend / manage-plan / delete modals.
- Users / Devices list & detail pages and their action modals.
- Analytics chart pages (growth, plan distribution).
- Telemetry pages (crashes, performance, device health).
- Audit log viewer + organization activity feed.
- Broadcast notifications UI.
- A `Tabs` primitive, `MultiSelect`, dedicated date-picker library, and `AlertDialog` will be added in the phase that needs them.

## 10. Required environment variables

The platform console uses the same axios client as the tenant hub. No new env vars are needed; `NEXT_PUBLIC_API_URL` (already pointing at `…/api/v1`) is the only requirement.
