# Autonomo Overview

## What is Autonomo?

Autonomo enables AI coding assistants to **observe app state**, **drive multiple devices**, and **validate interactions** — all while developing iteratively.

**Tagline**: *AI developing while E2E testing*

## Core Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  AI DEVELOPMENT LOOP                                        │
│                                                             │
│  1. get_state() → See screen, elements, errors              │
│  2. send_command() → Press, fill, navigate                  │
│  3. get_state() → Verify result, check for errors           │
│  4. Fix code if errors → Repeat                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Available Tools

| Tool | Purpose | Example |
|------|---------|---------|
| `autonomo_list_bridges` | See connected apps | Discover what's available |
| `autonomo_get_state` | Get current state | See screen, elements, errors |
| `autonomo_send_command` | Interact with app | Press buttons, fill inputs |
| `autonomo_wait_for` | Wait for condition | Wait for screen or element |
| `autonomo_run_scenario` | Multi-step flow | Login sequence |
| `autonomo_cross_bridge_scenario` | Multi-device flow | User A → User B |
| `autonomo_help` | Get documentation | This content |

## State Object

When you call `get_state`, you receive:

```typescript
{
  screen: string;           // Current screen/route name
  screenHint?: string;      // Hint about how to use this screen
  suggestedFlow?: [{        // Suggested sequence of actions
    action: string;         // Action type: press, fillIn, navigate, custom
    target: string;         // Element ID or route
    value?: string;         // Value for fillIn/custom
    description?: string;   // Human-readable step description
  }];
  user?: {                  // Logged-in user info
    id: string;
    email?: string;
  };
  elements: [{              // Interactive elements
    id: string;             // Element ID for commands
    type: "tap" | "input" | "select" | "custom";
    label?: string;         // Human-readable label
    hint?: string;          // Usage hint
    disabled?: boolean;     // Is it interactive?
    value?: string;         // Current value (inputs)
  }];
  customActions: string[];  // Available custom actions
  errors: string[];         // App errors (API, validation)
  renderErrors: string[];   // React/render errors
  data?: object;            // Custom app data
}
```

## Command Actions

| Action | Target | Value | Description |
|--------|--------|-------|-------------|
| `navigate` | Screen name | — | Go to screen (e.g., "/home") |
| `press` | Element ID | — | Tap/click element |
| `fillIn` | Element ID | Text | Enter text in input |
| `fill` | Element ID | Text | Same as fillIn |
| `submit` | Element ID | — | Press Enter on input |
| `custom` | Action name | Optional param | Run custom action |

## Critical Rules

### 1. Always Get State First
```
✗ Wrong: Immediately try to press a button
✓ Right: get_state → find element ID → press
```

### 2. Elements Must Be Registered
Elements only appear if the app explicitly registers them:
```typescript
// App must do this:
autonomoRegister("Login.Submit", "tap", handleSubmit);

// Just having testID is NOT enough:
<Button testID="submit" />  // Won't appear in elements!
```

### 3. Check State After Commands
Commands execute asynchronously. Errors appear in the NEXT get_state:
```
send_command(press, "Submit")  // Returns success (delivery confirmed)
get_state()                    // May show errors array populated!
```

### 4. Use Custom Actions for Complex Flows
Don't click through 5 screens to log in. Register a custom action:
```
send_command(action="custom", target="devLogin", value="5551234567")
```

## Quick Start Example

```
# 1. See what's connected
autonomo_list_bridges()
→ "myapp" bridge connected, screen: "/login"

# 2. Get current state
autonomo_get_state(bridge="myapp")
→ elements: [Login.PhoneInput, Login.SubmitButton]

# 3. Fill phone number
autonomo_send_command(bridge="myapp", action="fillIn", target="Login.PhoneInput", value="5551234567")

# 4. Press submit
autonomo_send_command(bridge="myapp", action="press", target="Login.SubmitButton")

# 5. Verify result
autonomo_get_state(bridge="myapp")
→ screen: "/otp", elements: [OTP.CodeInput, OTP.VerifyButton]
```
