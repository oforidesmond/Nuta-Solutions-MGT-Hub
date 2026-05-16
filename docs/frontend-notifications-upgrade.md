# Management Hub Notifications System Upgrade: World-Class Real-Time Implementation

## Context

You are upgrading the Management Hub notifications system from a **basic polling implementation** to a **world-class real-time system** that matches the enhanced backend (see `docs/NOTIFICATIONS_REALTIME.md` in workspace).

**Current State:**
- Bell dropdown in `AppHeader` with 15-second HTTP polling
- No real-time updates (no WebSocket)
- **BROKEN**: Clicking notifications doesn't navigate to action URLs
- **BROKEN**: Clicking notifications doesn't mark them as read or clear badge
- No cursor pagination (fetches 50 items, discards overflow)
- No unread filter (fetches all, shows all)
- Platform admin has separate surface (not your concern here)

**Target State:**
- Real-time WebSocket delivery (Socket.IO)
- Instant badge updates when notifications arrive
- Click notification → mark as read + navigate to action
- Badge count accurate and real-time
- Graceful fallback to polling if WebSocket fails
- Support for broadcast notifications (org-wide alerts)
- Support for aggregated notifications (e.g., "5 products low in stock")

---

## Critical Requirements (Non-Negotiable)

### **1. Click Behavior Must Work**

**Current Bug:** Clicking a notification does nothing or doesn't clear it.

**Required Behavior:**
1. User clicks notification in bell dropdown
2. **Immediately** mark as read via `PATCH /notifications/:id/read`
3. **Optimistically** update UI (remove unread indicator, decrement badge by 1)
4. **Navigate** to `notification.actionUrl` if present, else navigate based on type-specific logic (see `lib/navigation/notification-href.ts`)
5. Close the dropdown
6. If API call fails (network error), **rollback** optimistic update (re-add unread indicator, increment badge)

**Implementation:**
```typescript
// In notifications-menu.tsx or equivalent
async function handleNotificationClick(notification: HubNotification) {
  if (notification.isRead) {
    // Already read, just navigate
    navigateToNotification(notification);
    return;
  }

  // 1. Optimistic UI update
  setNotifications(prev => 
    prev.map(n => n.id === notification.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)
  );
  decrementBadgeCount();

  // 2. API call (background)
  try {
    await markNotificationAsRead(notification.id);
    // Success - UI already updated
  } catch (error) {
    // 3. Rollback on failure
    setNotifications(prev => 
      prev.map(n => n.id === notification.id ? { ...n, isRead: false, readAt: null } : n)
    );
    incrementBadgeCount();
    toast.error('Failed to mark notification as read');
  }

  // 4. Navigate (even if API failed - user saw it)
  navigateToNotification(notification);
  
  // 5. Close dropdown
  closeNotificationsMenu();
}
```

---

### **2. Real-Time WebSocket Integration**

**Backend provides:** Socket.IO `/notifications` namespace (see `docs/NOTIFICATIONS_REALTIME.md`)

**Your Tasks:**

#### **A. Install Dependencies**
```bash
npm install socket.io-client@4
```

#### **B. Create WebSocket Service**

**File:** `lib/services/notifications-socket.ts` (NEW FILE)

```typescript
import { io, Socket } from 'socket.io-client';

interface NotificationSocketCallbacks {
  onNew: (notification: any) => void;
  onBroadcast: (notification: any) => void;
  onCountUpdated: () => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: Error) => void;
}

class NotificationsSocket {
  private socket: Socket | null = null;
  private callbacks: NotificationSocketCallbacks | null = null;

  connect(accessToken: string, callbacks: NotificationSocketCallbacks) {
    this.callbacks = callbacks;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    
    this.socket = io(`${apiUrl}/notifications`, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('✓ Notifications WebSocket connected');
      this.callbacks?.onConnected();
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('✗ Notifications WebSocket disconnected:', reason);
      this.callbacks?.onDisconnected();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      this.callbacks?.onError(error);
    });

    // Notification events
    this.socket.on('notification:new', (data) => {
      console.log('New notification:', data);
      this.callbacks?.onNew(data);
    });

    this.socket.on('notification:broadcast', (data) => {
      console.log('Broadcast notification:', data);
      this.callbacks?.onBroadcast(data);
    });

    this.socket.on('notification:count-updated', () => {
      console.log('Notification count updated');
      this.callbacks?.onCountUpdated();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const notificationsSocket = new NotificationsSocket();
```

