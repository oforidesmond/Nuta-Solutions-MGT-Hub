# Notifications system - integration guide (REST + Socket.IO)

This document is the **single deep-dive** for frontend and mobile clients integrating with the enhanced notifications stack: **per-user read state for org-wide (“broadcast”) rows**, **aggregated / deduplicated types**, **cached unread counts**, **Socket.IO hints**, and **optional expiry sweeps**. REST responses are authoritative; WebSocket events are **hints** to refetch.

**New to Redis/WebSockets or deploying to production?** Start with the layperson-oriented [`Notifications_Setup_and_Production_Guide.md`](./Notifications_Setup_and_Production_Guide.md).

---

## 1. Architecture at a glance

| Layer | Responsibility |
|--------|----------------|
| **PostgreSQL** | Source of truth: `Notification`, `NotificationReadReceipt`, dedup fields (`dedupKey`, `aggregateCount`, …), `expiresAt`. |
| **REST `/api/v1/notifications`** | Hub + mobile: list, unread-count, mark-read. **`POST /notifications/send`** (ADMIN/MANAGER → staff). Tenant JWT. |
| **REST `/api/v1/platform/notifications/broadcast`** | Super Admin: create notifications in tenant orgs (org-wide, by role, or `targetUserIds`). |
| **Redis (optional)** | Per-user cache for `GET /notifications/unread-count` (~30s TTL). Failures fall back to DB; **never** surfaces as 503 on mark-read. |
| **Socket.IO `/notifications`** | Same host as API; JWT on connect. Emits **lightweight** payloads; clients merge or refetch via REST. |

**Design rule:** After any successful **DB** write (e.g. mark read), the API returns **200** even if cache invalidation (`DEL`) fails. The badge may be **stale for up to ~30s** (unread-count cache TTL).

---

## 2. Backend behaviour changes (what the UI must model)

### 2.1 Visibility (who sees what)

- **Broadcast** (`userId === null`): visible to org **ADMIN** and **MANAGER** only. Read state is **per user** via `NotificationReadReceipt`, **not** the row’s `isRead`.
- **Personal** (`userId` set): visible only to that user (`userId === currentUser`). Read state uses the row’s `isRead` / `readAt`.
- **Staff mobile** (`STAFF`, `SALES_AGENT`): **personal inbox only** - they do **not** see org-wide (`userId: null`) rows. Owner → staff messages are always created with `userId` set.

List API returns a **unified** `isRead` / `readAt` for both personal and broadcast cases (see **List endpoint** below).

### 2.2 Deduplication and aggregation

These types may **merge into an existing unread row** within a configurable time window (`NOTIFICATION_DEDUP_WINDOW_MINUTES`, default **60**):

- `LOW_STOCK`
- `EXPIRY_WARNING`
- `STOCK_VARIANCE_SALE`
- `RETURN_REQUESTED`
- `REORDER_SUGGESTION`
- `BATCH_EXPIRED`

Dedup key is derived from `type`, `relatedEntityType`, `relatedEntityId`, and `userId` (or `"BROADCAST"`). Updates bump `aggregateCount` and refresh title/message/metadata. Realtime emits **`notification:new`** (personal) or **`notification:broadcast`** (org) with the **updated** row - clients should **merge by `id`**.

### 2.3 Default `expiresAt` (retention hints)

New notifications get `expiresAt` from type (calendar days from creation, **UTC**). Unmapped enum members fall back to **`OTHER`** (30 days). **`null`** means never expire.

| Retention | `NotificationType` values |
|-----------|-------------------------|
| **Never** (`null`) | `PAYMENT_FAILED`, `ACCOUNT_SUSPENDED`, `DATA_BREACH_NOTICE`, `PLAN_UPGRADE_REQUIRED` |
| **7 days** | `TEMPORARY_ITEM_SOLD`, `STAFF_TIME_WARNING`, `DAILY_SALES_SUMMARY`, `SHIFT_SCHEDULE`, `TRAINING_REMINDER` |
| **14 days** | `RETURN_REQUESTED`, `RETURN_PROCESSED`, `REFUND_PROCESSED`, `BATCH_EXPIRED`, `STORE_ANNOUNCEMENT` |
| **30 days** | `LOW_STOCK`, `DISCOUNT_ALERT`, `STOCK_VARIANCE_SALE`, `REORDER_SUGGESTION`, `STOCKTAKE_OVERDUE`, `HIGH_VALUE_SALE`, staff/security/billing/account/service/system ops types, `POLICY_UPDATE`, `OWNER_MESSAGE`, `OTHER` (see `notification-expiry.ts`) |
| **60 days** | `EXPIRY_WARNING`, `TRIAL_LIMIT_WARNING` |
| **90 days** | `SYSTEM_ALERT`, `MILESTONE_ACHIEVED`, `COMPLIANCE_UPDATE`, `PERFORMANCE_FEEDBACK` |
| **180 days** | `TRAINING_AVAILABLE`, `RECOMMENDATION_AVAILABLE` |

