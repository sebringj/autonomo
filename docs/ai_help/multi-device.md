# Multi-Device Testing

## Why Multi-Device?

Many features involve multiple users interacting:

| Scenario | User A | User B |
|----------|--------|--------|
| Chat | Sends message | Receives message |
| Notifications | Triggers action | Sees notification |
| Collaboration | Edits document | Sees changes |
| Marketplace | Lists item | Browses/buys |
| Moderation | Reports content | Reviews report |

**Vision-based testing can only see ONE device at a time.**

**Autonomo connects multiple bridges simultaneously.**

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  Autonomo MCP Server                                        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Bridge A    │  │ Bridge B    │  │ Bridge C    │         │
│  │ (User 1)    │  │ (User 2)    │  │ (Admin)     │         │
│  │ Mobile      │  │ Web         │  │ Desktop     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│        │                │                │                  │
└────────┼────────────────┼────────────────┼──────────────────┘
         │                │                │
         ▼                ▼                ▼
    ┌─────────┐      ┌─────────┐      ┌─────────┐
    │ App     │      │ App     │      │ App     │
    │ Instance│      │ Instance│      │ Instance│
    └─────────┘      └─────────┘      └─────────┘
```

## Setting Up Multiple Bridges

### 1. Each App Instance Connects Separately

Each instance of your app connects to the MCP server with a unique bridge ID:

```typescript
// Instance 1 (User A - Mobile)
connectAutonomo({
  url: 'ws://localhost:9876',
  bridgeId: 'user-a-mobile',
  appName: 'MyApp',
  platform: 'mobile'
});

// Instance 2 (User B - Web)
connectAutonomo({
  url: 'ws://localhost:9876',
  bridgeId: 'user-b-web',
  appName: 'MyApp',
  platform: 'web'
});
```

### 2. List Connected Bridges

```
autonomo_list_bridges()

Response:
Connected Applications:

🟢 MyApp Mobile (user-a-mobile)
   Platform: mobile
   Screen: /chat
   Elements: 12

🟢 MyApp Web (user-b-web)
   Platform: web
   Screen: /chat
   Elements: 15
```

### 3. Send Commands to Specific Bridges

```
# User A sends a message
autonomo_send_command(
  bridge="user-a-mobile",
  action="fillIn",
  target="Chat.MessageInput",
  value="Hello from User A!"
)

autonomo_send_command(
  bridge="user-a-mobile",
  action="press",
  target="Chat.SendButton"
)

# Check if User B received it
autonomo_get_state(bridge="user-b-web")
# Should show the new message in elements or data
```

## Cross-Bridge Scenarios

For complex multi-user flows, use `autonomo_cross_bridge_scenario`:

```
autonomo_cross_bridge_scenario(
  scenario=[
    # User A logs in
    {
      bridge: "user-a",
      action: "custom",
      target: "devLogin",
      value: "5551111111",
      description: "User A logs in"
    },
    
    # User B logs in
    {
      bridge: "user-b",
      action: "custom",
      target: "devLogin",
      value: "5552222222",
      description: "User B logs in"
    },
    
    # User A navigates to chat
    {
      bridge: "user-a",
      action: "navigate",
      target: "/chat/room-123",
      description: "User A opens chat room"
    },
    
    # User B navigates to same chat
    {
      bridge: "user-b",
      action: "navigate",
      target: "/chat/room-123",
      description: "User B opens same chat room"
    },
    
    # User A sends message
    {
      bridge: "user-a",
      action: "fillIn",
      target: "Chat.Input",
      value: "Hello User B!",
      description: "User A types message"
    },
    {
      bridge: "user-a",
      action: "press",
      target: "Chat.SendButton",
      description: "User A sends message"
    },
    
    # Wait for message to arrive at User B
    {
      bridge: "user-b",
      action: "waitFor",
      condition: "element:Chat.Message.latest",
      timeout: 5000,
      description: "Wait for message at User B"
    }
  ]
)
```

## Real-World Examples

### Chat Application

```
# Setup: Two users in same chat room
Bridge A: user-alice (mobile)
Bridge B: user-bob (web)

Scenario:
1. [alice] fillIn Chat.Input "Hey Bob!"
2. [alice] press Chat.SendButton
3. [bob] waitFor element:Chat.NewMessage
4. [bob] get_state → verify message content
5. [bob] fillIn Chat.Input "Hey Alice!"
6. [bob] press Chat.SendButton
7. [alice] waitFor element:Chat.NewMessage
8. [alice] get_state → verify message content
```

### Notification Flow

```
# Setup: Admin triggers, User receives
Bridge A: admin (web dashboard)
Bridge B: user (mobile app)

Scenario:
1. [admin] navigate /announcements
2. [admin] press CreateAnnouncementButton
3. [admin] fillIn Title "Important Update"
4. [admin] fillIn Body "Please read this..."
5. [admin] press SendButton
6. [user] waitFor element:NotificationBadge
7. [user] get_state → verify notification count
8. [user] press NotificationBadge
9. [user] get_state → verify announcement visible
```

### Marketplace Transaction

```
# Setup: Seller lists, Buyer purchases
Bridge A: seller (mobile)
Bridge B: buyer (web)

Scenario:
1. [seller] custom createListing "Vintage Chair|50.00"
2. [buyer] navigate /marketplace
3. [buyer] waitFor element:Listing.VintageChair
4. [buyer] press Listing.VintageChair
5. [buyer] press BuyNowButton
6. [buyer] fillIn PaymentCard "4111111111111111"
7. [buyer] press ConfirmPurchase
8. [seller] waitFor element:Notification.Sale
9. [seller] get_state → verify sale notification
```

## Best Practices

### 1. Use Descriptive Bridge IDs
```
✓ Good: "alice-mobile", "bob-web", "admin-dashboard"
✗ Bad: "bridge1", "b2", "test"
```

### 2. Add Wait Steps Between Bridges
Real-time sync isn't instant. Always wait:
```
{bridge: "alice", action: "press", target: "SendButton"},
{bridge: "bob", action: "wait", timeout: 1000},  // Give sync time
{bridge: "bob", action: "waitFor", condition: "element:NewMessage"}
```

### 3. Log Each User's Perspective
When debugging, get state from ALL bridges:
```
autonomo_get_state(bridge="all")
```

### 4. Handle Different Platforms
Same app, different platforms may have different element IDs:
```
Mobile: Chat.SendButton
Web: ChatPanel.SendMessageButton

Consider normalizing IDs across platforms.
```

### 5. Clean Up Between Tests
```
# Reset both users before new test
{bridge: "user-a", action: "custom", target: "logout"},
{bridge: "user-b", action: "custom", target: "logout"},
{bridge: "user-a", action: "custom", target: "clearLocalData"},
{bridge: "user-b", action: "custom", target: "clearLocalData"}
```
