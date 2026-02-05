# Autonomo Protocol Specification

> **Universal HTTP API for AI-Native Application Testing**

## The Insight

Instead of requiring framework-specific SDKs, Autonomo can work through a **universal HTTP protocol** that any application can speak, regardless of language or framework.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                             │
│                  (Orchestrates everything)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Stage 1: INTEGRATE          Stage 2: RUN                      │
│   ─────────────────           ────────                          │
│   • Start Autonomo Server     • AI sends commands               │
│   • App connects via HTTP     • Server routes to app            │
│   • Elements registered       • Results returned                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Autonomo Server                               │
│              (Standalone process or VS Code service)            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   HTTP API (localhost:9876)                                     │
│   ─────────────────────────                                     │
│                                                                  │
│   FOR APPS (any language):          FOR AI (MCP tools):         │
│   • POST /connect                   • GET /bridges              │
│   • POST /register-element          • POST /command             │
│   • POST /state                     • GET /state                │
│   • GET /commands (poll)            • WS /stream                │
│   • POST /result                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  React Native   │  │  Django/Flask   │  │  Go Backend     │
│  (TypeScript)   │  │  (Python)       │  │  (Go)           │
│                 │  │                 │  │                 │
│  HTTP client    │  │  HTTP client    │  │  HTTP client    │
│  to server      │  │  to server      │  │  to server      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## Two-Stage Workflow

### Stage 1: INTEGRATE

The developer adds minimal HTTP calls to their app:

```python
# Python/Django example - just HTTP calls!
import requests

AUTONOMO_URL = "http://localhost:9876"

# On app startup
requests.post(f"{AUTONOMO_URL}/connect", json={
    "appId": "my-django-app",
    "platform": "web",
    "version": "1.0.0"
})

# When a page/screen loads
requests.post(f"{AUTONOMO_URL}/state", json={
    "appId": "my-django-app",
    "screen": "checkout",
    "data": {
        "cartItems": 3,
        "total": 45.99,
        "canCheckout": True
    }
})

# Register interactive elements
requests.post(f"{AUTONOMO_URL}/register-element", json={
    "appId": "my-django-app", 
    "elementId": "Checkout.SubmitButton",
    "type": "button",
    "disabled": False
})
```

### Stage 2: RUN

AI sends commands through the server, app polls and executes:

```python
# In a background thread or async task
def poll_commands():
    while True:
        resp = requests.get(f"{AUTONOMO_URL}/commands?appId=my-django-app")
        if resp.status_code == 200:
            cmd = resp.json()
            result = execute_command(cmd)
            requests.post(f"{AUTONOMO_URL}/result", json=result)
        time.sleep(0.1)

def execute_command(cmd):
    if cmd["action"] == "press":
        # Trigger the button action
        handlers[cmd["target"]]()
        return {"success": True}
    elif cmd["action"] == "fillIn":
        # Set the input value
        inputs[cmd["target"]] = cmd["value"]
        return {"success": True}
    # etc.
```

## Protocol Specification

### App → Server Endpoints

#### `POST /connect`

Register an app with the Autonomo server.

```json
// Request
{
  "appId": "my-app",
  "platform": "web" | "mobile" | "desktop" | "api",
  "framework": "react" | "django" | "flutter" | "go" | ...,
  "version": "1.0.0",
  "capabilities": ["navigate", "press", "fillIn", "custom"]
}

// Response
{
  "bridgeId": "abc123",
  "serverVersion": "1.0.0",
  "heartbeatInterval": 5000
}
```

#### `POST /state`

Report current application state.

```json
// Request
{
  "appId": "my-app",
  "screen": "checkout",
  "timestamp": 1706745600000,
  "user": {
    "id": "user123",
    "email": "test@example.com",
    "role": "customer"
  },
  "data": {
    // App-specific state
    "cartItems": 3,
    "total": 45.99
  },
  "errors": []
}

// Response
{
  "received": true
}
```

#### `POST /register-element`

Register an interactive element.

