# Real-Time / WebSockets

> **Purpose**: Test WebSocket and real-time features locally.

---

## Supabase Realtime (Local)

Included with `supabase start` — works out of the box.

```typescript
// Subscribe to changes
const channel = supabase
  .channel('room1')
  .on('broadcast', { event: 'message' }, (payload) => {
    console.log('Received:', payload);
  })
  .subscribe();
```

---

## Soketi (Pusher-Compatible)

```bash
# Soketi is a Pusher-compatible server
docker run -d -p 6001:6001 quay.io/soketi/soketi:latest
```

```typescript
// Point Pusher client to local Soketi
const pusher = new Pusher('app-key', {
  wsHost: 'localhost',
  wsPort: 6001,
  forceTLS: false,
  cluster: 'local'
});
```

---

## Ably (Sandbox)

Ably provides free sandbox keys for development.

---

## Custom Action: Broadcast Message

```typescript
autonomoRegisterCustomAction('broadcast', async (message) => {
  await supabase.channel('test').send({
    type: 'broadcast',
    event: 'message',
    payload: JSON.parse(message),
  });
});
```
