# Test Bridge Architecture

> Deep dive into how AI test bridges work and how to implement them

## Overview

A Test Bridge creates a bidirectional communication channel between an AI agent (like GitHub Copilot) and a running application. The bridge runs **only in development mode** and provides semantic control over the application.

## Core Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         AI AGENT LAYER                              │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    LLM (Claude, GPT, etc.)                   │  │
│  │                                                              │  │
│  │   "User wants to test login flow"                           │  │
│  │         │                                                    │  │
│  │         ▼                                                    │  │
│  │   Plan: 1. Navigate to /login                               │  │
│  │         2. Fill phone number                                │  │
│  │         3. Submit                                            │  │
│  │         4. Fill OTP                                          │  │
│  │         5. Verify home screen                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    Tool Invocation Layer                     │  │
│  │                    (VS Code Extension)                       │  │
│  │                                                              │  │
│  │   run_in_terminal("curl -X POST .../api/test-command ...")  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼  HTTP
┌────────────────────────────────────────────────────────────────────┐
│                         BRIDGE LAYER                                │
│                                                                     │
│  ┌──────────────────────┐      ┌───────────────────────┐          │
│  │   Command Endpoint   │      │   Result Endpoint     │          │
│  │  POST /test-command  │      │   GET /test-result    │          │
│  └──────────┬───────────┘      └───────────┬───────────┘          │
│             │                              │                        │
│             ▼                              │                        │
│  ┌──────────────────────┐                 │                        │
│  │    Command Queue     │─────────────────┘                        │
│  │   (single command    │                                          │
│  │    at a time)        │                                          │
│  └──────────┬───────────┘                                          │
│             │                                                       │
│             ▼                                                       │
│  ┌──────────────────────┐      ┌───────────────────────┐          │
│  │   Command Processor  │◄────►│   Element Registry    │          │
│  │   (in-app polling)   │      │   (testID → handler)  │          │
│  └──────────────────────┘      └───────────────────────┘          │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼  Direct Calls
┌────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                              │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │   Screens   │  │   Inputs    │  │   Buttons   │  │  Actions  │ │
│  │             │  │             │  │             │  │           │ │
│  │  /login     │  │ PhoneInput  │  │ SubmitBtn   │  │ devLogin  │ │
│  │  /home      │  │ OtpInputs   │  │ CancelBtn   │  │ switchRole│ │
│  │  /settings  │  │ EmailInput  │  │ AddButton   │  │ clearData │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

## Command Types

### Navigation Commands

Move to different screens/routes:

```json
{
  "action": "navigate",
  "target": "/settings/profile"
}
```

Handled by router (expo-router, react-router, etc.):

```typescript
case 'navigate':
  router.push(command.target);
  return { success: true, screen: command.target };
```

### Press/Tap Commands

Trigger button clicks, link taps, etc.:

```json
{
  "action": "press",
  "target": "Settings.SaveButton"
}
```

Requires element registration:

```typescript
// In Pressable/Button component
registerTapHandler(testID, () => {
  onPress?.();
});
```

### Fill Commands

Set input values:

```json
{
  "action": "fillIn",
  "target": "Registration.EmailInput",
  "value": "user@example.com"
}
```

Requires input registration:

```typescript
// In TextInput component
registerFillHandler(testID, (value) => {
  setInputValue(value);
  onChangeText?.(value);
});
```

### Custom Actions

Application-specific fast paths:

```json
{
  "action": "devLogin",
  "target": "5551234567"
}
```

```json
{
  "action": "switchRole",
  "target": "league_manager"
}
```

```json
{
  "action": "getErrors"
}
```

### State Query

Get current application state (always returned with results):

```json
{
  "screen": "home",
  "isLoggedIn": true,
  "activeRole": "parent",
  "userId": "abc123",
  "elements": [
    "Home.FeedTab",
    "Home.ProfileTab",
    "Feed.PostInput",
    "Feed.Post.1.LikeButton"
  ],
  "customActions": ["devLogin", "switchRole", "fillOtp"],
  "errors": [],
  "timestamp": 1706745600000
}
```