```json
// Request
{
  "appId": "my-app",
  "elementId": "Checkout.SubmitButton",
  "type": "button" | "input" | "toggle" | "select" | "custom",
  "properties": {
    "disabled": false,
    "visible": true,
    "value": null,        // For inputs
    "options": [],        // For selects
    "hint": "Click to complete purchase"
  }
}

// Response
{
  "registered": true
}
```

#### `DELETE /register-element`

Unregister an element (when unmounted/removed).

```json
// Request
{
  "appId": "my-app",
  "elementId": "Checkout.SubmitButton"
}
```

#### `GET /commands?appId={appId}`

Poll for pending commands.

```json
// Response (command waiting)
{
  "commandId": "cmd123",
  "action": "press",
  "target": "Checkout.SubmitButton",
  "value": null,
  "timeout": 5000
}

// Response (no command)
HTTP 204 No Content
```

#### `POST /result`

Report command execution result.

```json
// Request
{
  "appId": "my-app",
  "commandId": "cmd123",
  "success": true,
  "message": "Button clicked",
  "error": null,
  "state": {
    // Updated state after action
    "screen": "confirmation",
    "orderId": "ORD-456"
  }
}
```

#### `POST /heartbeat`

Keep connection alive.

```json
// Request
{
  "appId": "my-app",
  "timestamp": 1706745600000
}
```

### AI → Server Endpoints (MCP Tools)

#### `GET /bridges`

List connected applications.

```json
// Response
{
  "bridges": [
    {
      "bridgeId": "abc123",
      "appId": "my-app",
      "platform": "web",
      "screen": "checkout",
      "elements": ["Checkout.SubmitButton", "Checkout.CouponInput"],
      "lastSeen": 1706745600000,
      "status": "active"
    }
  ]
}
```

#### `POST /command`

Send a command to an app.

```json
// Request
{
  "bridgeId": "abc123",  // or "appId": "my-app"
  "action": "press",
  "target": "Checkout.SubmitButton",
  "value": null,
  "timeout": 5000
}

// Response
{
  "commandId": "cmd123",
  "queued": true
}
```

#### `GET /state?bridgeId={bridgeId}`

Get current state of an app.

```json
// Response
{
  "bridgeId": "abc123",
  "appId": "my-app",
  "screen": "checkout",
  "elements": [
    {
      "id": "Checkout.SubmitButton",
      "type": "button",
      "disabled": false
    },
    {
      "id": "Checkout.CouponInput",
      "type": "input",
      "value": ""
    }
  ],
  "data": {
    "cartItems": 3,
    "total": 45.99
  },
  "user": {
    "id": "user123",
    "role": "customer"
  }
}
```

#### `GET /result?commandId={commandId}`

Get result of a command.

```json
// Response (completed)
{
  "commandId": "cmd123",
  "status": "completed",
  "success": true,
  "message": "Button clicked",
  "state": { ... }
}

// Response (pending)
{
  "commandId": "cmd123",
  "status": "pending"
}

// Response (timeout)
{
  "commandId": "cmd123", 
  "status": "timeout",
  "success": false,
  "error": "Command timed out after 5000ms"
}
```

## Language Examples

### Python (Flask/Django)