**Sweep:** If env `NOTIFICATION_EXPIRY_SWEEP_ENABLED` is `true` or `1`, a **daily** job (02:00 UTC) runs `DELETE` where `expiresAt < now()`. Rows with `expiresAt` null are **not** deleted by this job.

### 2.4 Temporary-item daily notification (lazy + cron)

Listing notifications **may** trigger materialization of “yesterday’s” temporary-item summary for the org (safety net if cron missed). Frontend does not call anything special - expect occasional **new** rows after opening the inbox.

### 2.5 Unread count semantics

- **Unread** = personal rows with `isRead === false` **or** broadcast rows **without** a read receipt for the current user.
- **`hasCritical`** = `true` if any unread row has one of these types:
  - `SYSTEM_ALERT`, `PLAN_UPGRADE_REQUIRED`
  - `PAYMENT_FAILED`, `ACCOUNT_SUSPENDED`, `DATA_BREACH_NOTICE`
  - `SECURITY_ALERT`, `SUSPICIOUS_ACTIVITY`, `DEVICE_UNAUTHORIZED`
  - `BACKUP_FAILED`, `USAGE_LIMIT_REACHED`, `SERVICE_MAINTENANCE`

Use `hasCritical` for badge styling or a “urgent” filter - do not hard-code only the two legacy types.

### 2.6 Permissive `type` on create (platform + internal)

The API accepts **any non-empty string** for `type` on platform broadcast. At persistence:

- Known enum values → stored as-is.
- Unknown values → stored as **`OTHER`** with `metadata.originalType` set to the requested string (server logs a warning).

Clients listing notifications should:

- Render using `type` for known values (icons, copy, routing).
- For `OTHER`, read `metadata.originalType` if present for display/debugging.

---

## 3. `NotificationType` (Prisma enum - mirror in clients)

Use the same string literals as the API (JSON preserves enum names). **40 values** + fallback:

```typescript
/** Mirror of Prisma `NotificationType` - keep in sync with backend schema. */
export type NotificationType =
  // Inventory & operations
  | 'TEMPORARY_ITEM_SOLD'
  | 'LOW_STOCK'
  | 'EXPIRY_WARNING'
  | 'BATCH_EXPIRED'
  | 'REORDER_SUGGESTION'
  | 'STOCKTAKE_OVERDUE'
  | 'STOCK_VARIANCE_SALE'
  // Sales & returns
  | 'RETURN_REQUESTED'
  | 'RETURN_PROCESSED'
  | 'REFUND_PROCESSED'
  | 'DISCOUNT_ALERT'
  | 'HIGH_VALUE_SALE'
  // Staff & security
  | 'STAFF_TIME_WARNING'
  | 'STAFF_ROLE_CHANGED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'SECURITY_ALERT'
  | 'DEVICE_UNAUTHORIZED'
  // Billing & subscription
  | 'PAYMENT_FAILED'
  | 'PAYMENT_METHOD_EXPIRING'
  | 'SUBSCRIPTION_RENEWED'
  | 'INVOICE_READY'
  | 'TRIAL_LIMIT_WARNING'
  | 'PLAN_UPGRADE_REQUIRED'
  | 'USAGE_LIMIT_REACHED'
  // Account & service
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REACTIVATED'
  | 'SERVICE_MAINTENANCE'
  | 'FEATURE_ENABLED'
  | 'FEATURE_DISABLED'
  // System & admin
  | 'SYSTEM_ALERT'
  | 'BACKUP_FAILED'
  | 'DATA_EXPORT_READY'
  // Compliance & legal
  | 'DATA_BREACH_NOTICE'
  | 'COMPLIANCE_UPDATE'
  | 'TAX_RATE_CHANGED'
  // Engagement & insights
  | 'MILESTONE_ACHIEVED'
  | 'DAILY_SALES_SUMMARY'
  | 'RECOMMENDATION_AVAILABLE'
  | 'TRAINING_AVAILABLE'
  // Owner → staff (Hub manual)
  | 'SHIFT_SCHEDULE'
  | 'POLICY_UPDATE'
  | 'STORE_ANNOUNCEMENT'
  | 'OWNER_MESSAGE'
  | 'TRAINING_REMINDER'
  | 'PERFORMANCE_FEEDBACK'
  // Fallback (unknown types from future clients)
  | 'OTHER';
```

