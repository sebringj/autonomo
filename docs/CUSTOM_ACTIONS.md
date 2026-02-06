# Custom Actions Guide

Custom actions are a powerful feature in Autonomo that let you define **fast-path operations** for complex interactions that would otherwise require multiple slow, sequential commands.

## Why Custom Actions Matter

### The Problem

Some UI interactions require multiple steps that are:
- **Slow** - Each command has network latency
- **Flaky** - Timing issues between steps cause failures
- **Verbose** - The AI must send many commands for one logical action

**Example: OTP Entry**

Without custom actions, entering a 6-digit OTP requires:
```
fillIn("OTP.Input0", "1") → wait → 
fillIn("OTP.Input1", "1") → wait → 
fillIn("OTP.Input2", "1") → wait → 
fillIn("OTP.Input3", "1") → wait → 
fillIn("OTP.Input4", "1") → wait → 
fillIn("OTP.Input5", "1")
```

That's 6 commands with waits between each. Timing issues frequently cause digits to be missed or duplicated.

### The Solution

With a custom action:
```
custom("fillOtp", "111111")
```

One command. Atomic. No timing issues. The component handles all the internal state updates at once.

## How Custom Actions Work

Custom actions are registered by your application components and exposed to the AI through Autonomo's registry.

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   AI Agent      │ ───► │  Autonomo        │ ───► │  Your App       │
│                 │      │  MCP Server      │      │                 │
│ "fillOtp 111111"│      │                  │      │ customActions   │
│                 │ ◄─── │                  │ ◄─── │   .execute()    │
│ {success: true} │      │                  │      │                 │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

## Registering Custom Actions

### JavaScript/TypeScript (React)

```typescript
import { registerCustomAction } from '@autonomo/react';
// or from '@autonomo/core'

// In your component:
useEffect(() => {
  const unregister = registerCustomAction('fillOtp', async (value) => {
    if (!value || value.length !== 6) {
      return { success: false, error: 'OTP must be 6 digits' };
    }
    
    // Set all digits at once
    setOtpDigits(value.split(''));
    
    return { success: true, message: `OTP set to ${value}` };
  });
  
  return () => unregister();
}, []);
```

### React Hook Version

```typescript
import { useCustomAction } from '@autonomo/react';

function OtpInput() {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  
  // Auto-registers on mount, unregisters on unmount
  useCustomAction('fillOtp', async (value) => {
    if (!value || value.length !== 6) {
      return { success: false, error: 'OTP must be 6 digits' };
    }
    setDigits(value.split(''));
    return { success: true, message: `OTP set to ${value}` };
  });
  
  return (/* render digits */);
}
```

### Python

```python
from autonomo import register_custom_action

def fill_otp(value: str):
    if not value or len(value) != 6:
        return {"success": False, "error": "OTP must be 6 digits"}
    
    # Set OTP in your app
    app.set_otp(value)
    
    return {"success": True, "message": f"OTP set to {value}"}

unregister = register_custom_action("fillOtp", fill_otp)
```

### Swift

```swift
import Autonomo

Autonomo.shared.registerCustomAction("fillOtp") { value in
    guard let code = value, code.count == 6 else {
        return ActionResult(success: false, error: "OTP must be 6 digits")
    }
    
    // Set OTP in your app
    OTPManager.shared.setCode(code)
    
    return ActionResult(success: true, message: "OTP set to \(code)")
}
```

### Flutter/Dart

```dart
import 'package:autonomo_flutter/autonomo_flutter.dart';

Autonomo.registerCustomAction('fillOtp', (value) async {
  if (value == null || value.length != 6) {
    return ActionResult(success: false, error: 'OTP must be 6 digits');
  }
  
  // Set OTP in your app
  otpController.setText(value);
  
  return ActionResult(success: true, message: 'OTP set to $value');
});
```

## ActionResult Interface

All custom actions return an `ActionResult`:

```typescript
interface ActionResult {
  success: boolean;      // Did the action succeed?
  message?: string;      // Success message for AI context
  error?: string;        // Error message if failed
  data?: unknown;        // Optional data to return
}
```

## Common Use Cases

### 1. OTP/PIN Entry
```typescript
registerCustomAction('fillOtp', (code) => {
  setOtpDigits(code.split(''));
  return { success: true };
});
```