```python
# autonomo.py - minimal integration
import requests
import threading
from functools import wraps

AUTONOMO_URL = "http://localhost:9876"
APP_ID = "my-flask-app"

_element_handlers = {}

def connect():
    requests.post(f"{AUTONOMO_URL}/connect", json={
        "appId": APP_ID,
        "platform": "web",
        "framework": "flask"
    })
    # Start polling thread
    threading.Thread(target=_poll_commands, daemon=True).start()

def report_state(screen, **data):
    requests.post(f"{AUTONOMO_URL}/state", json={
        "appId": APP_ID,
        "screen": screen,
        "data": data
    })

def testable_button(element_id):
    """Decorator to make a route testable as a button press"""
    def decorator(f):
        _element_handlers[element_id] = f
        requests.post(f"{AUTONOMO_URL}/register-element", json={
            "appId": APP_ID,
            "elementId": element_id,
            "type": "button"
        })
        return f
    return decorator

def _poll_commands():
    while True:
        try:
            resp = requests.get(f"{AUTONOMO_URL}/commands?appId={APP_ID}", timeout=1)
            if resp.status_code == 200:
                cmd = resp.json()
                _execute(cmd)
        except:
            pass

def _execute(cmd):
    handler = _element_handlers.get(cmd["target"])
    if handler:
        try:
            handler()
            requests.post(f"{AUTONOMO_URL}/result", json={
                "appId": APP_ID,
                "commandId": cmd["commandId"],
                "success": True
            })
        except Exception as e:
            requests.post(f"{AUTONOMO_URL}/result", json={
                "appId": APP_ID,
                "commandId": cmd["commandId"],
                "success": False,
                "error": str(e)
            })

# Usage in Flask:
@app.route('/checkout', methods=['POST'])
@testable_button('Checkout.SubmitButton')
def checkout():
    # ... checkout logic
    pass
```

### Go

```go
// autonomo/client.go
package autonomo

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
)

var serverURL = "http://localhost:9876"
var appID string
var handlers = make(map[string]func() error)

func Connect(id, platform, framework string) error {
    appID = id
    body, _ := json.Marshal(map[string]string{
        "appId": id, "platform": platform, "framework": framework,
    })
    _, err := http.Post(serverURL+"/connect", "application/json", bytes.NewReader(body))
    if err == nil {
        go pollCommands()
    }
    return err
}

func ReportState(screen string, data map[string]interface{}) {
    body, _ := json.Marshal(map[string]interface{}{
        "appId": appID, "screen": screen, "data": data,
    })
    http.Post(serverURL+"/state", "application/json", bytes.NewReader(body))
}

func RegisterButton(elementID string, handler func() error) {
    handlers[elementID] = handler
    body, _ := json.Marshal(map[string]string{
        "appId": appID, "elementId": elementID, "type": "button",
    })
    http.Post(serverURL+"/register-element", "application/json", bytes.NewReader(body))
}

func pollCommands() {
    for {
        resp, err := http.Get(serverURL + "/commands?appId=" + appID)
        if err == nil && resp.StatusCode == 200 {
            var cmd struct {
                CommandID string `json:"commandId"`
                Target    string `json:"target"`
            }
            json.NewDecoder(resp.Body).Decode(&cmd)
            executeCommand(cmd.CommandID, cmd.Target)
        }
        time.Sleep(100 * time.Millisecond)
    }
}

func executeCommand(cmdID, target string) {
    result := map[string]interface{}{
        "appId": appID, "commandId": cmdID, "success": true,
    }
    if handler, ok := handlers[target]; ok {
        if err := handler(); err != nil {
            result["success"] = false
            result["error"] = err.Error()
        }
    }
    body, _ := json.Marshal(result)
    http.Post(serverURL+"/result", "application/json", bytes.NewReader(body))
}
```

### Ruby (Rails)

```ruby
# lib/autonomo.rb
require 'net/http'
require 'json'

module Autonomo
  SEVER_URL = "http://localhost:9876"
  @@app_id = nil
  @@handlers = {}

  def self.connect(app_id:, platform:, framework:)
    @@app_id = app_id
    post('/connect', appId: app_id, platform: platform, framework: framework)
    Thread.new { poll_commands }
  end

  def self.report_state(screen:, **data)
    post('/state', appId: @@app_id, screen: screen, data: data)
  end

  def self.register_button(element_id, &handler)
    @@handlers[element_id] = handler
    post('/register-element', appId: @@app_id, elementId: element_id, type: 'button')
  end

  private

  def self.poll_commands
    loop do
      resp = get("/commands?appId=#{@@app_id}")
      if resp.code == '200'
        cmd = JSON.parse(resp.body)
        execute(cmd)
      end
      sleep 0.1
    end
  end

  def self.execute(cmd)
    result = { appId: @@app_id, commandId: cmd['commandId'] }
    begin
      @@handlers[cmd['target']]&.call
      result[:success] = true
    rescue => e
      result[:success] = false
      result[:error] = e.message
    end
    post('/result', result)
  end

  def self.post(path, data)
    uri = URI("#{SERVER_URL}#{path}")
    Net::HTTP.post(uri, data.to_json, 'Content-Type' => 'application/json')
  end

  def self.get(path)
    Net::HTTP.get_response(URI("#{SERVER_URL}#{path}"))
  end
end
```