**`metadata` for platform super-admin broadcasts (`source: 'platform_support'`):**

```typescript
interface NotificationMetadataPlatformSupport {
  source: 'platform_support';
  sender: {
    displayName: 'NutaSolutions Support';
  };
  originalType?: string; // when requested type was normalized to OTHER
  [key: string]: unknown;
}
```

Hub inbox UI should show **NutaSolutions Support** prominently for these rows (and for Socket.IO bulk digests with `senderName` / `source`).

**`metadata` for Hub manual sends (`source: 'hub_manual'`):**

```typescript
interface NotificationMetadataHubManual {
  sender?: {
    userId: string;
    displayName: string;
    role: string;
  };
  source: 'hub_manual';
  sentAt: string; // ISO 8601
  [key: string]: unknown;
}
```

**`metadata` for `OTHER` rows:**

```typescript
interface NotificationMetadataOther {
  originalType?: string; // e.g. "FUTURE_TYPE_2027" from platform broadcast
  [key: string]: unknown;
}
```

---

## 4. REST API (`/api/v1/notifications`)

**Auth:** `Authorization: Bearer <access_jwt>`  
**Guards:** tenant context (`organizationId` on token).

| Route | Roles |
|-------|--------|
| `POST /notifications/send`, `GET /notifications/sent` | **ADMIN**, **MANAGER** |
| `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read` | **ADMIN**, **MANAGER**, **STAFF**, **SALES_AGENT** |

**Errors (typical):**

- **401** - missing/invalid/expired token → refresh token flow.
- **403** - wrong role or tenant guard failure.
- **400** - validation (e.g. invalid UUID on mark-read path).
- **200** on mark-read when the DB update succeeded - **even if Redis cache delete failed** (do not show “service unavailable” for mark-read).

### 4.1 `GET /api/v1/notifications/unread-count`

**Response shape (authoritative):**

```typescript
export interface NotificationsUnreadCountResponse {
  unreadCount: number;
  /** Counts only types that appear in the unread set; omitted types = 0. */
  unreadByType: Partial<Record<NotificationType, number>>;
  /** True if any unread matches server critical types (billing, security, legal, etc.). */
  hasCritical: boolean;
}
```

**Caching (server-side):**

- If `REDIS_HOST` is set, responses may be served from Redis for the same user key for **~30 seconds**.
- On cache miss or Redis read/write error, the server computes from the DB and still returns **200**.
- **`PATCH .../read`** triggers a **best-effort** cache `DEL` for that user; no need for the client to vary behaviour when Redis is down.

**Client usage:** Poll when Socket.IO is disabled; on `notification:count-updated`, debounce and call this once (see **Reconnection and token refresh** and **Performance best practices**).

### 4.2 `GET /api/v1/notifications`

**Query parameters:**

| Param | Type | Default | Notes |
|--------|------|---------|--------|
| `unread` | string | - | If `true` or `1`, only unread rows for this user. |
| `limit` | number | `50` | Clamped to **1–100**. |
| `cursor` | UUID string | - | Opaque: **notification `id`** of the last item from the previous page. |

**Response:**

```typescript
export interface NotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  /** Merged event count for deduped types; always >= 1. */
  aggregateCount: number;
  /**
   * JSON from DB - structure varies by `type` / producer.
   * When `type === 'OTHER'`, check `metadata.originalType` for the requested label.
   */
  metadata: unknown;
  /** Derived: broadcast = presence of read receipt; personal = row.isRead */
  isRead: boolean;
  readAt: string | null; // ISO 8601 or null
  createdAt: string; // ISO 8601
}

export interface NotificationListResponse {
  data: NotificationListItem[];
  /** Pass as `cursor` for the next page; omit when undefined. */
  nextCursor?: string;
}
```