## Element Registry Pattern

### Registration

UI components self-register when they have a testID:

```typescript
// Pressable wrapper
function TestablePressable({ testID, onPress, children, ...props }) {
  useEffect(() => {
    if (__DEV__ && testID) {
      return registerTapHandler(testID, () => onPress?.());
    }
  }, [testID, onPress]);
  
  return <Pressable testID={testID} onPress={onPress} {...props}>{children}</Pressable>;
}
```

### Registry Data Structure

```typescript
type ElementHandler = {
  type: 'tap' | 'fillIn';
  handler: (value?: string) => void;
  disabled?: boolean;
  getValue?: () => string;        // For inputs
  onSubmit?: () => void;          // For input submission
  hint?: string;                  // Usage hint for AI
};

const elementHandlers = new Map<string, ElementHandler>();
```

### Automatic Registration

Wrap standard components to auto-register:

```typescript
// In ui.tsx - wrappers for all testable components
export function Pressable({ testID, ...props }) {
  useEffect(() => {
    if (__DEV__ && testID) {
      return registerTapHandler(testID, () => props.onPress?.());
    }
  }, [testID]);
  
  return <RNPressable testID={testID} {...props} />;
}

export function TextInput({ testID, ...props }) {
  useEffect(() => {
    if (__DEV__ && testID) {
      return registerFillHandler(testID, (v) => props.onChangeText?.(v));
    }
  }, [testID]);
  
  return <RNTextInput testID={testID} {...props} />;
}
```

## Communication Patterns

### HTTP Polling (Simple)

```
AI                          Bridge                        App
 │                            │                            │
 │ ─── POST /test-command ──► │                            │
 │     {action, target}       │                            │
 │ ◄─── 202 Accepted ──────── │                            │
 │                            │ ─── queue command ───────► │
 │                            │                            │
 │ ... wait ~500ms ...        │                            │
 │                            │                            │
 │                            │ ◄─── execute & result ──── │
 │                            │                            │
 │ ─── GET /test-result ────► │                            │
 │ ◄─── {result, state} ───── │                            │
```

### WebSocket (Optimal)

```
AI                          Bridge                        App
 │                            │                            │
 │ ══ WebSocket connect ════► │                            │
 │                            │                            │
 │ ─── send {action} ───────► │                            │
 │                            │ ─── instant delivery ────► │
 │                            │ ◄─── execute & result ──── │
 │ ◄─── recv {result} ─────── │                            │
 │                            │                            │
 │ ... no polling delay ...   │                            │
```

## Platform Implementations

### React Native (Expo)

```typescript
// RemoteTestBridge.tsx
export function RemoteTestBridge({ children }) {
  useEffect(() => {
    if (!__DEV__) return;
    
    // Connect via WebSocket for real-time commands
    const ws = new WebSocket(WS_URL);
    
    ws.onmessage = async (event) => {
      const command = JSON.parse(event.data);
      const result = await executeCommand(command);
      ws.send(JSON.stringify(result));
    };
    
    return () => ws.close();
  }, []);
  
  return <>{children}</>;
}
```

### Web (Preact/React)

```typescript
// WebTestBridge.tsx
export default function WebTestBridge() {
  useEffect(() => {
    // Poll for commands
    const poll = async () => {
      const res = await fetch('/api/web-test-command');
      if (res.ok) {
        const cmd = await res.json();
        const result = await executeCommand(cmd);
        await fetch('/api/web-test-result', {
          method: 'POST',
          body: JSON.stringify(result)
        });
      }
    };
    
    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, []);
  
  return null;
}
```

### Desktop (Electron)

```typescript
// testBridge.ts (main process)
import { ipcMain } from 'electron';

ipcMain.handle('test-command', async (event, command) => {
  // Route to renderer process
  mainWindow.webContents.send('execute-command', command);
  
  return new Promise(resolve => {
    ipcMain.once('command-result', (e, result) => resolve(result));
  });
});
```

