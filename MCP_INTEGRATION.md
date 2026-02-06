# Autonomo Integration Architecture

> **MCP-Native Infrastructure for AI-Powered Testing**
>
> Works with: GitHub Copilot, Claude Code, Cursor, Windsurf, Cody, and any MCP-compatible AI

## Positioning: Enabler, Not Competitor

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI CODING ASSISTANTS                          │
│                                                                  │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│   │ Copilot  │  │ Claude   │  │ Cursor   │  │ Windsurf │  ...  │
│   │          │  │ Code     │  │          │  │          │       │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
│        │             │             │             │              │
│        └─────────────┴──────┬──────┴─────────────┘              │
│                             │                                    │
│                             ▼                                    │
│                    ┌─────────────────┐                          │
│                    │      MCP        │  Model Context Protocol  │
│                    │   (Standard)    │                          │
│                    └────────┬────────┘                          │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUTONOMO MCP SERVER                           │
│                  (100% Local, Your Machine)                     │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                     MCP Tools                            │  │
│   │                                                          │  │
│   │  autonomo/list_bridges    - See connected apps          │  │
│   │  autonomo/get_state       - Get app state               │  │
│   │  autonomo/send_command    - Control the app             │  │
│   │  autonomo/wait_for        - Wait for condition          │  │
│   │  autonomo/run_scenario    - Execute test scenario       │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                    HTTP (localhost only)                        │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Your App      │  │   Your App      │  │   Your App      │
│   (React)       │  │   (Django)      │  │   (Flutter)     │
│                 │  │                 │  │                 │
│   localhost     │  │   localhost     │  │   localhost     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Why MCP?

MCP (Model Context Protocol) is becoming the standard for AI tool integration:

| AI Tool | MCP Support |
|---------|-------------|
| Claude (Desktop & Code) | ✅ Native |
| GitHub Copilot | ✅ VS Code MCP |
| Cursor | ✅ MCP compatible |
| Windsurf | ✅ MCP compatible |
| Continue | ✅ MCP compatible |
| Cody | 🔄 Adding support |

**By building on MCP, Autonomo works with ALL of them automatically.**

## 100% Local Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     YOUR MACHINE                                 │
│                   (Nothing leaves localhost)                    │
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  AI Tool (Copilot/Claude/Cursor)                        │  │
│   │                                                          │  │
│   │  "Test the login flow"                                  │  │
│   │       │                                                  │  │
│   │       ▼                                                  │  │
│   │  MCP call: autonomo/send_command                        │  │
│   └───────┬─────────────────────────────────────────────────┘  │
│           │                                                      │
│           ▼  (unix socket or localhost:9876)                    │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Autonomo MCP Server                                    │  │
│   │                                                          │  │
│   │  • Runs as local process                                │  │
│   │  • No cloud connection                                  │  │
│   │  • No telemetry                                         │  │
│   │  • No auth tokens sent anywhere                         │  │
│   └───────┬─────────────────────────────────────────────────┘  │
│           │                                                      │
│           ▼  (localhost:3000, localhost:8081, etc.)             │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │  Your Applications (dev mode)                           │  │
│   │                                                          │  │
│   │  • React app on :3000                                   │  │
│   │  • React Native on :8081                                │  │
│   │  • Django API on :8000                                  │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ═══════════════════════════════════════════════════════════  │
│   NOTHING LEAVES YOUR MACHINE. EVER.                            │
│   ═══════════════════════════════════════════════════════════  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Guarantees

| Concern | Autonomo Approach |
|---------|-------------------|
| **Data exfiltration** | All localhost, no external connections |
| **Credentials exposure** | Never sent to cloud, stays on machine |
| **Network sniffing** | Unix sockets preferred, localhost fallback |
| **Malicious commands** | Dev-mode only, explicit app opt-in |
| **Audit trail** | Local logs only, you control retention |

### Enterprise Security Add-ons (Paid)