**Pagination:** Cursor is the **last** returned item’s `id`. If `nextCursor` is absent, there is no next page.

**Side effect (ADMIN/MANAGER only):** First list load may materialize “yesterday’s” temporary-items batch notification for the org (idempotent server-side). Staff list skips this.

### 4.3 `POST /api/v1/notifications/send` (Owner → staff)

Allows business owners to send **personal** notifications to staff in the same organization.

**Request:**

```typescript
export interface SendNotificationRequest {
  title: string;       // max 200
  message: string;     // max 1000
  type: string;        // prefer OWNER_MESSAGE, STORE_ANNOUNCEMENT, etc.
  targetUserIds?: string[];
  targetRoles?: UserRole[];   // exact match; SUPER_ADMIN not allowed
  targetAllStaff?: boolean;   // STAFF + SALES_AGENT only
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
}
```

**Targeting (at least one required; first match wins):**

| Priority | Field | Result |
|----------|-------|--------|
| 1 | `targetUserIds` | One row per user in caller’s org |
| 2 | `targetRoles` | One row per active user with matching role |
| 3 | `targetAllStaff: true` | All active `STAFF` and `SALES_AGENT` |

**Success (200):**

```json
{
  "sent": 2,
  "recipientIds": ["uuid-1", "uuid-2"],
  "notificationIds": ["uuid-a", "uuid-b"]
}
```

**Errors:**

- **400** - no targeting / no recipients / invalid `targetUserIds` → `{ message, invalidUserIds }`
- **403** - not ADMIN or MANAGER

Each create invalidates the recipient’s unread-count cache and emits **`notification:new`** with optional **`senderName`** (from sender display name).

### 4.4 `GET /api/v1/notifications/sent` (Owner outbox)

Lists **personal** notifications the caller sent to staff (`metadata.source === 'hub_manual'`, `metadata.sender.userId ===` current user). Read state reflects each **recipient’s** inbox (`isRead` / `readAt` on the row).

**Query parameters:**

| Param | Type | Default | Notes |
|--------|------|---------|--------|
| `page` | number | `1` | 1-based page index. |
| `limit` | number | `25` | Clamped to **1–100**. |
| `type` | `NotificationType[]` | - | Repeat param or array; filter by stored enum `type`. |
| `isRead` | boolean | - | Filter by recipient read state. |
| `userId` | UUID | - | Filter to a single recipient (`notification.userId`). |

**Response:**