#### **C. Integrate into useNotifications Hook**

**File:** `lib/hooks/use-notifications.ts` (MODIFY)

**Add to existing hook:**

```typescript
import { notificationsSocket } from '@/lib/services/notifications-socket';
import { useEffect, useRef } from 'react';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isWebSocketConnected = useRef(false);

  // Existing React Query setup...
  const { data, isLoading, error } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => fetchNotifications({ limit: 50 }),
    refetchInterval: isWebSocketConnected.current ? false : 15_000, // Stop polling if WebSocket connected
  });

  // NEW: WebSocket connection
  useEffect(() => {
    if (!session?.accessToken) return;

    notificationsSocket.connect(session.accessToken, {
      onNew: (notification) => {
        // Add to list (prepend)
        queryClient.setQueryData(['notifications', 'list'], (old: any) => {
          if (!old) return { items: [notification] };
          // Upsert by ID (in case it's an update to aggregated notification)
          const exists = old.items.findIndex((n: any) => n.id === notification.id);
          if (exists !== -1) {
            // Update existing (aggregation case)
            const updated = [...old.items];
            updated[exists] = { ...updated[exists], ...notification };
            return { ...old, items: updated };
          } else {
            // New notification
            return { ...old, items: [notification, ...old.items] };
          }
        });

        // Invalidate unread count
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        // Show toast (optional)
        if (notification.type === 'SYSTEM_ALERT') {
          toast.info(notification.title, { description: notification.message });
        }
      },

      onBroadcast: (notification) => {
        // Same as onNew, but handle bulk digest
        if ('bulk' in notification && notification.bulk) {
          // Bulk digest - refetch list instead of merging
          queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
          toast.info(notification.title, { description: notification.message });
        } else {
          // Regular broadcast - same as personal notification
          queryClient.setQueryData(['notifications', 'list'], (old: any) => {
            if (!old) return { items: [notification] };
            return { ...old, items: [notification, ...old.items] };
          });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        }
      },

      onCountUpdated: () => {
        // Debounce and refetch unread count
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        }, 300);
      },

      onConnected: () => {
        isWebSocketConnected.current = true;
        console.log('Switching to WebSocket mode (polling disabled)');
      },

      onDisconnected: () => {
        isWebSocketConnected.current = false;
        console.log('Switching to polling mode (WebSocket disconnected)');
      },

      onError: (error) => {
        console.error('WebSocket error:', error);
        // Continue with polling fallback
      },
    });

    return () => {
      notificationsSocket.disconnect();
    };
  }, [session?.accessToken, queryClient]);

  // Rest of existing hook...
  return {
    notifications: data?.items || [],
    isLoading,
    error,
    isWebSocketConnected: isWebSocketConnected.current,
  };
}
```

---

### **3. Unread Count Endpoint Integration**

**Backend provides:** `GET /notifications/unread-count`

**Your Task:** Replace badge count calculation with dedicated endpoint.

**Current Code (WRONG):**
```typescript
// Counting locally from list
const unreadCount = notifications.filter(n => !n.isRead).length;
```

**New Code (CORRECT):**

**File:** `lib/api/notifications.ts` (ADD)

```typescript
export interface UnreadCountResponse {
  unreadCount: number;
  unreadByType: Partial<Record<string, number>>;
  hasCritical: boolean;
}

export async function fetchUnreadCount(): Promise<UnreadCountResponse> {
  const response = await apiClient.get('/notifications/unread-count');
  return response.data;
}
```