### 2. Form Fill (Multiple Fields)
```typescript
registerCustomAction('fillLoginForm', (json) => {
  const { email, password } = JSON.parse(json);
  setEmail(email);
  setPassword(password);
  return { success: true, message: 'Login form filled' };
});
```

### 3. Dev-Mode Authentication
```typescript
registerCustomAction('devLogin', async (phone) => {
  await signInWithOtp({ phone, token: '111111' });
  return { success: true, message: `Logged in as ${phone}` };
});
```

### 4. State Reset
```typescript
registerCustomAction('resetAppState', () => {
  clearAllStores();
  navigation.reset({ routes: [{ name: 'Home' }] });
  return { success: true, message: 'App state reset' };
});
```

### 5. Complex Gestures
```typescript
registerCustomAction('swipeToDelete', (itemId) => {
  performSwipeGesture(itemId, 'left', 200);
  return { success: true, message: `Swiped ${itemId}` };
});
```

### 6. Data Seeding
```typescript
registerCustomAction('seedTestData', async (scenario) => {
  await seedDatabase(scenario);
  return { success: true, message: `Seeded: ${scenario}` };
});
```

## How AI Uses Custom Actions

When the AI requests state, it receives a list of available custom actions:

```json
{
  "screen": "login-otp",
  "elements": [
    { "id": "OTP.Input0", "type": "input" },
    { "id": "OTP.Input1", "type": "input" },
    ...
  ],
  "customActions": ["fillOtp", "devLogin", "resetAppState"]
}
```

The AI can then invoke custom actions:

```json
{ "action": "custom", "target": "fillOtp", "value": "111111" }
```

Or with the shorthand (action name directly):

```json
{ "action": "fillOtp", "value": "111111" }
```

## Best Practices

### 1. Name Actions Clearly
```typescript
// Good - describes what it does
registerCustomAction('fillOtp', ...)
registerCustomAction('devLoginWithPhone', ...)
registerCustomAction('clearCartAndCheckout', ...)

// Bad - vague or unclear
registerCustomAction('action1', ...)
registerCustomAction('doStuff', ...)
```

### 2. Validate Inputs
```typescript
registerCustomAction('fillOtp', (value) => {
  if (!value) {
    return { success: false, error: 'Value required' };
  }
  if (!/^\d{6}$/.test(value)) {
    return { success: false, error: 'OTP must be exactly 6 digits' };
  }
  // ... proceed
});
```

### 3. Return Meaningful Messages
```typescript
// Good - AI knows what happened
return { success: true, message: `Set OTP to ${value}, ready for verification` };

// Bad - no context
return { success: true };
```

### 4. Include Hints in Registration
```typescript
// The hint appears in state, helping AI understand when to use it
registerTapHandler('OTP.Input0', onTap, false);
// Autonomo's ELEMENT_HINTS can provide:
// hint: "FAST PATH: Use custom action 'fillOtp' instead of filling each digit"
```

### 5. Unregister on Unmount
```typescript
useEffect(() => {
  const unregister = registerCustomAction('myAction', handler);
  return () => unregister();  // Clean up!
}, []);
```

### 6. Keep Actions Atomic
Custom actions should complete fully or fail cleanly. Avoid partial state changes on failure.

## Debugging Custom Actions

### Check Registration
```bash
# Ask AI to list available actions
"What custom actions are available?"

# Or check state directly
curl http://localhost:8080/state | jq '.customActions'
```

### Test Manually
```bash
curl -X POST http://localhost:8080/command \
  -H "Content-Type: application/json" \
  -d '{"action": "fillOtp", "value": "111111"}'
```

### Log in Handler
```typescript
registerCustomAction('fillOtp', (value) => {
  console.log('[CustomAction] fillOtp called with:', value);
  // ...
});
```

## Summary

Custom actions transform Autonomo from a simple element clicker into a powerful testing tool that understands your application's domain:

| Without Custom Actions | With Custom Actions |
|------------------------|---------------------|
| 6 commands for OTP | 1 command |
| Timing-dependent | Atomic |
| Generic interactions | Domain-specific operations |
| AI guesses at flows | App guides AI with fast-paths |

**When to create a custom action:**
- Multi-step interactions that fail due to timing
- Operations that require internal state manipulation
- Dev-mode shortcuts (test login, data seeding)
- Complex gestures or animations
- Anything that would take 3+ sequential commands

Custom actions are how you teach Autonomo the "verbs" of your application.