```typescript
export interface SentNotificationRecipient {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  role: string;
}

export interface SentNotificationListItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  metadata: unknown;
  recipient: SentNotificationRecipient | null;
}

export interface SentNotificationListResponse {
  data: SentNotificationListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### 4.5 `PATCH /api/v1/notifications/:id/read`

**Response:**

```typescript
export interface NotificationMarkReadResponse {
  /** 1 if a row/receipt was written; 0 if id not visible or wrong user. */
  updated: number;
}
```

**Behaviour:**

- **Personal:** updates `isRead` / `readAt` if `notification.userId === currentUser`.
- **Broadcast:** upserts `NotificationReadReceipt` for (`notificationId`, `userId`).
- Triggers unread-count cache invalidation (**best-effort**) and may emit **`notification:count-updated`** over Socket.IO (see **Socket.IO** below).

---

## 5. Platform Super Admin - send notifications (`POST /api/v1/platform/notifications/broadcast`)

**Auth:** `SUPER_ADMIN` JWT (platform routes - not the tenant Hub `/notifications` routes).  
**Full API reference:** [`SUPER_ADMIN_API.md`](../SUPER_ADMIN_API.md).

This endpoint creates notification rows in tenant orgs. Realtime: affected orgs receive **`notification:broadcast`** (digest with `bulk: true`) or **`notification:new`** for personal rows.

### 5.1 Request body

```typescript
export interface PlatformBroadcastNotificationRequest {
  title: string;       // max 200
  message: string;     // max 1000
  type: string;        // any non-empty string; unknown → stored as OTHER
  targetOrganizations?: string[]; // org UUIDs; omit = all active orgs (role/org-wide modes)
  targetRoles?: UserRole[];       // ADMIN | MANAGER | STAFF | …
  targetUserIds?: string[];       // user UUIDs - cross-org individual targeting
}
```

### 5.2 Recipient resolution (priority order)

| Priority | Fields set | Result |
|----------|------------|--------|
| **1** | `targetUserIds` | One **personal** row per user (`userId` set), any active org. `targetRoles` ignored. Optional `targetOrganizations` scopes eligible users. |
| **2** | `targetRoles` (no `targetUserIds`) | One row per active user matching roles in the org filter. |
| **3** | Neither | One **org-wide** row per org (`userId: null`) - visible to all Hub admins/managers. |

**Org filter** (modes 2–3): `targetOrganizations` omitted → all `isActive=true` organizations.

### 5.3 Examples

**All orgs - maintenance banner (org-wide):**

```json
{
  "title": "Scheduled maintenance",
  "message": "Maintenance 02:00–03:00 GMT.",
  "type": "SERVICE_MAINTENANCE"
}
```

**Specific orgs - managers only (personal rows):**

```json
{
  "title": "Policy update",
  "message": "Please review the updated refund policy.",
  "type": "COMPLIANCE_UPDATE",
  "targetOrganizations": ["org-uuid-1"],
  "targetRoles": ["ADMIN", "MANAGER"]
}
```

**Individual users across organizations (user picker):**

```json
{
  "title": "Account notice",
  "message": "Please contact support regarding your account.",
  "type": "ACCOUNT_SUSPENDED",
  "targetUserIds": ["user-uuid-1", "user-uuid-2"]
}
```

Optional scope: same payload with `targetOrganizations: ["org-uuid-1"]` so only users in that org are eligible.

### 5.4 Responses and errors

**Success (200):**

```json
{
  "success": true,
  "notificationsSent": 2,
  "recipientCount": 2
}
```

**Invalid user IDs (400)** when using `targetUserIds`:

```json
{
  "message": "One or more targetUserIds are invalid, inactive, or not in an active organization",
  "invalidUserIds": ["bad-uuid"]
}
```

Users must be **active** with a non-null `organizationId` on an **active** organization.

### 5.5 Platform UI integration notes

- **User picker:** collect UUIDs → send `targetUserIds` only (do not also send `targetRoles`).
- **Role blast:** `targetOrganizations` + `targetRoles`.
- **Org-wide announcement:** `targetOrganizations` only (or omit for all orgs).
- **Type field:** send new enum strings (e.g. `PAYMENT_FAILED`) directly; no backend deploy needed for types already in the enum. Truly unknown strings persist as `OTHER` + `metadata.originalType`.
- **Hub clients** in those orgs: personal targets get `notification:new`; bulk org-wide/platform batches often emit org-room digest with `bulk: true` - **refetch list** (see Socket.IO below).

---

## 6. Socket.IO (`/notifications` namespace)

### 6.1 Connection

- **Engine:** Socket.IO **v4**
- **Namespace:** `/notifications`
- **URL:** same origin as API, e.g. `https://api.example.com` with namespace path `/notifications` (client: `io(url, { path: '/socket.io/', ... })` - use your deployment’s actual Socket.IO path if customized; default is `/socket.io/`).

**Auth** (same **access** JWT as REST):

- Preferred: `auth: { token: accessJwt }` on the client `io()` options, **or**
- Header on handshake: `Authorization: Bearer <accessJwt>`

The server **disconnects** immediately if:

- token missing / invalid JWT
- payload `type !== 'access'`
- `organizationId` is **null** on the token (e.g. platform super-admin without org - Hub tenant features unavailable)

On success the socket joins rooms: `org:<organizationId>` and `user:<sub>`.

### 6.2 CORS

Env **`WEBSOCKET_CORS_ORIGIN`**: comma-separated allowed origins for this gateway. If empty, falls back to **`CORS_ORIGINS`**, then permissive behaviour in dev-style setups.

### 6.3 Event payload types (exact TypeScript)

Server → client only (no client → server notification API on this namespace).

**Shared “single notification” payload** (mirrors `NotificationRealtimePayload` in `notifications-realtime.service.ts`). **Does not include `metadata`** - refetch list or keep existing merged state for full detail. Includes **`aggregateCount`** so the UI can update dedup badges on merge without a full list refetch.

