# Super Admin API Documentation

## Overview

The **Super Admin API** is a set of platform-level endpoints (mounted under
`/api/v1/platform/`) used by NutaPOS staff to operate the platform across all
tenants: list and manage organizations, control plans/billing, monitor and
revoke devices, view platform-wide analytics & telemetry, and audit every
administrative action.

These endpoints are **strictly separated** from the tenant-scoped endpoints
used by organization owners and staff. They never accept `organizationId` from
the JWT - the calling SUPER_ADMIN has none - and instead accept the target
organization id as a path parameter.

### Authentication

Use any normal login flow (`POST /api/v1/auth/login`) with a SUPER_ADMIN
account. The returned `accessToken` MUST be sent as
`Authorization: Bearer <token>` to every `/platform/*` request.

A SUPER_ADMIN account is identified by:

- `User.role === 'SUPER_ADMIN'`
- `User.organizationId === null`

If `organizationId` is populated in a SUPER_ADMIN JWT the [`SuperAdminGuard`](src/common/guards/super-admin.guard.ts)
rejects the request with `403 Forbidden` to defend against a
misconfigured/leaked token.

To create a super admin user, run:

```bash
DATABASE_URL=... \
SUPER_ADMIN_EMAIL=ops@nutapos.com \
SUPER_ADMIN_PASSWORD='choose-a-strong-one' \
npm run create:super-admin
```

### Security model

- All platform endpoints are protected by `JwtAuthGuard` (global) +
  `SuperAdminGuard` (in [`platform-admin.controller.ts`](src/modules/platform-admin/platform-admin.controller.ts)).
- `TenantGuard` is **never** applied to platform endpoints - it would fail for
  super admins who carry no `organizationId`.
- All `:organizationId` / `:userId` / `:deviceId` path params are validated by
  `ParseUUIDPipe` and existence-checked before any state change.
- All mutating endpoints record an audit row in `PlatformAdminAction` and,
  when scoped to an organization, an `EventLog` entry with the matching
  `PLATFORM_*` event type. See [`platform-admin-action.service.ts`](src/modules/platform-admin/platform-admin-action.service.ts).
- Sensitive fields (`passwordHash`, raw refresh tokens, etc.) are never
  serialized in responses; services explicitly `select` allowed columns.