**File:** `lib/hooks/use-notifications.ts` (ADD)

```typescript
export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000, // 30 seconds (cache TTL on backend)
    staleTime: 15_000, // Consider fresh for 15s
  });
}
```

**File:** `components/layout/notifications-menu.tsx` (MODIFY)

```typescript
// Replace local count with query
const { data: unreadData } = useUnreadCount();
const unreadCount = unreadData?.unreadCount || 0;
const hasCritical = unreadData?.hasCritical || false;

// Badge rendering
<Badge variant={hasCritical ? 'destructive' : 'default'}>
  {unreadCount > 9 ? '9+' : unreadCount}
</Badge>
```

---

### **4. Navigation Logic (Fix Deep Linking)**

**File:** `lib/navigation/notification-href.ts` (MODIFY)

**Current State:** Returns hrefs but navigation doesn't happen.

**Required Changes:**

```typescript
export function getNotificationHref(notification: HubNotification): string | null {
  // Priority 1: Backend actionUrl (if present)
  if (notification.actionUrl) {
    return notification.actionUrl;
  }

  // Priority 2: Type-specific routing
  switch (notification.type) {
    case 'TEMPORARY_ITEM_SOLD':
      if (notification.metadata?.productId) {
        return `/inventory/temporary-items?highlightProductId=${notification.metadata.productId}`;
      }
      // Legacy: aggregateId
      if (notification.metadata?.aggregateId) {
        return `/inventory/temporary-items?highlightProductId=${notification.metadata.aggregateId}`;
      }
      return '/inventory/temporary-items';

    case 'RETURN_PROCESSED':
      if (notification.metadata?.saleId && notification.metadata?.returnId) {
        return `/sales/${notification.metadata.saleId}/return/${notification.metadata.returnId}`;
      }
      return '/sales';

    case 'STAFF_TIME_WARNING':
      if (notification.metadata?.staffId) {
        return `/staff/${notification.metadata.staffId}/devices`;
      }
      return '/staff';

    case 'STOCK_VARIANCE_SALE':
      // Use relatedEntityId (saleId) if available
      if (notification.relatedEntityType === 'sale' && notification.relatedEntityId) {
        return `/sales/${notification.relatedEntityId}?highlightVariance=1`;
      }
      // Fallback to metadata
      if (notification.metadata?.saleId) {
        return `/sales/${notification.metadata.saleId}?highlightVariance=1`;
      }
      return '/sales';

    case 'LOW_STOCK':
      if (notification.metadata?.productId) {
        return `/inventory/products/${notification.metadata.productId}`;
      }
      return '/inventory/products';

    case 'EXPIRY_WARNING':
      return '/inventory/products?expiringSoon=true';

    case 'RETURN_REQUESTED':
      if (notification.metadata?.returnId) {
        return `/sales/returns/${notification.metadata.returnId}`;
      }
      return '/sales/returns';

    case 'SYSTEM_ALERT':
    case 'PLAN_UPGRADE_REQUIRED':
    case 'TRIAL_LIMIT_WARNING':
      return '/settings/billing';

    default:
      return null;
  }
}
```

**File:** `components/layout/notifications-menu.tsx` (MODIFY)

```typescript
import { useRouter } from 'next/navigation';
import { getNotificationHref } from '@/lib/navigation/notification-href';

function NotificationsMenu() {
  const router = useRouter();

  const handleNotificationClick = async (notification: HubNotification) => {
    // 1. Mark as read (optimistic)
    if (!notification.isRead) {
      // Optimistic update (see requirement #1 above)
      // ... optimistic update code ...

      try {
        await markNotificationAsRead(notification.id);
      } catch (error) {
        // ... rollback code ...
      }
    }

    // 2. Navigate
    const href = getNotificationHref(notification);
    if (href) {
      router.push(href);
      closeMenu();
    } else {
      // No link - show toast with message
      toast.info(notification.title || 'Notification', {
        description: notification.message,
      });
    }
  };

  return (
    // ... existing JSX with onClick={handleNotificationClick} ...
  );
}
```

