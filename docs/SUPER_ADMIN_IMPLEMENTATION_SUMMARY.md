# SUPER_ADMIN Implementation Summary

This document captures everything delivered for the platform-admin
("SUPER_ADMIN") API. Use it as the hand-off artifact when wiring the frontend
admin console.

## 1. What was built

### New REST endpoints (all under `/api/v1/platform`)

Total: **24** endpoints.

#### Organization management (7)

- `GET /platform/organizations`
- `GET /platform/organizations/:organizationId`
- `PATCH /platform/organizations/:organizationId/plan`
- `POST /platform/organizations/:organizationId/suspend`
- `POST /platform/organizations/:organizationId/unsuspend`
- `DELETE /platform/organizations/:organizationId` (soft delete)
- `GET /platform/organizations/:organizationId/activity`

#### User management (4)

- `GET /platform/users`
- `GET /platform/users/:userId`
- `POST /platform/users/:userId/deactivate`
- `POST /platform/users/:userId/reset-password`

#### Device management (5)

- `GET /platform/devices`
- `GET /platform/devices/:deviceId`
- `POST /platform/devices/:deviceId/revoke`
- `POST /platform/devices/:deviceId/suspend`
- `POST /platform/devices/:deviceId/unsuspend`

#### Analytics (3)

- `GET /platform/dashboard`
- `GET /platform/analytics/growth`
- `GET /platform/analytics/plans`

#### Telemetry (3)

- `GET /platform/telemetry/crashes`
- `GET /platform/telemetry/performance`
- `GET /platform/telemetry/device-health`

#### Audit (1)

- `GET /platform/audit/events`

#### Notifications (2)

- `GET /platform/notifications`
- `POST /platform/notifications/broadcast`

### New backend code

- Module: `src/modules/platform-admin/`
  - `platform-admin.module.ts`, `platform-admin.controller.ts`
  - 7 split services (`-organizations`, `-users`, `-devices`, `-analytics`,
    `-telemetry`, `-audit`, `-notifications`)
  - `platform-admin-action.service.ts` — central audit writer used by every
    mutating endpoint.
  - `dto/` — 19 DTO files for query params and bodies.
- New guards: `src/common/guards/super-admin.guard.ts`,
  `src/common/guards/organization-status.guard.ts`.
- New decorator: `src/common/decorators/ip-address.decorator.ts`.
- Auth flow update: `src/modules/auth/auth.service.ts` now calls
  `assertOrgUsable` from `login`, `staffLogin`, `resolveRefreshSession`, and
  `issueSessionForUserId` so suspended/inactive orgs are blocked at the
  earliest opportunity.
- Existing tenant-scoped controllers updated to layer
  `OrganizationStatusGuard` after `TenantGuard`:
  - `src/modules/sync/sync.controller.ts`
  - `src/modules/sales/sales.controller.ts`
  - `src/modules/inventory/inventory.controller.ts`

### Operational tooling

- `scripts/create-super-admin.ts` + `npm run create:super-admin`. Idempotent —
  creates a SUPER_ADMIN, or rotates the password of an existing one. Refuses
  to overwrite a non-platform account that already owns the email.

### Documentation

- `SUPER_ADMIN_API.md` — full endpoint reference with request/response
  shapes, audit fields, curl examples, side-effect enforcement matrix,
  schema deltas, testing instructions, and deployment checklist.

## 2. Database changes

Migration: `prisma/migrations/20260501120000_platform_admin/migration.sql`.

### Enum additions

```
PLATFORM_ORG_CREATED
PLATFORM_ORG_SUSPENDED
PLATFORM_ORG_UNSUSPENDED
PLATFORM_ORG_DELETED
PLATFORM_ORG_PLAN_CHANGED
PLATFORM_DEVICE_REVOKED
PLATFORM_DEVICE_SUSPENDED
PLATFORM_DEVICE_UNSUSPENDED
PLATFORM_USER_DEACTIVATED
PLATFORM_USER_PASSWORD_RESET
PLATFORM_NOTIFICATION_BROADCAST
```

### New table: `PlatformAdminAction`

