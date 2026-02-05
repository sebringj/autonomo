<p align="center">
  <img src="logo.jpeg" alt="Autonomo" width="200" />
</p>

# Autonomo

> **MCP Server for AI-Powered Application Testing**
>
> Works with: GitHub Copilot • Claude Code • Cursor • Windsurf • Any MCP-compatible AI

Autonomo is a **local MCP server** that enables AI coding assistants to directly interact with and test your running applications. It's not a competing AI tool—it's infrastructure that makes ALL your AI tools better at testing.

## The Core Insight

**After every action, the LLM gets a unified snapshot of what happened across all levels:**

```
LLM sends command: {"action": "press", "target": "Submit"}
                              ↓
            ═══ UNIFIED SNAPSHOT RETURNED ═══

UI State:
  screen: "confirmation"
  elements: ["Order.Number", "Order.Details", "Home.Button"]

App State:
  orderId: "ORD-12345"
  cartCleared: true

Network:
  POST /api/orders → 201 (245ms)
  response: { id: "ORD-12345", status: "confirmed" }

Errors:
  [] (none)

Console:
  ["Order created successfully"]
                              ↓
LLM can now:
  • Verify the action worked
  • See exactly what failed if it didn't
  • Iterate with the next command
  • Fix code if there's an error
```

**This enables the Detect → Act → Iterate loop:**

1. **DETECT** - Get current state (UI + app + network + errors)
2. **ACT** - Send command (navigate, press, fill, call API)
3. **ITERATE** - See unified result, decide next step or fix

The LLM doesn't guess what happened. It **sees everything** and can fix issues immediately.

## Why This Matters: Eliminating AI Hallucinations

**The problem with AI coding today:**