- Command allowlisting (only approved actions)
- Audit log forwarding (to your SIEM)
- SSO for team server mode
- Signed binary verification

## MCP Server Implementation

### Installation

```bash
# Install from GitHub
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server

# Then run
autonomo-mcp
```

### Configuration for AI Tools

#### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "autonomo": {
      "command": "autonomo-mcp",
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

#### VS Code (Copilot MCP)

```json
// .vscode/settings.json
{
  "github.copilot.chat.mcpServers": {
    "autonomo": {
      "command": "autonomo-mcp"
    }
  }
}
```

#### Cursor

```json
// ~/.cursor/mcp.json
{
  "servers": {
    "autonomo": {
      "command": "autonomo-mcp"
    }
  }
}
```

## MCP Tools Specification

### `autonomo/list_bridges`

List all connected applications.

```typescript
// Input
{ }

// Output
{
  "bridges": [
    {
      "id": "react-app-3000",
      "name": "My React App",
      "url": "http://localhost:3000",
      "platform": "web",
      "screen": "dashboard",
      "elements": 24,
      "status": "connected"
    },
    {
      "id": "mobile-app-8081",
      "name": "My Mobile App", 
      "url": "http://localhost:8081",
      "platform": "mobile",
      "screen": "home",
      "elements": 18,
      "status": "connected"
    }
  ]
}
```

### `autonomo/get_state`

Get current state of an application.

```typescript
// Input
{
  "bridge": "react-app-3000"  // or "all" for all bridges
}

// Output
{
  "bridge": "react-app-3000",
  "screen": "checkout",
  "user": {
    "id": "user123",
    "email": "test@example.com",
    "role": "customer"
  },
  "elements": [
    { "id": "Checkout.CartItems", "type": "list", "count": 3 },
    { "id": "Checkout.Total", "type": "text", "value": "$45.99" },
    { "id": "Checkout.CouponInput", "type": "input", "value": "" },
    { "id": "Checkout.SubmitButton", "type": "button", "disabled": false }
  ],
  "data": {
    "cartTotal": 45.99,
    "itemCount": 3
  },
  "errors": []
}
```

### `autonomo/send_command`

Send a command to an application.

```typescript
// Input
{
  "bridge": "react-app-3000",
  "action": "press",           // navigate, press, fillIn, custom
  "target": "Checkout.SubmitButton",
  "value": null,               // for fillIn
  "waitFor": "screen:confirmation"  // optional: wait for condition
}

// Output
{
  "success": true,
  "message": "Button pressed",
  "previousScreen": "checkout",
  "currentScreen": "confirmation",
  "duration": 245
}
```

### `autonomo/wait_for`

Wait for a condition to be true.

```typescript
// Input
{
  "bridge": "react-app-3000",
  "condition": "screen:home",     // or "element:Dashboard.Stats" or "data:isLoaded"
  "timeout": 5000
}

// Output
{
  "success": true,
  "waited": 1234,  // ms
  "state": { ... }
}
```

### `autonomo/run_scenario`

Execute a multi-step test scenario.

```typescript
// Input
{
  "bridge": "react-app-3000",
  "scenario": [
    { "action": "navigate", "target": "/login" },
    { "action": "fillIn", "target": "Login.Email", "value": "test@example.com" },
    { "action": "fillIn", "target": "Login.Password", "value": "password123" },
    { "action": "press", "target": "Login.SubmitButton" },
    { "action": "waitFor", "condition": "screen:dashboard" }
  ],
  "stopOnError": true
}

// Output
{
  "success": true,
  "steps": [
    { "step": 1, "success": true, "duration": 50 },
    { "step": 2, "success": true, "duration": 120 },
    { "step": 3, "success": true, "duration": 85 },
    { "step": 4, "success": true, "duration": 200 },
    { "step": 5, "success": true, "duration": 1500 }
  ],
  "totalDuration": 1955,
  "finalState": { ... }
}
```