```prisma
model PlatformAdminAction {
  id                    String        @id @default(uuid()) @db.Uuid
  adminUserId           String        @db.Uuid
  targetOrganizationId  String?       @db.Uuid
  targetUserId          String?       @db.Uuid
  targetDeviceId        String?       @db.Uuid
  actionType            String
  reason                String?
  metadata              Json?         @db.JsonB
  ipAddress             String?
  userAgent             String?
  createdAt             DateTime      @default(now())

  // Relations
  adminUser             User          @relation("AdminActions", ...)
  organization          Organization? @relation(...)
  targetUser            User?         @relation("PlatformActionTarget", ...)
}
```

Indexes:

- `(adminUserId, createdAt)`
- `(targetOrganizationId, createdAt)`
- `(actionType, createdAt)`

This table is the **canonical** super-admin audit trail. Cross-org actions
(e.g. broadcast announcements) write only here because `EventLog.organizationId`
is non-nullable. Org-scoped actions write to BOTH this table and `EventLog`
inside the same `prisma.$transaction` so per-org activity feeds remain
authoritative.

### Schema relations added

- `User.platformAdminActions PlatformAdminAction[] @relation("AdminActions")`
- `User.platformActionTargets PlatformAdminAction[] @relation("PlatformActionTarget")`
- `Organization.platformAdminActions PlatformAdminAction[]`

## 3. Security measures

- `JwtAuthGuard` (global, already in place) → `SuperAdminGuard` (controller-
  level). The latter rejects:
  - Missing user (no auth header).
  - Non-`SUPER_ADMIN` roles.
  - SUPER_ADMIN tokens that carry an `organizationId`
    (defense against misconfigured/replayed tokens).
- `TenantGuard` is **never** used by `PlatformAdminController`.
- Every mutating endpoint:
  - Validates the target id with `ParseUUIDPipe`.
  - Confirms the row exists (throws `NotFoundException` otherwise).
  - Wraps the mutation + audit row in `prisma.$transaction` so a failure
    cannot leave one without the other.
  - Calls `PlatformAdminActionService.record(tx, ...)` exactly once.
- Reset-password flow:
  - 16-char alphanumeric password from `crypto.randomBytes`.
  - `bcrypt.hash(..., 12)` (matches `BCRYPT_ROUNDS` in `auth.service.ts`).
  - Sets `isTemporaryPassword=true`, `needsPasswordChange=true`.
  - Revokes ALL outstanding refresh tokens for the user.
  - Returns the new password ONLY when `notifyUser=false`.
- Soft-delete clears PII (`email`/`phone` set to `null`) in addition to
  flipping `isActive=false`.
- All response selects are explicit; passwords/token hashes/raw refresh
  tokens are never serialized.
- `delete-organization.dto.ts` requires `confirmDelete === true` via the
  `@Equals(true)` decorator.
- The new `OrganizationStatusGuard` runs after `TenantGuard` on
  `/sync`, `/sales`, `/inventory` and rejects suspended/inactive orgs with
  `403`. SUPER_ADMIN tokens (no org) are exempt by design.
- `auth.service.ts` rechecks org `isActive` and `planStatus` on every login
  and refresh, so existing sessions can't be used to "skate past" a
  mid-session suspension.

## 4. Testing

### Unit tests (Jest, no DB)

| File | Coverage |
| --- | --- |
| `super-admin.guard.spec.ts` | role + org-id contract |
| `organization-status.guard.spec.ts` | public-route exemption, SUPER_ADMIN exemption, suspended/inactive rejection, happy path |
| `platform-admin-action.service.spec.ts` | EventLog dual-write rule (org id + event type) |
| `platform-admin-organizations.service.spec.ts` | suspend, unsuspend (implicit), softDelete, updatePlan validation |
| `platform-admin-devices.service.spec.ts` | revoke flips status + revokes refresh tokens; revoked devices can't be unsuspended |
| `platform-admin-users.service.spec.ts` | deactivate revokes tokens; resetPassword toggles temp-password response visibility |

All 27 unit tests pass: `npm test`.

### E2E test (Jest + supertest, requires DB)

`test/platform-admin.e2e-spec.ts` covers:

- 200 for SUPER_ADMIN, 403 for ADMIN across every category.
- `PATCH plan` writes a `PlatformAdminAction` row.
- Suspend → admin login is rejected; unsuspend → admin login works again.
- Revoke device → refresh tokens with that `deviceUuid` are revoked.
- Broadcast → `Notification` rows + `PlatformAdminAction` are created.