### Rust

```rust
// autonomo/src/lib.rs
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::thread;

static SERVER_URL: &str = "http://localhost:9876";

pub struct Autonomo {
    client: Client,
    app_id: String,
    handlers: Arc<Mutex<HashMap<String, Box<dyn Fn() -> Result<(), String> + Send>>>>,
}

impl Autonomo {
    pub fn connect(app_id: &str, platform: &str, framework: &str) -> Self {
        let client = Client::new();
        client.post(&format!("{}/connect", SERVER_URL))
            .json(&serde_json::json!({
                "appId": app_id,
                "platform": platform,
                "framework": framework
            }))
            .send()
            .ok();
        
        let autonomo = Self {
            client,
            app_id: app_id.to_string(),
            handlers: Arc::new(Mutex::new(HashMap::new())),
        };
        
        autonomo.start_polling();
        autonomo
    }

    pub fn register_button<F>(&self, element_id: &str, handler: F)
    where F: Fn() -> Result<(), String> + Send + 'static {
        self.handlers.lock().unwrap().insert(element_id.to_string(), Box::new(handler));
        self.client.post(&format!("{}/register-element", SERVER_URL))
            .json(&serde_json::json!({
                "appId": self.app_id,
                "elementId": element_id,
                "type": "button"
            }))
            .send()
            .ok();
    }

    fn start_polling(&self) {
        let app_id = self.app_id.clone();
        let handlers = self.handlers.clone();
        let client = self.client.clone();
        
        thread::spawn(move || {
            loop {
                if let Ok(resp) = client.get(&format!("{}/commands?appId={}", SERVER_URL, app_id)).send() {
                    if resp.status().is_success() {
                        if let Ok(cmd) = resp.json::<Command>() {
                            let result = handlers.lock().unwrap()
                                .get(&cmd.target)
                                .map(|h| h())
                                .unwrap_or(Ok(()));
                            
                            client.post(&format!("{}/result", SERVER_URL))
                                .json(&serde_json::json!({
                                    "appId": app_id,
                                    "commandId": cmd.command_id,
                                    "success": result.is_ok(),
                                    "error": result.err()
                                }))
                                .send()
                                .ok();
                        }
                    }
                }
                thread::sleep(std::time::Duration::from_millis(100));
            }
        });
    }
}

#[derive(Deserialize)]
struct Command {
    #[serde(rename = "commandId")]
    command_id: String,
    target: String,
}
```

## VS Code Extension Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Autonomo Server Process                 │   │
│  │                  (Embedded or Spawned)                   │   │
│  │                                                          │   │
│  │  • Manages all bridge connections                       │   │
│  │  • Routes commands to correct app                       │   │
│  │  • Aggregates state for AI                              │   │
│  │  • Handles timeouts and retries                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────┐     │
│  │                           │                            │     │
│  ▼                           ▼                            ▼     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Bridge      │    │ MCP Tools   │    │ UI Panel    │        │
│  │ Manager     │    │ Provider    │    │             │        │
│  │             │    │             │    │ • Status    │        │
│  │ • Start/    │    │ • autonomo_ │    │ • Elements  │        │
│  │   Stop      │    │   bridges   │    │ • Commands  │        │
│  │ • Health    │    │ • autonomo_ │    │ • Logs      │        │
│  │   Checks    │    │   command   │    │             │        │
│  │ • Logs      │    │ • autonomo_ │    │             │        │
│  │             │    │   state     │    │             │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Extension Activation

