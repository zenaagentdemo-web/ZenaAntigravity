# Push Notification System

## Overview

The push notification system enables real-time notifications to be delivered to users' devices through the Web Push API. This allows the Zena PWA to notify agents about important events even when the app is not actively open.

## Architecture

### Components

1. **NotificationService** (`notification.service.ts`)
   - Manages push subscriptions
   - Sends notifications to subscribed devices
   - Handles notification preferences
   - Integrates with Web Push API

2. **NotificationController** (`notification.controller.ts`)
   - HTTP endpoints for subscription management
   - Preference management endpoints
   - VAPID public key distribution

3. **Database Models**
   - `PushSubscription`: Stores device push subscriptions
   - `NotificationPreferences`: Stores user notification preferences

## Setup

### 1. Generate VAPID Keys

VAPID (Voluntary Application Server Identification) keys are required for Web Push. Generate them once:

```bash
cd packages/backend
node -e "const webpush = require('web-push'); console.log(webpush.generateVAPIDKeys());"
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```env
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:your-email@example.com
```

### 3. Run Database Migration

```bash
npm run db:push
```

## API Endpoints

### Get VAPID Public Key
```
GET /api/notifications/vapid-public-key
```

Returns the VAPID public key needed for client-side subscription.

**Response:**
```json
{
  "publicKey": "BN..."
}
```

### Register Push Subscription
```
POST /api/notifications/register
Authorization: Bearer <token>
```

Registers a new push subscription for the authenticated user.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "BG...",
    "auth": "Ab..."
  }
}
```

**Response:**
```json
{
  "message": "Push subscription registered successfully"
}
```

### Unregister Push Subscription
```
DELETE /api/notifications/register
Authorization: Bearer <token>
```

Unregisters a push subscription.

**Request Body:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/..."
}
```

### Get Notification Preferences
```
GET /api/notifications/preferences
Authorization: Bearer <token>
```

Returns the user's notification preferences.

**Response:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "highPriorityThreads": true,
  "riskDeals": true,
  "calendarReminders": true,
  "taskReminders": true,
  "newThreads": false,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Update Notification Preferences
```
PUT /api/notifications/preferences
Authorization: Bearer <token>
```

Updates the user's notification preferences.

**Request Body:**
```json
{
  "highPriorityThreads": true,
  "riskDeals": true,
  "calendarReminders": false,
  "taskReminders": true,
  "newThreads": false
}
```

## Notification Types

### 1. High-Priority Thread Notifications

Triggered when a thread requires immediate attention from the agent.

**Trigger:** `notificationService.notifyHighPriorityThread(userId, threadId, subject)`

**Payload:**
```json
{
  "title": "High Priority Thread",
  "body": "Action required: [subject]",
  "tag": "thread-[threadId]",
  "data": {
    "type": "high_priority_thread",
    "threadId": "uuid"
  },
  "requireInteraction": true
}
```

### 2. Risk Deal Notifications

Triggered when a deal is flagged as at risk.

**Trigger:** `notificationService.notifyRiskDeal(userId, dealId, propertyAddress, riskReason)`

**Payload:**
```json
{
  "title": "Deal At Risk",
  "body": "[propertyAddress]: [riskReason]",
  "tag": "deal-risk-[dealId]",
  "data": {
    "type": "risk_deal",
    "dealId": "uuid"
  },
  "requireInteraction": true
}
```

### 3. Calendar Event Reminders

Triggered before a calendar event starts.

**Trigger:** `notificationService.notifyCalendarReminder(userId, eventId, eventTitle, eventTime)`

**Payload:**
```json
{
  "title": "Upcoming Event",
  "body": "[eventTitle] at [time]",
  "tag": "calendar-[eventId]",
  "data": {
    "type": "calendar_reminder",
    "eventId": "uuid"
  }
}
```

### 4. Task Reminders

Triggered when a task is due or overdue.

**Trigger:** `notificationService.notifyTaskReminder(userId, taskId, taskLabel, dueDate)`

**Payload:**
```json
{
  "title": "Task Due",
  "body": "[taskLabel] - Due [date]",
  "tag": "task-[taskId]",
  "data": {
    "type": "task_reminder",
    "taskId": "uuid"
  }
}
```

### 5. New Thread Notifications

Triggered when a new thread is detected (optional, disabled by default).

**Trigger:** `notificationService.notifyNewThread(userId, threadId, subject, sender)`

**Payload:**
```json
{
  "title": "New Thread",
  "body": "[sender]: [subject]",
  "tag": "thread-new-[threadId]",
  "data": {
    "type": "new_thread",
    "threadId": "uuid"
  }
}
```

## Integration Points

### Triggering Notifications

Notifications should be triggered from the following services:

1. **Thread Classification Service** (`ai-processing.service.ts`)
   - Call `notifyHighPriorityThread()` when a high-priority thread is detected

2. **Risk Analysis Service** (`risk-analysis.service.ts`)
   - Call `notifyRiskDeal()` when a deal is flagged as at risk

3. **Calendar Sync Service** (`calendar-sync-engine.service.ts`)
   - Schedule `notifyCalendarReminder()` for upcoming events

4. **Task Service** (`task.service.ts`)
   - Schedule `notifyTaskReminder()` for due/overdue tasks

5. **Email Sync Service** (`sync-engine.service.ts`)
   - Call `notifyNewThread()` when new threads are synced (if enabled)

### Example Integration

```typescript
import { notificationService } from './notification.service.js';

