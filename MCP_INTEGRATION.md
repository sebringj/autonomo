# Autonomo Integration Architecture

> **MCP-Native Infrastructure for Real-Time Visual Development**
>
> Works with: GitHub Copilot, Claude Code, Cursor, Windsurf, Cody, and any MCP-compatible AI

## Positioning: The Bridge, Not the Competitor

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
│   │  autonomo/help            - Get documentation           │  │
│   │                                                          │  │
│   └─────────────────────────────────────────────────────────┘  │
│                             │                                    │
│                    WebSocket (localhost only)                   │
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

MCP (Model Context Protocol) is the standard for giving AI tools new capabilities. Autonomo uses it to give your AI assistant live eyes and hands on the running app:

| AI Tool | MCP Support |
|---------|-------------|
| Claude (Desktop & Code) | ✅ Native |
| GitHub Copilot | ✅ VS Code MCP |
| Cursor | ✅ MCP compatible |
| Windsurf | ✅ MCP compatible |
| Continue | ✅ MCP compatible |
| Cody | 🔄 Adding support |

**By building on MCP, Autonomo gives all of them eyes automatically.**

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

### `autonomo/help`

Get comprehensive documentation and guides. Fetches content directly from GitHub for always up-to-date information.

```typescript
// Input
{
  "topic": "overview"  // optional - omit for table of contents
}

// Available topics:
// Top-level:
//   "overview"        - Quick start and core concepts
//   "elements"        - How element registration works (CRITICAL)
//   "custom-actions"  - Bypassing OTP/OAuth and creating shortcuts
//   "multi-device"    - Testing across multiple devices/users
//   "troubleshooting" - Common issues and solutions
//   "scenarios"       - Real-world testing patterns
//   "best-practices"  - Tips for reliable testing
//
// Local development (sub-topics for focused context):
//   "local-development"              - Index with decision tree
//   "local-development/auth-bypass"  - Skip OTP/OAuth flows
//   "local-development/payments"     - Stripe CLI, test cards
//   "local-development/aws"          - LocalStack, DynamoDB, SAM
//   "local-development/azure"        - Azurite, Functions, Cosmos DB
//   "local-development/gcp"          - Firestore, Pub/Sub, Spanner
//   "local-development/checklist"    - AI assistant setup guide

// Output
{
  "content": "# Autonomo Overview\n\n..."  // Markdown content
}
```

## Example Interactions

### GitHub Copilot

```
User: Build the checkout flow and verify it works

Copilot: I'll build the checkout flow and verify it live.

[Writes the component code, then uses autonomo/get_state to see the result]

The app is showing the checkout screen. Let me interact with it:

[Uses autonomo/run_scenario to walk through the flow]

✅ Checkout flow working:
1. Added item to cart (245ms)
2. Navigated to checkout (180ms)  
3. Filled shipping info (320ms)
4. Submitted order (1.2s)
5. Reached confirmation screen

Final state: Order #12345 confirmed. The flow works end to end.
```

### Claude Code

```
User: There's a bug in login - can you find and fix it?

Claude: I'll look at the running app and find the issue.

[Uses autonomo/list_bridges]

I see your app is running on localhost:3000. Let me try the login flow:

[Uses autonomo/send_command for each step]

Found it. When I enter an email with a "+" character:

- Input: "test+staging@example.com"
- Error: "Invalid email format"

The validation regex doesn't allow "+" characters which are valid in emails.
Fixing src/utils/validation.ts now...

[Fixes the code, then re-runs the login flow via Autonomo]

✅ Fixed and verified — login now accepts "+" in emails.
```

### Cursor

```
User: @autonomo verify all the main flows still work after my refactor

Cursor: Running through the main flows on the live app...

[Uses autonomo/run_scenario for each flow]

Results:
✅ login flow (2.3s)
✅ checkout flow (4.1s)
❌ profile update (failed at step 4)
   Error: Element "Profile.SaveButton" is disabled
   
The save button is disabled because the phone number field has a validation error after your refactor. I can see the issue in the state — let me fix it...
```

## Integration Patterns

### Pattern 1: Build and Verify

AI writes code and immediately sees the result in the running app:

```
"Build a signup form with email validation"
→ AI writes the component
→ AI sees it rendered in the app
→ AI fills in test data, submits, verifies behavior
→ AI spots a validation edge case, fixes it, confirms
```

### Pattern 2: Bug Hunting

AI uses the live app to find and fix bugs:

```
"The user reported checkout fails with international addresses"
→ AI fills in international address
→ AI sees the specific failure in real time
→ AI fixes the code
→ AI re-runs the flow to confirm the fix
```

### Pattern 3: Code + Verify Loop

Every change is immediately validated:

```
AI: "I've updated the validation logic. Let me verify it works..."
[Interacts with the live app via Autonomo]
AI: "Confirmed - the fix handles the edge case correctly."
```

### Pattern 4: Regression Detection

AI catches breakage while developing:

```
AI: "While working on your new feature, I noticed the login
     flow now fails at step 3. This is a regression from
     your recent changes to auth.ts. Fixing now..."
```

## Comparison: Why MCP + Local?

| Approach | Autonomo (MCP + Local) | Cloud-Based Tools |
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

**Autonomo doesn't compete with AI tools. It gives them all eyes.**