```typescript
// extension.ts
import * as vscode from 'vscode';
import { AutonomoServer } from './server';
import { BridgePanel } from './panel';
import { MCPProvider } from './mcp';

let server: AutonomoServer;

export async function activate(context: vscode.ExtensionContext) {
    // Start the Autonomo server
    server = new AutonomoServer();
    await server.start(9876);
    
    // Register UI panel
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('autonomo.bridges', new BridgePanel(server))
    );
    
    // Register MCP tools for Copilot
    context.subscriptions.push(
        vscode.lm.registerTool('autonomo_list_bridges', new MCPProvider.ListBridges(server)),
        vscode.lm.registerTool('autonomo_send_command', new MCPProvider.SendCommand(server)),
        vscode.lm.registerTool('autonomo_get_state', new MCPProvider.GetState(server))
    );
    
    // Status bar
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
    statusBar.text = "$(plug) Autonomo";
    statusBar.command = 'autonomo.showPanel';
    statusBar.show();
    
    // Update status on bridge connect/disconnect
    server.on('bridgeConnected', () => {
        statusBar.text = `$(plug) Autonomo (${server.bridgeCount})`;
    });
}

export function deactivate() {
    server?.stop();
}
```

### MCP Tool Implementations

```typescript
// mcp.ts
import * as vscode from 'vscode';
import { AutonomoServer } from './server';

export namespace MCPProvider {
    export class ListBridges implements vscode.LanguageModelTool {
        constructor(private server: AutonomoServer) {}
        
        async invoke(options: vscode.LanguageModelToolInvocationOptions) {
            const bridges = this.server.getBridges();
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(bridges, null, 2))
            ]);
        }
    }
    
    export class SendCommand implements vscode.LanguageModelTool {
        constructor(private server: AutonomoServer) {}
        
        async invoke(options: vscode.LanguageModelToolInvocationOptions) {
            const { bridgeId, action, target, value } = options.input as any;
            
            const result = await this.server.sendCommand(bridgeId, {
                action,
                target,
                value
            });
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(result, null, 2))
            ]);
        }
    }
    
    export class GetState implements vscode.LanguageModelTool {
        constructor(private server: AutonomoServer) {}
        
        async invoke(options: vscode.LanguageModelToolInvocationOptions) {
            const { bridgeId } = options.input as any;
            const state = this.server.getState(bridgeId);
            
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(JSON.stringify(state, null, 2))
            ]);
        }
    }
}
```

## Benefits of This Approach

| Aspect | SDK Approach | HTTP Protocol Approach |
|--------|--------------|------------------------|
| **Language support** | One SDK per framework | Any language with HTTP |
| **Integration effort** | npm/pip install + config | ~50 lines of code |
| **Dependencies** | Framework-specific | Just HTTP client |
| **Maintenance** | SDK updates per framework | Protocol is stable |
| **Customization** | Limited to SDK features | Full control |
| **Debugging** | Black box | Inspect HTTP traffic |

## Migration Path

For apps already using the SDK approach:

```typescript
// SDK (old)
import { RemoteTestBridge } from '@autonomo/react-native';

// Protocol (new) - SDK becomes thin wrapper
import { RemoteTestBridge } from '@autonomo/react-native';
// Internally, SDK just makes HTTP calls to Autonomo server
```

SDKs can still exist for convenience, but they become thin HTTP wrappers rather than complex integrations.

## Summary

The HTTP Protocol approach makes Autonomo:

1. **Universal** - Works with any language/framework
2. **Simple** - Just HTTP calls, no magic
3. **Inspectable** - Standard HTTP traffic
4. **Extensible** - Apps control their integration
5. **Maintainable** - Protocol changes are rare

The VS Code extension becomes the central hub that:
- Runs the Autonomo server
- Provides MCP tools to Copilot
- Shows bridge status UI
- Manages the integrate → run workflow