---

### **5. Support Aggregated Notifications**

**Backend Feature:** Notifications with `aggregateCount > 1` are deduplicated (e.g., "5 products low in stock").

**UI Requirements:**

```typescript
// In notifications-menu.tsx
function NotificationItem({ notification }: { notification: HubNotification }) {
  const isAggregated = notification.aggregateCount && notification.aggregateCount > 1;

  return (
    <div className={cn("notification-item", !notification.isRead && "unread")}>
      {/* Show aggregate indicator */}
      {isAggregated && (
        <Badge variant="secondary" className="absolute top-2 right-2">
          {notification.aggregateCount}
        </Badge>
      )}
      
      {/* Title and message already updated by backend */}
      <div className="font-medium">{notification.title}</div>
      <div className="text-sm text-muted-foreground">{notification.message}</div>
      
      {/* Timestamp */}
      <div className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}
```

---

### **6. Graceful Degradation (WebSocket Failures)**

**Required Behavior:**

| Scenario | Action |
|----------|--------|
| WebSocket connects successfully | Disable polling, use real-time events |
| WebSocket fails to connect (5 retries) | Continue with 15-second polling |
| WebSocket disconnects mid-session | Re-enable polling until reconnect |
| Token expires | Refresh token, reconnect WebSocket with new token |

**Implementation:**

Already handled in the `useNotifications` hook above via:
```typescript
refetchInterval: isWebSocketConnected.current ? false : 15_000
```

**Token Refresh:**

```typescript
// In lib/services/notifications-socket.ts
socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server kicked us out - likely token expired
    callbacks?.onDisconnected();
    
    // Trigger token refresh (implement based on your auth flow)
    // Then reconnect:
    // const newToken = await refreshAccessToken();
    // this.connect(newToken, callbacks);
  }
});
```

---

### **7. Type Updates**

**File:** `lib/types/phase2.ts` (MODIFY)

Add missing fields from backend:

```typescript
export interface HubNotification {
  id: string;
  type: string; // NotificationType enum
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, any> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  
  // NEW: Aggregation fields
  dedupKey?: string | null;
  aggregateCount?: number;
  lastAggregatedAt?: string | null;
  
  // NEW: Expiry
  expiresAt?: string | null;
}
```

**Add NotificationType enum:**

```typescript
export type NotificationType =
  | 'TEMPORARY_ITEM_SOLD'
  | 'RETURN_REQUESTED'
  | 'RETURN_PROCESSED'
  | 'DISCOUNT_ALERT'
  | 'EXPIRY_WARNING'
  | 'LOW_STOCK'
  | 'TRIAL_LIMIT_WARNING'
  | 'PLAN_UPGRADE_REQUIRED'
  | 'SYSTEM_ALERT'
  | 'STAFF_TIME_WARNING'
  | 'STOCK_VARIANCE_SALE';
```

---

### **8. Visual Indicators**

**Critical Alerts:**

```typescript
// In notifications-menu.tsx
function NotificationItem({ notification }: { notification: HubNotification }) {
  const isCritical = ['SYSTEM_ALERT', 'PLAN_UPGRADE_REQUIRED'].includes(notification.type);

  return (
    <div className={cn(
      "notification-item",
      !notification.isRead && "font-semibold border-l-4 border-l-primary",
      isCritical && "bg-destructive/10 border-l-destructive"
    )}>
      {/* ... content ... */}
    </div>
  );
}
```

**Badge Color:**

```typescript
// Show red badge if critical unread notifications
const { data: unreadData } = useUnreadCount();
const badgeVariant = unreadData?.hasCritical ? 'destructive' : 'default';

<Badge variant={badgeVariant}>{unreadCount}</Badge>
```