Skipped by default unless `E2E_RUN=1`. Cleans up its own fixtures via the
`@nutapos.test` email pattern.

## 5. Performance considerations

- Every list endpoint paginates with `page`/`limit` (max 100), uses
  `prisma.$transaction([count, findMany])`, and selects only the needed
  fields.
- `EventLog` queries reuse the existing `(organizationId, createdAt)` and
  `eventType` indexes.
- Growth analytics use a single `$queryRaw` with `generate_series` +
  `date_trunc` so empty buckets are zero-filled in SQL rather than the
  application layer.
- Performance metrics aggregate with Postgres `percentile_cont` in a single
  query.
- The new `PlatformAdminAction` table is indexed for the three most common
  read patterns (per-admin, per-org, per-action-type).
- `OrganizationStatusGuard` reads only `{ isActive, planStatus }` (two
  columns) — fast. If this becomes a bottleneck, the org row is a strong
  candidate for the future `Redis`/`@nestjs/cache-manager` integration.

## 6. Known limitations / out of scope

- **No email delivery.** `notifyOwner` / `notifyUser` create in-app
  `Notification` rows but no SMTP/transactional-email integration was added
  (none exists in the codebase yet). The DTO flag is preserved so a future
  email service can hook in without an API change.
- **Hard-delete policy not implemented.** The DELETE endpoint only does a
  soft delete; a scheduled job to hard-delete after N days is intentionally
  deferred.
- **No rate limiting on platform endpoints.** The auth module already has
  `@nestjs/throttler`; we did not add a separate throttler bucket for
  platform endpoints (super admins are trusted operators). Add one if
  required by SOC 2/PCI policy.
- **Crash-report `affectedUsers` excludes anonymous crashes** (where
  `userId` is null) — by design.
- **Plan transition heuristic.** `GET /platform/analytics/plans` infers
  transitions from `EventLog` payload shapes (`metadata.before/after.planType`
  or `payload.fromPlan/toPlan`). Older `PLAN_UPGRADED`/`PLAN_DOWNGRADED`
  events that lack these fields will be ignored.
- **Plan sales-limit cleanup.** Setting `salesLimit = null` does NOT reset
  `salesCount`. If you want a "fresh trial" semantic, add an explicit reset
  flag in a future revision.
- **`OrganizationStatusGuard` not wired onto every controller.** It's wired
  onto the highest-traffic tenant-scoped paths (`/sync`, `/sales`,
  `/inventory`). Lower-frequency surfaces (`/dashboard`, `/notifications`,
  `/audit`, `/products`, `/categories`, etc.) still pass while suspended.
  Layer the guard onto those if the policy needs to be platform-wide.

## 7. Future enhancements

- Email + SMS delivery hooks for password reset and broadcast.
- Hard-delete sweep job after the soft-delete grace period.
- Time-of-action approval workflow (two super admins required for
  destructive actions).
- Redis cache for `Organization.{ isActive, planStatus }` to make the
  `OrganizationStatusGuard` zero-latency.
- Frontend admin console (separate workstream — this doc + `SUPER_ADMIN_API.md`
  are the contract).
- IP allowlisting for SUPER_ADMIN sessions.
- Per-admin daily action quotas / anomaly detection on `PlatformAdminAction`.

## 8. Deployment notes

```bash
# 1. Apply schema migration
npx prisma migrate deploy

# 2. Seed a super admin (per operator)
DATABASE_URL=... \
SUPER_ADMIN_EMAIL=ops@nutapos.com \
SUPER_ADMIN_PASSWORD='choose-a-strong-one' \
npm run create:super-admin

# 3. Restart the API service
# 4. Smoke test
curl -H "Authorization: Bearer $TOKEN" $API/platform/dashboard
```

### Rollback

The migration is purely additive (one new table, one enum extension). To roll
back:

```sql
DROP TABLE "PlatformAdminAction";
-- Postgres does not allow ALTER TYPE ... DROP VALUE; the new EventType
-- entries must remain. They're harmless to leave in place.
```

The `OrganizationStatusGuard` wiring is the only behavioral change to
existing endpoints. Reverting the controller decorator changes restores the
previous tenant-scoped behavior.

### Required env vars

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (only for the seed script)
- `E2E_RUN=1` (only for the e2e suite)