```typescript
export interface NotificationRealtimePayload {
  id: string;
  organizationId: string;
  userId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  aggregateCount: number;
  createdAt: string; // ISO 8601
  /** Present for Hub manual sends to staff; use for in-app banner label. */
  senderName?: string | null;
}
```

**Platform bulk broadcast digest** (after `createMany` per org):

```typescript
export interface NotificationAdminBroadcastDigestPayload {
  organizationId: string;
  bulk: true;
  type: NotificationType;
  title: string;
  message: string;
  /** Number of notification rows created for this org in that batch. */
  recipientCount: number;
}
```

**Unread hint** (cheap fan-out for org tabs):

```typescript
export interface NotificationCountUpdatedPayload {
  organizationId: string;
}
```

### 6.4 Events reference

| Event | Delivered to | Payload type | Client action |
|--------|----------------|-------------|----------------|
| `notification:new` | Room `user:<userId>` only | `NotificationRealtimePayload` | Upsert into inbox for **personal** notifications; refresh badge (debounced). |
| `notification:broadcast` | Room `org:<organizationId>` | `NotificationRealtimePayload` **or** `NotificationAdminBroadcastDigestPayload` | If `'bulk' in payload && payload.bulk`, refetch list (or show summary toast + refetch). Else upsert row by `id`. |
| `notification:count-updated` | Room `org:<organizationId>` | `NotificationCountUpdatedPayload` | Debounced `GET .../unread-count`; optionally refresh visible list. |

**Type guard example:**

```typescript
function isAdminDigest(
  p: NotificationRealtimePayload | NotificationAdminBroadcastDigestPayload,
): p is NotificationAdminBroadcastDigestPayload {
  return 'bulk' in p && p.bulk === true;
}
```

---

## 7. Client implementation examples

### 7.1 Browser / Vite / React - Socket.IO client

Dependencies: `socket.io-client@4`.

```typescript
import { io, type Socket } from 'socket.io-client';

const API_ORIGIN = import.meta.env.VITE_API_URL; // e.g. https://api.example.com

export function createNotificationsSocket(getAccessToken: () => string | null): Socket {
  const token = getAccessToken();
  if (!token) throw new Error('No access token');

  return io(`${API_ORIGIN}/notifications`, {
    path: '/socket.io/',
    transports: ['websocket', 'polling'],
    auth: { token },
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });
}
```

**Handlers (sketch):**

```typescript
import { useEffect, useRef } from 'react';

useEffect(() => {
  const socket = createNotificationsSocket(() => localStorage.getItem('accessToken'));

  socket.on('notification:new', (payload: NotificationRealtimePayload) => {
    queryClient.setQueryData(['notifications', 'list'], (old: NotificationListResponse | undefined) => mergeUpsert(old, payload));
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  });

  socket.on('notification:broadcast', (payload: NotificationRealtimePayload | NotificationAdminBroadcastDigestPayload) => {
    if (isAdminDigest(payload)) {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
    } else {
      queryClient.setQueryData(['notifications', 'list'], (old) => mergeUpsert(old, payload));
    }
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  });

  let countDebounce: ReturnType<typeof setTimeout> | undefined;
  socket.on('notification:count-updated', () => {
    clearTimeout(countDebounce);
    countDebounce = setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }, 400);
  });

  return () => {
    socket.removeAllListeners();
    socket.disconnect();
  };
}, [queryClient]);
```

Implement `mergeUpsert` by **replacing or prepending** the item with matching `id` in `data` (preserve `metadata` from REST if the WS payload omitted it).

### 7.2 Native / React Native

Use the same URL, `auth: { token }`, and prefer **websocket** transport where supported. Handle app foreground: **reconnect** and run **`GET /unread-count`** once (WS may have missed events).

---

## 8. Reconnection and token refresh