---

### **9. Performance Optimizations**

#### **A. Debounce Count Updates**

```typescript
// In useNotifications hook
const debouncedInvalidateCount = useMemo(
  () => debounce(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, 300),
  [queryClient]
);

// Use in WebSocket callbacks
onCountUpdated: () => {
  debouncedInvalidateCount();
}
```

#### **B. Limit In-Memory Notifications**

```typescript
// In useNotifications hook
const { data } = useQuery({
  queryKey: ['notifications', 'list'],
  queryFn: () => fetchNotifications({ limit: 50 }),
  select: (data) => ({
    ...data,
    items: data.items.slice(0, 100), // Keep max 100 in memory
  }),
});
```

#### **C. Virtualized List (If Needed)**

If dropdown becomes slow with 50+ items:

```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function NotificationsList({ notifications }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: notifications.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Height of each notification item
  });

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <NotificationItem notification={notifications[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### **10. Testing Checklist**

After implementation, verify:

#### **Basic Functionality:**
- [ ] Bell icon shows correct unread count on page load
- [ ] Clicking bell opens dropdown with notifications
- [ ] Clicking notification marks it as read (badge decrements)
- [ ] Clicking notification navigates to correct page
- [ ] Unread notifications have visual indicator (bold, left border)
- [ ] Read notifications are visually de-emphasized
- [ ] Critical alerts (SYSTEM_ALERT) have red badge and background

#### **WebSocket (Real-Time):**
- [ ] WebSocket connects on app load (check console logs)
- [ ] New notification arrives → appears in dropdown instantly
- [ ] New notification arrives → badge increments instantly
- [ ] Broadcast notification arrives → shows to all org users
- [ ] Aggregated notification updates (e.g., count changes from 3 to 5)
- [ ] WebSocket disconnects → polling resumes automatically
- [ ] WebSocket reconnects → polling stops

#### **Navigation (Deep Linking):**
- [ ] TEMPORARY_ITEM_SOLD → `/inventory/temporary-items?highlightProductId=X`
- [ ] RETURN_PROCESSED → `/sales/{saleId}/return/{returnId}`
- [ ] STAFF_TIME_WARNING → `/staff/{staffId}/devices`
- [ ] STOCK_VARIANCE_SALE → `/sales/{saleId}?highlightVariance=1`
- [ ] LOW_STOCK → `/inventory/products/{productId}` or list
- [ ] EXPIRY_WARNING → `/inventory/products?expiringSoon=true`
- [ ] RETURN_REQUESTED → `/sales/returns/{returnId}`
- [ ] SYSTEM_ALERT → `/settings/billing`
- [ ] Notification without actionUrl or metadata → shows toast

#### **Error Handling:**
- [ ] Network offline → mark-as-read fails → rollback UI (re-add unread)
- [ ] WebSocket fails → polling continues (no user impact)
- [ ] Token expired → refreshes token, reconnects WebSocket
- [ ] Invalid notification data → doesn't crash app (defensive parsing)

#### **Performance:**
- [ ] Dropdown opens instantly (<100ms)
- [ ] Scrolling 50+ notifications is smooth
- [ ] Badge count updates don't cause full re-renders
- [ ] WebSocket events don't block UI thread

#### **Edge Cases:**
- [ ] User in multiple tabs → all tabs update in sync
- [ ] Mark as read in one tab → badge updates in other tabs (via WebSocket)
- [ ] Notification deleted by backend expiry → gracefully removed from UI
- [ ] Duplicate notifications (same ID) → merged, not duplicated

---

## Files to Create/Modify

### **NEW FILES:**
1. `lib/services/notifications-socket.ts` — WebSocket service singleton
2. `lib/api/notifications.ts` — Add `fetchUnreadCount()` function

### **MODIFY FILES:**
1. `lib/hooks/use-notifications.ts` — Add WebSocket integration, unread count query
2. `components/layout/notifications-menu.tsx` — Fix click behavior, add optimistic updates
3. `lib/navigation/notification-href.ts` — Complete all type-specific routes
4. `lib/types/phase2.ts` — Add missing fields (aggregateCount, dedupKey, expiresAt)
5. `lib/query/poll-intervals.ts` — Make polling conditional on WebSocket state

### **NO CHANGES (Keep As-Is):**
- Platform admin notification UI (`app/(platform)/platform/notifications/*`)
- Broadcast modal (`components/platform/notifications/broadcast-notification-modal.tsx`)
- Platform API (`lib/api/platform/notifications.ts`)

---

## Environment Variables

Add to `.env.local`:

```bash
# WebSocket connection (should match API URL)
NEXT_PUBLIC_API_URL=http://localhost:3000
# Production: NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Implementation Order

1. **Phase 1: Fix Existing Bugs (No WebSocket Yet)**
   - Fix click → mark as read → navigate flow
   - Add optimistic updates
   - Integrate `GET /notifications/unread-count` endpoint
   - Fix navigation routing for all types
   - **Test:** Notifications work correctly with polling

2. **Phase 2: WebSocket Integration**
   - Create `notifications-socket.ts` service
   - Integrate into `useNotifications` hook
   - Add event handlers (new, broadcast, count-updated)
   - Make polling conditional on WebSocket state
   - **Test:** Real-time updates work, fallback to polling on failure

3. **Phase 3: Polish**
   - Add critical alert visual indicators
   - Add aggregation count badges
   - Add loading states
   - Add error boundaries
   - **Test:** All edge cases pass

---

## Success Criteria (World-Class Standards)

Your implementation will be **world-class** when:

✅ **Instant Feedback:** User clicks notification → UI updates instantly (optimistic)  
✅ **Real-Time:** New notifications appear within 1 second (WebSocket)  
✅ **Reliable:** System works even when WebSocket fails (graceful degradation)  
✅ **Accurate:** Badge count is always correct (dedicated endpoint + cache invalidation)  
✅ **Actionable:** Every notification has a clear action (navigation or toast)  
✅ **Visual Hierarchy:** Critical alerts stand out, read vs. unread is obvious  
✅ **Performant:** Dropdown opens instantly, no jank with 100+ notifications  
✅ **Resilient:** Handles network failures, token expiry, duplicate events gracefully  

---

## Reference Documentation

Read these files in your workspace for backend API details:
- `docs/NOTIFICATIONS_REALTIME.md` — Complete API reference (Socket.IO events, REST endpoints, payloads)
- Current frontend implementation notes in workspace context

---

## Anti-Patterns to Avoid

❌ **Don't** calculate unread count by filtering local list (use `/unread-count` endpoint)  
❌ **Don't** navigate before marking as read (mark first, then navigate)  
❌ **Don't** wait for API response to update UI (use optimistic updates)  
❌ **Don't** create a new WebSocket connection on every render (use singleton)  
❌ **Don't** show error toasts for cache failures (only for user-facing actions)  
❌ **Don't** poll while WebSocket is connected (wastes resources)  
❌ **Don't** crash on malformed notification data (use defensive parsing)  

---

## Final Notes

**This is a critical user-facing feature.** Users rely on notifications to know when important events happen (returns, stock issues, staff alerts). A broken notification system means users miss critical information.

**Your implementation should rival:**
- Slack's notification system (instant, reliable, actionable)
- Linear's notification system (clean, minimal, always works)
- Gmail's notification system (accurate counts, deep linking)

**After implementation:**
1. Test manually with all notification types
2. Test WebSocket disconnect/reconnect
3. Test with poor network (throttle in DevTools)
4. Test on mobile (React Native if applicable)
5. Show to a teammate for UX review

**Questions? Check `docs/NOTIFICATIONS_REALTIME.md` first.** If still unclear, ask backend team for clarification rather than guessing.

---

**Good luck! Build something users will love.** 🚀
