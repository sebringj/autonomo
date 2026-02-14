# Autonomo Quick Start: Deno Fresh 2.0

> **For AI Assistants**: This document contains Deno Fresh 2.0 integration instructions. Follow each step in order.

## Key Insight: Islands Architecture

Deno Fresh uses **islands architecture** where:
- Components are server-rendered by default
- Only "islands" (in `islands/` folder) hydrate on the client
- **Critical**: Islands in `_app.tsx` do NOT hydrate - they're server-rendered only!

This means the Autonomo bridge must be included in actual **route components**, not in `_app.tsx`.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Autonomo MCP   │◄──WS───▶│  Browser        │
│  Server :9876   │         │  (AutonomoBridge│
└─────────────────┘         │   island)       │
        ▲                   └─────────────────┘
        │
┌───────┴────────┐
│  VS Code/AI    │
│  (MCP Client)  │
└────────────────┘
```

**Why WebSocket (not HTTP endpoints):**
- Direct connection from browser to Autonomo server gives your AI live, real-time visibility
- Survives Fresh's full page navigations when using single-island pattern
- No need for Deno server to proxy commands
- Same protocol as React/React Native packages

---

## Step 1: Install MCP Server

```bash
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server
```

Or install locally in your project:
```bash
npm install github:sebringj/autonomo#packages/@autonomo/mcp-server
```

## Step 2: Configure MCP in VS Code

Create `.vscode/mcp.json` in your project root:

```json
{
  "servers": {
    "autonomo": {
      "type": "stdio",
      "command": "node",
      "args": ["node_modules/@autonomo/mcp-server/dist/cli.js"]
    }
  }
}
```

Or if installed globally:
```json
{
  "servers": {
    "autonomo": {
      "command": "autonomo-mcp",
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

## Step 3: Create the AutonomoBridge Island

Create `islands/AutonomoBridge.tsx`:

```tsx
import { useEffect, useRef, useState, useCallback } from "preact/hooks";

interface Props {
  name?: string;
  serverUrl?: string;
  debug?: boolean;
}

const DEFAULT_SERVER_URL = "ws://localhost:9876";

export default function AutonomoBridge({
  name = "my-app",
  serverUrl = DEFAULT_SERVER_URL,
  debug = false,
}: Props) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "error" | "disconnected"
  >("connecting");

  const scanElements = useCallback(() => {
    return Array.from(document.querySelectorAll("[data-testid]")).map((el) => ({
      id: el.getAttribute("data-testid"),
      type: el.tagName.toLowerCase(),
      text: el.textContent?.slice(0, 50),
    }));
  }, []);

  const reportState = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const elements = scanElements();
      wsRef.current.send(
        JSON.stringify({
          type: "state",
          screen: window.location.pathname,
          elements,
          errors: [],
        })
      );
      if (debug)
        console.log(
          "[Autonomo] State reported:",
          window.location.pathname,
          elements.length,
          "elements"
        );
    }
  }, [scanElements, debug]);

  const handleCommand = useCallback(
    async (msg: {
      id: string;
      action: string;
      target?: string;
      value?: string;
    }) => {
      const { id, action, target, value } = msg;
      if (debug) console.log("[Autonomo] Command:", action, target);

      let success = true;
      let message: string | undefined;
      let error: string | undefined;

      try {
        switch (action) {
          case "navigate":
            if (target) {
              window.location.href = target;
              message = "Navigated to " + target;
            }
            break;

          case "press":
          case "tap":
            if (target) {
              const el = document.querySelector(
                '[data-testid="' + target + '"]'
              ) as HTMLElement;
              if (el) {
                el.click();
                message = "Pressed " + target;
              } else {
                success = false;
                error = "Element not found: " + target;
              }
            }
            break;

          case "fillIn":
          case "fill":
            if (target) {
              const input = document.querySelector(
                '[data-testid="' + target + '"]'
              ) as HTMLInputElement;
              if (input) {
                input.value = value || "";
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                message = "Filled " + target;
              } else {
                success = false;
                error = "Input not found: " + target;
              }
            }
            break;

          case "select":
            if (target) {
              const select = document.querySelector(
                '[data-testid="' + target + '"]'
              ) as HTMLSelectElement;
              if (select) {
                select.value = value || "";
                select.dispatchEvent(new Event("change", { bubbles: true }));
                message = "Selected " + value + " in " + target;
              } else {
                success = false;
                error = "Select not found: " + target;
              }
            }
            break;

          default:
            error = "Unknown action: " + action;
            success = false;
        }
      } catch (err) {
        success = false;
        error = err instanceof Error ? err.message : String(err);
      }

      await new Promise((r) => setTimeout(r, 100));

      wsRef.current?.send(
        JSON.stringify({
          type: "result",
          commandId: id,
          success,
          message,
          error,
          state: {
            screen: window.location.pathname,
            elements: scanElements(),
          },
        })
      );
    },
    [scanElements, debug]
  );

  useEffect(() => {
    let ws: WebSocket;

    const connect = () => {
      if (debug) console.log("[Autonomo] Connecting to", serverUrl);
      setStatus("connecting");

      try {
        ws = new WebSocket(serverUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (debug) console.log("[Autonomo] Connected");
          ws.send(
            JSON.stringify({
              type: "register",
              name,
              platform: "web",
              instanceId: Math.random().toString(36).slice(2, 10),
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);

            switch (msg.type) {
              case "registered":
                setStatus("connected");
                if (debug) console.log("[Autonomo] Registered as", msg.bridgeId);
                reportState();
                break;

              case "command":
                handleCommand(msg);
                break;

              case "ping":
                ws.send(JSON.stringify({ type: "pong" }));
                break;
            }
          } catch (err) {
            console.error("[Autonomo] Message parse error:", err);
          }
        };

        ws.onclose = () => {
          if (debug) console.log("[Autonomo] Disconnected");
          setStatus("disconnected");
          reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
        };

        ws.onerror = () => {
          setStatus("error");
        };
      } catch (err) {
        if (debug) console.error("[Autonomo] Connection failed:", err);
        reconnectTimeoutRef.current = window.setTimeout(connect, 2000);
      }
    };

    const observer = new MutationObserver(() => {
      reportState();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    connect();

    return () => {
      observer.disconnect();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      ws?.close();
    };
  }, [serverUrl, name, debug, handleCommand, reportState]);

  if (debug) {
    const colors = {
      connecting: "#f59e0b",
      connected: "#10b981",
      disconnected: "#6b7280",
      error: "#ef4444",
    };
    const labels = {
      connecting: "Connecting...",
      connected: "AI Connected",
      disconnected: "Disconnected",
      error: "Error",
    };
    return (
      <div
        style={{
          position: "fixed",
          bottom: "8px",
          right: "8px",
          padding: "4px 8px",
          background: colors[status],
          color: "white",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 9999,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {labels[status]}
      </div>
    );
  }

  return null;
}
```

## Step 4: Add to Your Route (NOT _app.tsx!)

**Critical**: Islands in `_app.tsx` are server-rendered only and won't hydrate. Add the bridge to your main route component.

```tsx
// routes/dashboard/index.tsx (or your main route)
import AutonomoBridge from "../../islands/AutonomoBridge.tsx";

const isDev = Deno.env.get("DENO_ENV") !== "production";

export default function DashboardPage() {
  return (
    <html lang="en">
      <head>
        <title>My App</title>
      </head>
      <body>
        <MyAppIsland />
        {isDev && <AutonomoBridge debug />}
      </body>
    </html>
  );
}
```

### Single Island Pattern (Recommended)

For best results with Autonomo, use Fresh's **single island pattern**:

```
/dashboard -> renders one main island (e.g., WebApp.tsx)
              WebApp handles all views via internal state
              AutonomoBridge stays connected (no page reloads)
```

This prevents WebSocket disconnections from full page navigations.

## Step 5: Add TestIDs to Elements

Mark interactive elements with `data-testid`:

```tsx
function LoginForm() {
  return (
    <form data-testid="LoginForm">
      <input data-testid="Login.Email" type="email" />
      <input data-testid="Login.Password" type="password" />
      <button data-testid="Login.Submit" type="submit">
        Sign In
      </button>
    </form>
  );
}
```

**Naming convention**: `Screen.Element` or `Component.Element`

## Step 6: Verify It Works

1. Start the Autonomo MCP server (happens automatically when VS Code loads)
2. Start your Fresh app: `deno task dev`
3. Open your app in the browser
4. Look for "AI Connected" indicator (if debug mode)

**Test with MCP tools:**
```
AI: "List connected bridges"
-> Should show your app

AI: "Get state from my-app"
-> Should show current screen and elements

AI: "Press Login.Submit"
-> Should click the button
```

---

## Troubleshooting

### Bridge Shows "Connecting..." But Never Connects

1. **Check WebSocket server is running**: `lsof -i :9876`
2. **Check browser console** for WebSocket errors
3. **Verify island is in route**, not `_app.tsx`

### Elements Not Appearing in State

1. Ensure elements have `data-testid` attributes
2. Check that elements are in the DOM (not conditionally hidden)
3. Try manual scan in browser console:
   ```js
   document.querySelectorAll('[data-testid]')
   ```

### CSP Errors Blocking Connection

If you see Content Security Policy errors:
- Fresh 2.0 uses nonces for scripts
- WebSocket connections to localhost should work
- Check for browser extensions that might block WebSocket

### Connection Drops on Navigation

This is expected with Fresh's full page navigations. Solutions:
1. **Single Island Pattern**: Use one main island that handles all views
2. **Accept reconnection**: Bridge auto-reconnects in 2 seconds

---

## Reference Implementation

See the complete working implementation in LeagueHub:
- AutonomoBridge.tsx - https://github.com/sebringj/leaguehub/blob/main/web/islands/AutonomoBridge.tsx
- webTestBridge.ts - https://github.com/sebringj/leaguehub/blob/main/web/lib/webTestBridge.ts

---

## MCP Tools Reference

Once connected, the AI can use these tools:

| Tool | Description |
|------|-------------|
| `autonomo_list_bridges` | List all connected apps |
| `autonomo_get_state` | Get current screen and elements |
| `autonomo_send_command` | Press, fill, navigate, etc. |
| `autonomo_wait_for` | Wait for condition |
| `autonomo_run_scenario` | Multi-step test sequence |

**Example commands:**
```json
{"action": "navigate", "target": "/dashboard"}
{"action": "press", "target": "Login.Submit"}
{"action": "fillIn", "target": "Login.Email", "value": "test@example.com"}
```