| Scenario | Recommended behaviour |
|----------|----------------------|
| Socket disconnect | Rely on Socket.IO built-in backoff (`reconnectionDelay`, `reconnectionDelayMax`). |
| Access token expiring soon | Proactively refresh; **disconnect** socket and create a **new** instance with `auth.token` updated (Socket.IO does not always re-send fresh auth on reconnect depending on version/config). |
| 401 from REST | Refresh tokens, then reconnect socket with new JWT. |
| Missed events while offline | On reconnect or app resume: **`GET /notifications/unread-count`** + **`GET /notifications?unread=true&limit=…`** (full sync if needed). |
| Duplicate refetches | Debounce `notification:count-updated` (300–500 ms); dedupe in-flight fetches (e.g. React Query `staleTime`). |

---

## 9. Error handling guidance

- **REST 401 / 403:** Do not treat as “notification bug”; fix auth/session. After refresh, replay pending mark-read if idempotent (`updated: 0` means nothing changed).
- **Mark-read returns `{ updated: 0 }`:** Item not visible to user, wrong org, or wrong personal recipient - remove from UI or refetch list; do not retry blindly.
- **Socket immediate disconnect:** Usually invalid/missing token or no `organizationId` on token - show “live updates unavailable” and fall back to polling.
- **Redis / cache:** No user-facing error for mark-read or unread-count from cache failures; if counts “jump” after ≤30s, that is expected when Redis was stale.

---

## 10. Performance best practices

- **Badge:** Prefer **`GET /unread-count`** over scanning the list; cache in React Query with short `staleTime` (e.g. 15–30s) and invalidate on socket hints.
- **List:** Use **cursor** pagination; avoid refetching all pages on every hint - invalidate first page only, or merge single-row WS payloads.
- **Broadcast bulk:** `NotificationAdminBroadcastDigestPayload` means **many** DB rows; avoid building a fake row without refetch unless you show a toast only.
- **Debouncing:** Coalesce `notification:count-updated` within one frame / 400 ms to avoid storms when many org members receive events.
- **Personal vs org:** `notification:new` is targeted - use it to avoid excessive org-wide list churn when only one manager should see a row.

---

## 11. Environment variables (reference for DevOps / frontend config)

| Variable | Effect |
|----------|--------|
| `REDIS_HOST` | Optional; enables Redis-backed unread-count cache (~30s TTL). |
| `REDIS_PORT` / `REDIS_PASSWORD` | Redis connection. |
| `NOTIFICATION_DEDUP_WINDOW_MINUTES` | Dedup/aggregate lookback (default 60). |
| `WEBSOCKET_CORS_ORIGIN` | Socket.IO CORS allowlist for `/notifications`. |
| `NOTIFICATION_EXPIRY_SWEEP_ENABLED` | `true`/`1` enables nightly deletion of expired notifications. |

---

## 12. Source-of-truth code map (for maintainers / agents)

| Concern | Location |
|---------|----------|
| Hub HTTP routes | `src/modules/notifications/notifications.controller.ts` |
| Owner → staff send | `src/modules/notifications/notifications-send.service.ts` |
| Send DTO | `src/modules/notifications/dto/send-notification.dto.ts` |
| List / unread / mark-read / dedup / critical | `src/modules/notifications/notifications.service.ts` |
| Type normalization (`OTHER` + `originalType`) | `src/modules/notifications/notification-type.util.ts` |
| Platform broadcast + `targetUserIds` | `src/modules/platform-admin/platform-admin-notifications.service.ts` |
| Broadcast DTO | `src/modules/platform-admin/dto/broadcast-notification.dto.ts` |
| WS gateway + JWT | `src/modules/notifications/notifications.gateway.ts` |
| Event payloads + emit helpers | `src/modules/notifications/notifications-realtime.service.ts` |
| Default `expiresAt` | `src/modules/notifications/notification-expiry.ts` |
| Nightly sweep | `src/modules/notifications/notifications-expiry.service.ts` |
| Prisma enum | `prisma/schema.prisma` → `NotificationType` |
| Platform API doc | `SUPER_ADMIN_API.md` |
| JWT payload shape | `src/common/interfaces/jwt-payload.interface.ts` |
| IoAdapter registration | `src/main.ts` |

---

*This guide reflects the notifications stack: read receipts, dedup, expanded `NotificationType`, permissive type normalization, Redis cache semantics, Socket.IO hints, expiry, platform super-admin broadcast, and tenant Hub send to staff (`POST /notifications/send`). Update when changing `notifications.service.ts`, `notifications-send.service.ts`, `notification-type.util.ts`, or `platform-admin-notifications.service.ts`.*