## Server-Side Endpoints

### Command Endpoint

```typescript
// POST /api/test-command
let pendingCommand = null;
let lastResult = null;

export async function POST(req: Request) {
  const command = await req.json();
  pendingCommand = command;
  return new Response(null, { status: 202 });
}

// GET /api/test-command (for app polling)
export async function GET() {
  if (pendingCommand) {
    const cmd = pendingCommand;
    pendingCommand = null;
    return Response.json(cmd);
  }
  return new Response(null, { status: 204 });
}
```

### Result Endpoint

```typescript
// POST /api/test-result (from app)
export async function POST(req: Request) {
  lastResult = await req.json();
  return new Response(null, { status: 200 });
}

// GET /api/test-result (for AI)
export async function GET() {
  return Response.json(lastResult || { screen: 'unknown', timestamp: 0 });
}
```

## Error Handling

### Error Collection

Track and expose errors for AI diagnosis:

```typescript
const errors: Error[] = [];
const renderErrors: string[] = [];
const logs: string[] = [];

// Capture console errors
const originalError = console.error;
console.error = (...args) => {
  logs.push(args.join(' '));
  originalError(...args);
};

// Capture unhandled errors
ErrorUtils.setGlobalHandler((error) => {
  errors.push(error);
});
```

### Error in Results

```json
{
  "screen": "checkout",
  "success": false,
  "errors": [
    "TypeError: Cannot read property 'price' of undefined",
    "at CartItem (cart.tsx:45)"
  ],
  "renderErrors": [
    "Warning: Each child in a list should have a unique key"
  ]
}
```

## Security Considerations

### DEV-Only

```typescript
// Always guard bridge code
if (!__DEV__) {
  // Return no-op or early exit
  return;
}
```

### No Production Builds

```typescript
// In bridge component
export const RemoteTestBridge = __DEV__ 
  ? RemoteTestBridgeDev 
  : ({ children }) => <>{children}</>;
```

### Localhost Only

```typescript
// Reject non-localhost in endpoint
const host = req.headers.get('host') || '';
if (!host.startsWith('localhost')) {
  return new Response('Forbidden', { status: 403 });
}
```

## Best Practices

### 1. Semantic TestIDs

```typescript
// ✅ Good - hierarchical, meaningful
testID="Schedule.CreateEvent.TitleInput"
testID="Profile.Settings.NotificationsToggle"

// ❌ Bad - generic, unstable
testID="input1"
testID="btn-submit"
```

### 2. Stable Element Registration

```typescript
// ✅ Good - stable across re-renders
useEffect(() => {
  return registerTapHandler(testID, handlerRef.current);
}, [testID]); // Only testID, not handler

// ❌ Bad - re-registers on every render
useEffect(() => {
  return registerTapHandler(testID, handler);
}, [testID, handler]);
```

### 3. Clear State Reporting

```typescript
// ✅ Good - rich, structured state
{
  screen: "checkout",
  cartItems: 3,
  total: "$45.00",
  canCheckout: true,
  elements: ["Cart.CheckoutButton", "Cart.ClearButton"]
}

// ❌ Bad - minimal state
{
  screen: "checkout"
}
```

### 4. Custom Actions for Complex Flows

```typescript
// ✅ Good - fast path for OTP
registerCustomAction('fillOtp', (code) => {
  setOtpDigits(code.split(''));
  return { success: true };
});

// Usage: {"action": "fillOtp", "value": "111111"}
// vs 6 separate fillIn calls
```

## Debugging

### Bridge Not Responding

1. Check app is running in DEV mode
2. Verify localhost connectivity
3. Check for WebSocket/HTTP errors in console
4. Ensure bridge component is mounted

### Commands Not Executing

1. Verify testID matches exactly (case-sensitive)
2. Check element is registered (look at `elements` in state)
3. Ensure element isn't disabled
4. Check for async timing issues

### State Not Updating

1. Trigger state report manually
2. Check for component unmounting
3. Verify state is being collected correctly
4. Look for infinite render loops