- Suspending an organization or revoking a device causes side-effects in the
  tenant-facing flows: see [Side-effect enforcement](#side-effect-enforcement).

### Pagination

All list endpoints accept `page` (default `1`) and `limit` (default `20`,
max `100`) and return:

```json
{
  "data": [ /* ... */ ],
  "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

---

## Endpoints

### Organization Management

#### `GET /platform/organizations`

List all organizations on the platform with counts.

Query parameters:

| Param | Type | Notes |
| --- | --- | --- |
| `page` | int | default 1 |
| `limit` | int | default 20, max 100 |
| `search` | string | matches name/email/phone (insensitive) |
| `planType` | `PlanType[]` | repeated query string, e.g. `?planType=PRO&planType=TRIAL` |
| `planStatus` | `PlanStatus[]` | as above |
| `sortBy` | `name`/`createdAt`/`salesCount`/`trialEndDate` | default `createdAt` |
| `sortOrder` | `asc`/`desc` | default `desc` |

Response: `{ data: Organization[], meta }`. Each org includes `counts: { users, products, sales, devices }`.

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "$API/platform/organizations?planType=PRO&search=acme&limit=50"
```

#### `GET /platform/organizations/:organizationId`

Detailed view of a specific organization with stats + plan summary.

Response shape:

```json
{
  "organization": { /* full Organization row */ },
  "stats": {
    "totalUsers": 12,
    "activeUsers": 11,
    "totalProducts": 412,
    "totalSales": 5_023,
    "totalRevenue": "152340.50",
    "activeSales": 412,
    "activeDevices": 4,
    "suspendedDevices": 0,
    "revokedDevices": 1,
    "lastActivity": "2026-04-30T18:21:11.000Z"
  },
  "plan": {
    "type": "PRO",
    "status": "ACTIVE",
    "salesCount": 5023,
    "salesLimit": null,
    "trialStartDate": null,
    "trialEndDate": null,
    "daysRemaining": null
  }
}
```

#### `PATCH /platform/organizations/:organizationId/plan`

Body (`UpdateOrganizationPlanDto`):

| Field | Type | Notes |
| --- | --- | --- |
| `planType` | `PlanType` | optional |
| `planStatus` | `PlanStatus` | optional |
| `salesLimit` | int \| null | `null` = unlimited |
| `trialEndDate` | ISO 8601 \| null | optional |
| `reason` | string | required, ≤500 chars |

Audit: `PlatformAdminAction { actionType: 'update_org_plan' }` plus
`EventLog { eventType: PLATFORM_ORG_PLAN_CHANGED }` with before/after metadata.

```bash
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType":"PRO","salesLimit":null,"reason":"customer upgraded"}' \
  "$API/platform/organizations/$ORG_ID/plan"
```

#### `POST /platform/organizations/:organizationId/suspend`

Body (`SuspendOrganizationDto`):

```json
{ "reason": "Payment dispute investigation", "notifyOwner": true }
```

Side effects:

- `Organization.planStatus = SUSPENDED`.
- Owner notification (in-app `Notification`) created unless `notifyOwner=false`.
- Subsequent `POST /auth/login`, `POST /auth/staff/login`, and
  `POST /auth/refresh` for that org are rejected with 401.
- Tenant-scoped requests covered by `OrganizationStatusGuard`
  (`/api/v1/sync/*`, `/api/v1/sales/*`, `/api/v1/inventory/*`) return 403.

Audit: `PLATFORM_ORG_SUSPENDED` + `PlatformAdminAction { actionType: 'suspend_org' }`.

#### `POST /platform/organizations/:organizationId/unsuspend`

Body (`UnsuspendOrganizationDto`):

```json
{ "reason": "Dispute resolved", "planStatus": "ACTIVE" }
```

Restores `planStatus` (defaults to `ACTIVE`) and `isActive=true`. Audit:
`PLATFORM_ORG_UNSUSPENDED` + `PlatformAdminAction { actionType: 'unsuspend_org' }`.

#### `DELETE /platform/organizations/:organizationId`

Body (`DeleteOrganizationDto`):

```json
{ "reason": "GDPR right-to-be-forgotten request", "confirmDelete": true }
```

`confirmDelete` MUST be `true`. The org is soft-deleted (`isActive=false`) and
`email`/`phone` are cleared (PII anonymization). Audit:
`PLATFORM_ORG_DELETED` + `PlatformAdminAction { actionType: 'soft_delete_org' }`.

#### `GET /platform/organizations/:organizationId/activity`

Paginated `EventLog` rows for a single organization.

Query: `eventType` (repeated), `startDate`, `endDate`, `page`, `limit`.

---

### User Management

#### `GET /platform/users`

Cross-organization user search. Query: `search`, `role[]`, `organizationId`,
`isActive`, `page`, `limit`. Each row includes a slim `organization` object.

#### `GET /platform/users/:userId`

User details + activity:

```json
{
  "user": { /* slim user with staffProfile + organization */ },
  "organization": { "id": "...", "name": "...", "planType": "PRO", "planStatus": "ACTIVE", "currency": "GHS" },
  "activity": {
    "lastLogin": "2026-05-01T14:22:00.000Z",
    "salesCount": 412,
    "devicesCount": 2,
    "recentSales": [ /* up to 10 most recent */ ]
  }
}
```

#### `POST /platform/users/:userId/deactivate`

Body: `{ "reason": "Left company" }`.

Sets `isActive=false` and revokes ALL outstanding refresh tokens for the user.
Audit: `PLATFORM_USER_DEACTIVATED` (only when the user has an
`organizationId`) + `PlatformAdminAction { actionType: 'deactivate_user' }`.

#### `POST /platform/users/:userId/reset-password`

Body:

```json
{ "reason": "Customer support ticket #1234", "notifyUser": false }
```

- Generates a 16-character temporary password, hashes with bcrypt(12).
- Sets `isTemporaryPassword=true`, `needsPasswordChange=true`.
- Revokes all outstanding refresh tokens for the user.
- When `notifyUser=true` (default), creates an in-app `SYSTEM_ALERT`
  notification (delivered via the existing tenant notifications surface).
- When `notifyUser=false`, the response includes `temporaryPassword` so an
  operator can communicate it via an out-of-band channel.

Audit: `PLATFORM_USER_PASSWORD_RESET` + `PlatformAdminAction { actionType: 'reset_user_password' }`.

---

### Device Management

#### `GET /platform/devices`

Query: `organizationId`, `userId`, `status[]`, `search`
(`deviceUuid`/`deviceModel`/`fingerprintHash`/`deviceName`), `page`, `limit`.

#### `GET /platform/devices/:deviceId`

Device with owner, organization, and activity (sales/backups/crashes/recent
sales scoped via `deviceInfo.deviceUuid` JSON path).

#### `POST /platform/devices/:deviceId/revoke`

Body: `{ "reason": "Stolen device" }`.

Sets `Device.status = REVOKED`, `revokedAt = now()`, `revokedReason = reason`.
**Revokes** all `RefreshToken` rows whose `deviceUuid` matches the device's
`deviceUuid` so the device can no longer call `/auth/refresh`. Audit:
`PLATFORM_DEVICE_REVOKED` + `PlatformAdminAction { actionType: 'revoke_device' }`.
The status is **terminal** - `unsuspend` will refuse to restore a revoked
device.

#### `POST /platform/devices/:deviceId/suspend`

Sets `Device.status = SUSPENDED`. Refresh tokens are NOT auto-revoked, so
suspension can be reverted without forcing re-login. Audit:
`PLATFORM_DEVICE_SUSPENDED`.

#### `POST /platform/devices/:deviceId/unsuspend`

Returns a `SUSPENDED` device to `ACTIVE`. Refuses if the device is
`REVOKED`. Audit: `PLATFORM_DEVICE_UNSUSPENDED`.

---

### Platform Analytics

#### `GET /platform/dashboard`

Top-level platform metrics; see [`platform-admin-analytics.service.ts`](src/modules/platform-admin/platform-admin-analytics.service.ts):

- `organizations`: total/active/suspended/trialExpired/byPlan
- `users`: total/active/byRole
- `devices`: total/active/suspended/revoked
- `sales`: today/thisWeek/thisMonth/totalRevenue
- `growth`: newOrgsThisWeek/Month, newUsersThisWeek/Month
- `health`: crashReportsLast24h, performanceIssues (durationMs ≥ 2000), storageWarnings (warning|critical)

#### `GET /platform/analytics/growth`

Query: `startDate` ISO 8601, `endDate` ISO 8601, `groupBy` `day|week|month`.

Returns `timeline[]` of `{ date, newOrganizations, newUsers, newDevices, totalSales, totalRevenue }`,
generated in Postgres via `date_trunc(...)` + `generate_series(...)` so empty
buckets are present.

#### `GET /platform/analytics/plans`

- `distribution`: count + percentage per `PlanType`.
- `transitions`: derived from EventLog rows of `PLAN_UPGRADED`,
  `PLAN_DOWNGRADED`, `PLATFORM_ORG_PLAN_CHANGED` (last 1000 events). Each
  transition reports `count` (all-time) and `lastMonth`.
- `trialConversion`: `{ totalTrials, converted (currently PRO/ENTERPRISE that
  ever started a trial), expired, conversionRate }`.

---

### Telemetry

#### `GET /platform/telemetry/crashes`

Paginated `MobileCrashReport` rows with `user` + `organization`.

Query: `organizationId`, `userId`, `isFatal`, `startDate`, `endDate`, `page`,
`limit`. Response also includes a `summary` block with `totalCrashes`,
`fatalCrashes`, `affectedOrganizations`, `affectedUsers`, and `topErrors[]`.

#### `GET /platform/telemetry/performance`

Query: `organizationId`, `metric`, `startDate`, `endDate`.

Returns `metrics[]` (one row per `metric`) with
`count`/`avgDuration`/`p50Duration`/`p95Duration`/`p99Duration` computed via
Postgres `percentile_cont`, plus `slowestOperations` (top 25 individual
events).

#### `GET /platform/telemetry/device-health`

Optional query: `organizationId`. Aggregates from
`StaffDeviceStorageWarning`, `StaffDatabaseWarning`, `StaffDeviceBackup`:

```json
{
  "storage": { "totalWarnings": 5, "criticalWarnings": 1, "devicesBelowThreshold": 3 },
  "database": { "unhealthyDevices": 1, "totalErrors": 4 },
  "backups": { "devicesWithBackups": 12, "devicesWithoutBackups": 3, "averageBackupAgeMs": 86_400_000 }
}
```

---

### Audit & Activity

#### `GET /platform/audit/events`

Cross-organization `EventLog` query.

Query: `organizationId`, `userId` (the actor), `eventType[]`, `aggregateType`,
`startDate`, `endDate`, `page`, `limit`. Each row includes a slim
`organization` object.

#### `GET /platform/organizations/:organizationId/activity`

Same pagination, but scoped to a single organization (uses the org's
`EventLog` index for fast retrieval).

---

### Notifications

#### `GET /platform/notifications`

Paginated `Notification` rows, optionally filtered by `organizationId`,
`type[]`, `isRead`.

#### `POST /platform/notifications/broadcast`

Body (`BroadcastNotificationDto`):

```json
{
  "title": "Scheduled maintenance",
  "message": "Maintenance window 2026-05-15 02:00–03:00 GMT",
  "type": "SYSTEM_ALERT",
  "targetOrganizations": ["uuid", "uuid"],
  "targetRoles": ["ADMIN", "MANAGER"],
  "targetUserIds": ["user-uuid", "user-uuid"]
}
```

Behavior (recipient resolution, in order):

1. **`targetUserIds` set** → one personal notification per listed user
   (`userId` set). Users must be active with an active organization.
   `targetOrganizations` optionally scopes eligible users. `targetRoles` is
   ignored. Unknown/ineligible IDs → `400` with `invalidUserIds`.
2. Else **`targetRoles` set** → one row per matching active user in the
   org filter (see below).
3. Else → one org-wide row per org (`userId=null`).

Org filter (when not using `targetUserIds` alone):

- `targetOrganizations` omitted → all `isActive=true` orgs.
- Uses `prisma.notification.createMany`, wrapped in a transaction with the
  audit row.

Audit: `PlatformAdminAction { actionType: 'broadcast_notification' }`. No
`EventLog` row is written (the action spans many orgs, and `EventLog` requires
a non-null `organizationId`).

Response: `{ success: true, notificationsSent, recipientCount }`.

---

## Side-effect enforcement

The following enforcement points exist outside the platform-admin module so
super-admin actions actually take effect across the system:

| Action | Side effect | Implementation |
| --- | --- | --- |
| Suspend org | `login`, `staffLogin`, `refresh` reject 401 | [`auth.service.ts`](src/modules/auth/auth.service.ts) - `assertOrgUsable` check |
| Suspend org | Tenant-scoped GET/POST endpoints reject 403 | [`OrganizationStatusGuard`](src/common/guards/organization-status.guard.ts) wired onto `SyncController`/`SalesController`/`InventoryController` |
| Unsuspend org | Login + sync resume immediately | Same guards re-evaluate the live org row |
| Soft-delete org | Same as suspend (org becomes inactive) | Same guards check `isActive` |
| Revoke device | Refresh tokens for that device's `deviceUuid` are revoked | inside `prisma.$transaction` in `revoke()` |
| Deactivate user | All refresh tokens for that user are revoked | inside `prisma.$transaction` in `deactivate()` |
| Reset password | All refresh tokens for that user are revoked, new bcrypt(12) hash, `isTemporaryPassword=true` | inside `prisma.$transaction` in `resetPassword()` |

---

## Database schema changes

- Added `PLATFORM_ORG_CREATED`, `PLATFORM_ORG_SUSPENDED`,
  `PLATFORM_ORG_UNSUSPENDED`, `PLATFORM_ORG_DELETED`,
  `PLATFORM_ORG_PLAN_CHANGED`, `PLATFORM_DEVICE_REVOKED`,
  `PLATFORM_DEVICE_SUSPENDED`, `PLATFORM_DEVICE_UNSUSPENDED`,
  `PLATFORM_USER_DEACTIVATED`, `PLATFORM_USER_PASSWORD_RESET`,
  `PLATFORM_NOTIFICATION_BROADCAST` to the `EventType` enum.
- Added the `PlatformAdminAction` table with foreign keys to `User` (admin
  actor), optional `Organization` (target org), and optional `User` (target
  user). Indexes:
  `(adminUserId, createdAt)`, `(targetOrganizationId, createdAt)`,
  `(actionType, createdAt)`.

Migration: [`prisma/migrations/20260501120000_platform_admin/migration.sql`](prisma/migrations/20260501120000_platform_admin/migration.sql).

---

## Testing

### Unit tests

- [`super-admin.guard.spec.ts`](src/common/guards/super-admin.guard.spec.ts) -
  guard accepts only SUPER_ADMIN with no org id.
- [`organization-status.guard.spec.ts`](src/common/guards/organization-status.guard.spec.ts)
  - exemptions, suspension/inactive rejection, ACTIVE pass-through.
- [`platform-admin-action.service.spec.ts`](src/modules/platform-admin/platform-admin-action.service.spec.ts) -
  EventLog written iff org id + event type both present.
- [`platform-admin-organizations.service.spec.ts`](src/modules/platform-admin/platform-admin-organizations.service.spec.ts) -
  suspend/unsuspend/softDelete/updatePlan happy paths and validation errors.
- [`platform-admin-devices.service.spec.ts`](src/modules/platform-admin/platform-admin-devices.service.spec.ts) -
  revoke flips status + revokes refresh tokens; revoked devices can't be
  unsuspended.
- [`platform-admin-users.service.spec.ts`](src/modules/platform-admin/platform-admin-users.service.spec.ts) -
  deactivate revokes tokens; resetPassword toggles temp-password response
  visibility.

Run them with:

```bash
npm test
```

### E2E tests

[`test/platform-admin.e2e-spec.ts`](test/platform-admin.e2e-spec.ts) covers:

- `200` for SUPER_ADMIN, `403` for ADMIN on every category.
- `PATCH plan` writes a `PlatformAdminAction` row.
- Suspending an org rejects subsequent admin login; unsuspending restores it.
- Revoking a device revokes refresh tokens with that `deviceUuid`.
- Broadcast creates `Notification` rows + a `PlatformAdminAction`.

The suite skips itself unless `E2E_RUN=1` is set so CI environments without
a database are unaffected. Run locally with:

```bash
docker compose up -d
npx prisma migrate deploy
E2E_RUN=1 npm run test:e2e
```

---

## Deployment checklist

1. Deploy code with the new module.
2. Apply the migration: `npx prisma migrate deploy`.
3. Create a super admin (one per ops engineer, ideally):
   `npm run create:super-admin`.
4. Verify `/api/v1/platform/dashboard` returns 200 with the new admin's JWT.
5. Verify `/api/v1/platform/dashboard` returns 403 for any pre-existing
   ADMIN account.
6. Smoke test the full suspend → login-blocked → unsuspend → login-works flow
   (also covered by the e2e suite when `E2E_RUN=1`).

### Required environment variables

- `DATABASE_URL` - Postgres connection string.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_EXPIRES`, `JWT_ACCESS_EXPIRES` (already
  required by the auth module).
- `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (only when running
  `npm run create:super-admin`).
- `E2E_RUN=1` (only when running the e2e suite).