## Example Interactions

### GitHub Copilot

```
User: Test the checkout flow in my React app

Copilot: I'll test the checkout flow using the connected React app.

[Uses autonomo/get_state to check current state]

The app is on the home screen. Let me navigate through checkout:

[Uses autonomo/run_scenario with checkout steps]

✅ Checkout flow completed successfully:
1. Added item to cart (245ms)
2. Navigated to checkout (180ms)  
3. Filled shipping info (320ms)
4. Submitted order (1.2s)
5. Reached confirmation screen

Final state: Order #12345 confirmed
```

### Claude Code

```
User: There's a bug in login - can you reproduce it?

Claude: I'll try to reproduce the login issue.

[Uses autonomo/list_bridges]

I see your app is running on localhost:3000. Let me test login:

[Uses autonomo/send_command for each step]

I found the issue! When I enter an email with a "+" character:

- Input: "test+staging@example.com"
- Error: "Invalid email format"

The validation regex doesn't allow "+" characters which are valid in emails.
Looking at your code in src/utils/validation.ts:

[Shows the problematic regex and fix]
```

### Cursor

```
User: @autonomo run the test scenarios in tests/e2e/

Cursor: Running E2E scenarios through Autonomo...

[Uses autonomo/run_scenario for each test file]

Results:
✅ login.scenario.json (2.3s)
✅ checkout.scenario.json (4.1s)
❌ profile-update.scenario.json (failed at step 4)
   Error: Element "Profile.SaveButton" is disabled
   
Looking at the profile screen state, the button is disabled because
the phone number field has a validation error. Let me check the code...
```

## Integration Patterns

### Pattern 1: Ad-hoc Testing

Developer asks AI to test something specific:

```
"Test what happens when I submit an empty form"
"Try logging in with wrong password 3 times"
"Check if the cart persists after refresh"
```

### Pattern 2: Bug Reproduction

AI uses bridge to reproduce reported issues:

```
"The user reported checkout fails with international addresses"
→ AI fills in international address
→ AI finds the specific failure
→ AI suggests fix
```

### Pattern 3: Code + Test Loop

AI writes code and immediately verifies:

```
AI: "I've updated the validation logic. Let me verify it works..."
[Uses autonomo to test the change]
AI: "Confirmed - the fix handles the edge case correctly."
```

### Pattern 4: Regression Detection

AI notices something broke:

```
AI: "While testing your new feature, I noticed the login
     flow now fails at step 3. This might be a regression
     from your recent changes to auth.ts"
```

## Comparison: Why MCP + Local?

| Approach | Autonomo (MCP + Local) | Cloud Testing Service |
|----------|------------------------|----------------------|
| **Privacy** | 100% local | Data sent to cloud |
| **Latency** | <50ms | 200-500ms |
| **Cost** | Free | Per-test pricing |
| **AI Tool Support** | All MCP tools | Custom integration each |
| **Offline** | ✅ Works offline | ❌ Requires internet |
| **Enterprise** | Easy approval | Security review needed |

## Getting Started

### 1. Install Autonomo MCP Server

```bash
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server
```

### 2. Configure Your AI Tool

Add to your AI tool's MCP config (see examples above).

### 3. Add Bridge to Your App

```javascript
// React/Next.js
import { AutonomoProvider } from '@autonomo/react';

function App() {
  return (
    <AutonomoProvider appId="my-app">
      <YourApp />
    </AutonomoProvider>
  );
}
```

```python
# Django/Flask
from autonomo import connect, report_state

connect(app_id="my-api", platform="api")

@app.route('/checkout')
def checkout():
    report_state(screen="checkout", cart_items=3)
    # ...
```

### 4. Start Testing

Ask your AI assistant:

```
"What apps are connected to Autonomo?"
"Test the login flow"
"Fill out the registration form with test data"
```

---

**Autonomo doesn't compete with AI tools. It makes them all better at testing.**