| Without Autonomo | With Autonomo |
|------------------|---------------|
| LLM says "that should work" | LLM **proves** it works by running it |
| False confidence in untested code | Validated outcomes, real results |
| Hallucinated fixes that don't compile | Iterates until tests actually pass |
| "I've updated the code" (hope it's right) | "I've verified the fix works" (proved it) |

**Autonomo turns "I think" into "I verified":**

```
Before: LLM writes code → hopes it works → moves on → bugs found later

After:  LLM writes code → tests it → sees failure → fixes → tests again → 
        confirms success → moves on with confidence
```

This **dramatically reduces hallucinations** because the LLM can't claim success without proof. It must iterate until the actual app behaves correctly.

## Built for Local Development

Autonomo is designed for the **inner development loop** - the tight cycle where you write code, test it, and fix issues:

```
                      YOUR LOCAL MACHINE

    [Editor]          [Autonomo]          [Your App]
    + AI Tool    ◄───►  Server     ◄───►  (localhost)
        │
        ▼
    Write code → Test immediately → See results → Fix → Repeat

    ════════════════════════════════════════════════════════
    100% LOCAL • NO CLOUD • NO LATENCY • NO DATA LEAVING
    ════════════════════════════════════════════════════════
```

**Key Principles:**
- 🔌 **MCP-Native** - One integration works with Copilot, Claude, Cursor, and more
- 🔒 **100% Local** - Nothing leaves your machine, ever
- 🌐 **Language Agnostic** - HTTP protocol works with any stack
- 🆓 **Free for Most** - Free under $1M revenue, [see license](LICENSE.md)

## Current Status

**Working today** (reference implementations in [LeagueHub](../leaguehub)):

| Platform | Status | Implementation |
|----------|--------|----------------|
| **React Native (Expo)** | ✅ Production-ready | [RemoteTestBridge.tsx](../leaguehub/mobile/src/components/RemoteTestBridge.tsx) |
| **Web (React/Preact)** | ✅ Production-ready | [WebTestBridge.tsx](../leaguehub/web/islands/WebTestBridge.tsx) |

## Architecture: Metadata-Based, Not HTML-Based

**Autonomo doesn't parse DOM or HTML.** It uses a self-registration pattern:

```
              ═══ METADATA REGISTRY PATTERN ═══

Your UI Framework (any)
    │
    ▼
Component mounts → registers with bridge:

    { id: "Checkout.Submit",
      type: "button",
      onTap: () => handleSubmit() }

Component unmounts → unregisters
    │
    ▼
Bridge maintains registry:

    elements: Map<string, { type, handler, value }>

When command arrives → look up handler → invoke
```

**This pattern works on ANY framework that supports:**
1. **Lifecycle hooks** - Know when views/controls mount/unmount
2. **Callbacks** - Attach handlers to elements
3. **HTTP client** - Report state, receive commands

That's basically every UI framework ever built.

### Works Everywhere (Same Pattern)

| Platform | Lifecycle Hook | Registration |
|----------|---------------|--------------|
| **React/Preact** | `useEffect` | Hook registers on mount |
| **React Native** | `useEffect` | Same as React |
| **Vue** | `onMounted`/`onUnmounted` | Composable registers |
| **Svelte** | `onMount`/`onDestroy` | Action registers |
| **Angular** | `ngOnInit`/`ngOnDestroy` | Directive registers |
| **Solid** | `onMount`/`onCleanup` | Same pattern |
| **SwiftUI** | `.onAppear`/`.onDisappear` | View modifier registers |
| **UIKit** | `viewDidAppear`/`viewWillDisappear` | VC registers |
| **Jetpack Compose** | `LaunchedEffect`/`DisposableEffect` | Composable registers |
| **Android Views** | `onAttachedToWindow`/`onDetachedFromWindow` | View registers |
| **Flutter** | `initState`/`dispose` | Widget registers |
| **Qt/QML** | `Component.onCompleted`/`onDestruction` | Item registers |
| **Electron** | DOM + IPC | Web bridge + native hooks |
| **CLI/TUI** | Command registration | Commands as "elements" |

**The control APIs are the same regardless of framework:**

```typescript
// Register a tappable element
registerTapHandler("Checkout.Submit", () => handleSubmit());

// Register a fillable input  
registerFillHandler("Checkout.Email", (value) => setEmail(value));

// Register a screen/view
registerScreen("checkout", { cartItems: 3, total: 45.99 });
```

**If your framework has lifecycle hooks and callbacks, Autonomo works.**

## Integration Model: Docs + AI, Not SDKs

**Traditional approach:** Ship an SDK per framework, maintain 20 packages, version hell

**Autonomo approach:** Ship **integration guides** (markdown) that AI coding agents use to integrate

```
Developer: "Add Autonomo to my Vue app"
                    ↓
AI Agent reads: autonomo/guides/vue.md

  Contains:
    • Vue lifecycle patterns (onMounted, onUnmounted)
    • Composable template for registration
    • Example integration code
    • Testing verification steps
                    ↓
AI Agent writes the integration code tailored to YOUR app

    • Creates autonomo.ts composable
    • Wraps your existing components
    • Adds testIDs to key elements
    • Verifies integration works via Autonomo itself!
```

**Why this is better:**

| Traditional SDK | Docs + AI |
|-----------------|-----------|
| Generic, one-size-fits-all | Tailored to your codebase |
| You read docs, you integrate | AI reads docs, AI integrates |
| Breaking changes = your problem | AI adapts to your versions |
| 20 packages to maintain | 20 markdown files to maintain |
| Versioning complexity | Always uses your framework version |

**The AI verifies its own work:**

```
AI: "I've added Autonomo to your Vue app. Let me verify it works..."

[AI uses Autonomo MCP tools to test the integration]

AI: "✅ Confirmed - I can see 12 elements registered. 
     Tested pressing LoginButton - works correctly."
```

### Framework Guides (The "SDKs")

Each guide contains:
- Pattern explanation for that framework
- Registration composable/hook/directive template
- Wrapper component examples
- State reporting patterns
- Verification steps

```
autonomo/
  guides/
    react.md          # useEffect, hooks pattern
    react-native.md   # Same + native considerations
    vue.md            # Composables, onMounted
    svelte.md         # Actions, onMount
    angular.md        # Directives, ngOnInit
    solid.md          # createEffect, onMount
    swiftui.md        # View modifiers, onAppear
    flutter.md        # initState, dispose
    ...
```

**The documentation IS the product.** The AI does the integration work.

## Platform Support

**SDKs** (implemented with test suites, not yet published):

| Platform | Package | Status |
|----------|---------|--------|
| TypeScript/JS Core | `@autonomo/core` | ✅ Implemented |
| MCP Server | `@autonomo/mcp-server` | ✅ Implemented |
| React | `@autonomo/react` | ✅ Implemented |
| React Native | `@autonomo/react-native` | ✅ Implemented |
| Swift/iOS | `autonomo-swift` | ✅ Implemented |
| Kotlin/Android | `autonomo-kotlin` | ✅ Implemented |
| Flutter/Dart | `autonomo_flutter` | ✅ Implemented |
| Python | `autonomo-python` | ✅ Implemented |
| Ruby | `autonomo-ruby` | ✅ Implemented |
| C#/.NET | `Autonomo.CSharp` | ✅ Implemented |
| CLI | `autonomo-cli` | ✅ Implemented |

> **Note:** Packages are implemented and tested but not yet published to package registries (npm, PyPI, etc.). Install from source for now.

**JS/TS Frameworks** (use `@autonomo/core` with thin lifecycle wrapper):

| Platform | Effort | Notes |
|----------|--------|-------|
| Vue | ~1 day | Composables for registration |
| Svelte | ~1 day | Actions/stores pattern |
| Angular | ~1 day | Directives for registration |
| Solid | ~1 day | Similar to React hooks |
| Next.js / Remix | ✅ Works | Uses React impl directly |
| Vanilla JS | ~hours | Direct registration calls |

**Backend/API Testing** (just HTTP, no UI):

| Platform | Effort | Notes |
|----------|--------|-------|
| Node.js (Express/Fastify/Koa) | ~hours | Middleware that exposes routes as "elements" |
| Deno (Fresh/Oak/Hono) | ~hours | Same pattern |
| Bun | ~hours | Same pattern |
| Go | ~1 day | net/http + middleware |
| Rust | ~2 days | reqwest + macros |

For backends, "elements" become API endpoints:
```json
{
  "elements": [
    { "id": "POST /api/users", "type": "endpoint", "methods": ["POST"] },
    { "id": "GET /api/orders/:id", "type": "endpoint", "methods": ["GET"] }
  ]
}
```

AI can then test: `{"action": "call", "target": "POST /api/users", "value": {"name": "Test"}}`

## The Problem

Current AI-assisted testing approaches have significant limitations:

| Approach | Limitation |
|----------|------------|
| Screenshot + Vision | Slow, expensive, brittle to UI changes |
| DOM parsing | Web-only, doesn't work for native apps |
| Record/Playback | Requires human recording, can't adapt |
| Traditional automation | Complex setup, limited AI integration |

**What we need**: A way for AI to _understand_ application state and _control_ it directly, like a human developer using dev tools.

## The Solution: Test Bridges

A **Test Bridge** is a lightweight HTTP interface embedded in an application (dev mode only) that:

1. **Exposes semantic state** - Current screen, active elements, user context
2. **Accepts control commands** - Navigate, tap, fill inputs, trigger actions
3. **Reports results** - Success/failure, errors, timing

```
              LLM / AI Agent (VS Code + Copilot)
                            │
    POST /api/test-command ─┼──────► Command Queue
                            │              │
    GET /api/test-result  ◄─┼────── Result + State
                            │
              Running Application
                            │
         [Screen]      [Elements]      [Actions]
         [State ]      [Registry]      [Handlers]
```

## Core Concepts

### 1. Command/Result Pattern

Commands are posted to a queue, processed by the app, results retrieved:

```bash
# Send command
curl -X POST http://localhost:8006/api/test-command \
  -H "Content-Type: application/json" \
  -d '{"action":"press","target":"Login.SubmitButton"}'

# Get result (after brief delay)
curl http://localhost:8006/api/test-result
# → {"screen":"home","success":true,"elements":["Home.Feed","Home.Profile"]}
```

### 2. Semantic Element Identification

Elements are identified by **testID** (not XPath, CSS selectors, or coordinates):

```json
{"action": "press", "target": "Schedule.AddEventButton"}
{"action": "fillIn", "target": "Registration.EmailInput", "value": "test@example.com"}
{"action": "navigate", "target": "/settings/profile"}
```

### 3. State Introspection

The bridge reports rich, structured state:

```json
{
  "screen": "league-dashboard",
  "isLoggedIn": true,
  "activeRole": "league_manager",
  "elements": [
    "Dashboard.StatsCard",
    "Dashboard.RecentActivity",
    "Dashboard.QuickActions.CreateEvent"
  ],
  "errors": [],
  "timestamp": 1706745600000
}
```

### 4. The Detect→Act→Iterate Loop

The AI testing mantra:

1. **DETECT** - Get current state: `GET /api/test-result`
2. **ACT** - Send command: `POST /api/test-command`
3. **ITERATE** - Check result, repeat

```
DETECT ──► ACT ──► DETECT ──► ACT ──► DETECT ──► ...
  │         │        │         │        │
  │         │        │         │        └─ Verify final state
  │         │        │         └─ Second action
  │         │        └─ Verify first action worked
  │         └─ First action
  └─ Initial state check
```

## Why This Works for AI

| Feature | Benefit for LLM |
|---------|-----------------|
| **Structured JSON** | No vision/parsing needed |
| **Semantic IDs** | Stable across UI changes |
| **Explicit state** | No guessing what user sees |
| **Error reporting** | AI can diagnose failures |
| **Platform agnostic** | Same commands for web/mobile/desktop |

## Packages

Autonomo provides packages for multiple platforms and languages:

| Package | Platform | Install |
|---------|----------|---------|
| [@autonomo/core](./packages/@autonomo/core) | **JavaScript / TypeScript** | `npm install @autonomo/core` |
| [@autonomo/mcp-server](./packages/@autonomo/mcp-server) | MCP Server | `npm install @autonomo/mcp-server` |
| [@autonomo/react](./packages/@autonomo/react) | React | `npm install @autonomo/react` |
| [@autonomo/react-native](./packages/@autonomo/react-native) | React Native / Expo | `npm install @autonomo/react-native` |
| [autonomo-cli](./packages/autonomo-cli) | CLI | `npm install -g autonomo-cli` |
| [autonomo_flutter](./packages/autonomo_flutter) | Flutter / Dart | `flutter pub add autonomo_flutter` |
| [autonomo-python](./packages/autonomo-python) | Python | `pip install autonomo` |
| [autonomo-ruby](./packages/autonomo-ruby) | Ruby | `gem install autonomo` |
| [Autonomo.CSharp](./packages/Autonomo.CSharp) | C# / .NET | `dotnet add package Autonomo.CSharp` |
| [autonomo-swift](./packages/autonomo-swift) | Swift / iOS / macOS | Swift Package Manager |
| [autonomo-kotlin](./packages/autonomo-kotlin) | Kotlin / JVM / Android | `implementation("com.autonomo:autonomo:0.1.0")` |

**Note:** `@autonomo/core` is the base JS/TS package - use it for vanilla JavaScript, Node.js, web components, Electron, or any framework without a dedicated package. The React and React Native packages are thin wrappers around core.

## Documentation

- [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) - **Start here** - How Autonomo works with AI tools
- [TEST_BRIDGE_ARCHITECTURE.md](./TEST_BRIDGE_ARCHITECTURE.md) - Deep dive on implementation
- [PROTOCOL_SPECIFICATION.md](./PROTOCOL_SPECIFICATION.md) - Universal HTTP API (language-agnostic)
- [PRODUCT_ROADMAP.md](./PRODUCT_ROADMAP.md) - Feature roadmap
- [BUSINESS_PLAN.md](./BUSINESS_PLAN.md) - Open source → Enterprise business model

## Quick Links

**Working implementations:**
- [RemoteTestBridge.tsx](../leaguehub/mobile/src/components/RemoteTestBridge.tsx) - React Native (Expo)
- [WebTestBridge.tsx](../leaguehub/web/islands/WebTestBridge.tsx) - Web (Preact/Deno Fresh)

**Guides:**
- [Mobile Test Bridge Guide](../leaguehub/validation/MOBILE_TEST_BRIDGE.md)
- [Web Test Bridge Guide](../leaguehub/validation/WEB_TEST_BRIDGE.md)
- [Interplay Testing Guide](../leaguehub/validation/INTERPLAY_TESTING.md) - Cross-platform testing

---

**Status**: Reference implementations battle-tested in LeagueHub. MCP server extraction in progress.
