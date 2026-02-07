# Push Notifications Testing

> **Purpose**: Test push notifications without real device tokens.

---

## Expo Push Notifications (Local)

```typescript
import * as Notifications from 'expo-notifications';

// Custom action to simulate push
autonomoRegisterCustomAction('simulatePush', async (payload) => {
  await Notifications.scheduleNotificationAsync({
    content: JSON.parse(payload),
    trigger: null, // Immediate
  });
});
```

**Usage**:
```
autonomo_send_command(
  bridge="myapp", 
  action="custom", 
  target="simulatePush", 
  value='{"title":"Test","body":"Hello!"}'
)
```

---

## Firebase FCM Emulator

```bash
firebase emulators:start --only functions
```

---

## OneSignal Testing

OneSignal provides test users and a testing API for development.

---

## Custom Action: Check Notification State

```typescript
autonomoRegisterCustomAction('getNotificationCount', async () => {
  const notifications = await Notifications.getPresentedNotificationsAsync();
  return { count: notifications.length };
});
```