// In risk-analysis.service.ts
async function flagDealAsRisk(dealId: string, riskReason: string) {
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { 
      riskLevel: 'high',
      riskFlags: { push: riskReason }
    },
    include: { property: true }
  });

  // Send notification
  await notificationService.notifyRiskDeal(
    deal.userId,
    deal.id,
    deal.property?.address || 'Unknown Property',
    riskReason
  );
}
```

## Client-Side Implementation

### 1. Request Notification Permission

```javascript
const permission = await Notification.requestPermission();
if (permission === 'granted') {
  // Proceed with subscription
}
```

### 2. Subscribe to Push Notifications

```javascript
// Get VAPID public key
const response = await fetch('/api/notifications/vapid-public-key');
const { publicKey } = await response.json();

// Register service worker
const registration = await navigator.serviceWorker.register('/sw.js');

// Subscribe to push
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicKey)
});

// Send subscription to server
await fetch('/api/notifications/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(subscription.toJSON())
});
```

### 3. Handle Push Events in Service Worker

```javascript
// In sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      requireInteraction: data.requireInteraction
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const data = event.notification.data;
  let url = '/';
  
  // Navigate based on notification type
  switch (data.type) {
    case 'high_priority_thread':
    case 'new_thread':
      url = `/threads/${data.threadId}`;
      break;
    case 'risk_deal':
      url = `/deals/${data.dealId}`;
      break;
    case 'calendar_reminder':
      url = `/calendar/${data.eventId}`;
      break;
    case 'task_reminder':
      url = `/tasks/${data.taskId}`;
      break;
  }
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

## Preference Management

Users can control which notifications they receive through their preferences:

- **highPriorityThreads**: Notifications for threads requiring immediate attention (default: enabled)
- **riskDeals**: Notifications for deals flagged as at risk (default: enabled)
- **calendarReminders**: Reminders for upcoming calendar events (default: enabled)
- **taskReminders**: Reminders for due/overdue tasks (default: enabled)
- **newThreads**: Notifications for all new threads (default: disabled)

The notification service automatically checks preferences before sending each notification.

## Error Handling

### Invalid Subscriptions

When a push subscription becomes invalid (user uninstalled PWA, cleared data, etc.), the service automatically removes it from the database when receiving a 410 (Gone) or 404 (Not Found) status code.

### Missing VAPID Keys

If VAPID keys are not configured, the service will log warnings but won't crash. The `/vapid-public-key` endpoint will return a 500 error.

### Network Failures

Push notification failures are logged but don't throw errors to prevent disrupting other operations. Failed notifications are not retried automatically.

## Testing

### Manual Testing

1. Generate VAPID keys and configure environment
2. Start the backend server
3. Use a tool like Postman to:
   - Get the VAPID public key
   - Register a test subscription
   - Trigger notifications manually

### Property-Based Testing

See `notification.property.test.ts` for property-based tests that verify:
- Notification preferences are respected
- Subscriptions are properly managed
- Notifications are delivered to all user devices

## Security Considerations

1. **VAPID Keys**: Keep private keys secure and never expose them to clients
2. **Authentication**: All subscription endpoints require authentication
3. **Subscription Validation**: Validate subscription format before storing
4. **Rate Limiting**: Consider implementing rate limits to prevent notification spam
5. **User Control**: Always respect user preferences and provide easy opt-out

## Performance Considerations

1. **Batch Notifications**: When sending to multiple users, use Promise.all() for parallel delivery
2. **Subscription Cleanup**: Invalid subscriptions are automatically removed
3. **Database Indexes**: Indexes on userId and endpoint ensure fast lookups
4. **Async Operations**: All notification operations are non-blocking

## Future Enhancements

1. **Notification History**: Store sent notifications for user review
2. **Quiet Hours**: Respect user-defined quiet hours
3. **Notification Grouping**: Group related notifications
4. **Rich Notifications**: Add images and action buttons
5. **Analytics**: Track notification delivery and engagement rates
