# Web Push Notifications Implementation

## Status

✅ **Android App** - FULLY WORKING
- Firebase Cloud Messaging (FCM) via Capacitor
- Real-time push notifications
- Device token registration with fingerprinting
- Permission handling for Android 13+

✅ **Web App** - NOW IMPLEMENTED
- Browser Push API + Service Workers
- Real-time push notifications
- Automatic registration on login
- Automatic cleanup on logout

## Changes Made

### 1. **Client: Web Push Implementation**

#### `client/src/lib/pushNotifications.ts` (REWRITTEN)
- Replaced Capacitor imports with browser Push API
- Added `registerWebPush()` - Service worker registration + permission handling
- Added `unregisterWebPush()` - Cleanup on logout
- Added `getWebPushSubscription()` - Get current subscription
- Uses `VITE_VAPID_PUBLIC_KEY` for push service authentication

#### `client/public/sw.js` (NEW)
- Service worker for handling push events
- Listens for incoming push notifications
- Shows browser notifications via `showNotification()`
- Handles notification clicks to navigate or focus window
- Properly closes notifications after interaction

#### `client/src/components/WebAppEnhancements.tsx` (UPDATED)
- Added `WebPushNotificationBridge` component
- Automatically registers for push when user authenticates
- Stores subscription in `localStorage` for recovery
- Registers subscription with server via `registerPushDeviceToken`
- Unregisters on logout
- Works alongside existing app notification feed polling

#### `client/src/App.tsx` (CLEANED UP)
- Removed unused `initPushNotifications()` import
- Removed unused useEffect hook (now handled in components)
- Push registration now delegated to enhancement components

### 2. **Server: Web Push Support**

#### `server/_core/env.ts` (UPDATED)
- Added `VAPID_PUBLIC_KEY` env variable
- Added `VAPID_PRIVATE_KEY` env variable
- Exposed in ENV object for use throughout server

#### `server/_core/webPush.ts` (NEW)
- Implements `sendWebPushNotifications()` function
- Fetches web device registrations from database
- Sends push messages to browser subscription endpoints
- Handles 410/404 (invalid subscription) cleanup
- Includes VAPID token generation for authentication

#### `server/db.ts` (UPDATED)
- Added `getPushDeviceRegistrations(filter)` function
- Filters push registrations by platform (android, ios, web)
- Returns only active (non-disabled) registrations
- Supports filtering for web-specific registrations

## Configuration Required

### Environment Variables (`.env` or deployment)

```bash
# Web Push VAPID Keys (generate with: npx web-push generate-vapid-keys)
VITE_VAPID_PUBLIC_KEY=<public-key-from-web-push>
VAPID_PRIVATE_KEY=<private-key-from-web-push>
```

### Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

This generates a public and private key pair for web push authentication. The public key is safe to expose on the client, the private key must remain secret on the server.

## How It Works

### User Authentication Flow

1. **User logs in** → `WebAppEnhancements` renders
2. **`WebPushNotificationBridge` component initializes**
3. **Service worker registered** (`/sw.js`)
4. **Permission requested** (browser notification popup)
5. **Subscription created** with push service
6. **Subscription sent to server** via `registerPushDeviceToken`
7. **Server stores** in `push_device_registrations` table with platform="web"

### Notification Delivery Flow

1. **Server sends push** to subscribed web clients via `sendWebPushNotifications()`
2. **Push service delivers** to browser's service worker
3. **Service worker** receives `push` event
4. **Browser notification** displayed via `showNotification()`
5. **User clicks** notification
6. **Navigation** to indicated path (if provided)

### User Logout Flow

1. **User logs out** → auth state cleared
2. **`WebPushNotificationBridge` detects logout**
3. **Service worker unregistered**
4. **Subscription disabled** on server

## Database Schema

Existing table `push_device_registrations` now supports:
- `platform` enum: 'android', 'ios', 'web'
- `token`: For web, contains full subscription JSON as string
- `deviceId`: For web, typically `web-{hostname}`
- Indexes on `userId`, `disabledAt`, `lastSeenAt` for efficient queries

## Testing Push Notifications

### Server-side (Node.js)

```typescript
import { sendWebPushNotifications } from './server/_core/webPush';

const result = await sendWebPushNotifications({
  notificationId: "test-123",
  title: "Test Notification",
  body: "This is a test push notification",
  kind: "info",
  path: "/dashboard",
});

console.log(`Sent: ${result.sent}, Skipped: ${result.skipped}`);
```

### Manual Testing

1. Open web app and login
2. Allow browser notification permission
3. Check browser console: `[Push] Web push subscription successful`
4. Check database: `push_device_registrations` should have web entry
5. Send test push from server
6. Browser should display notification

## Compatibility

- **Chrome/Chromium**: Full support
- **Firefox**: Full support (Linux, Windows, Mac)
- **Safari**: Limited support (requires HTTPS + specific setup)
- **Edge**: Full support
- **Mobile browsers**: Varies by browser

Requirements:
- HTTPS (required for production, localhost works for dev)
- Service Worker support
- Push API support
- Notification API support

## Notes

- Android and Web push are now fully integrated
- Database schema already supports both platforms
- Server can send to both Android (FCM) and Web (Web Push API) simultaneously
- Frontend automatically handles platform detection
- No manual configuration needed for end users (automatic on login)
- Graceful degradation: if push fails, app notification feed still works

## Future Enhancements

- iOS push notifications (requires Apple push certificates)
- Push notification history/management UI
- Notification preferences per user
- Bulk push to specific roles/users
- Push analytics and delivery tracking
