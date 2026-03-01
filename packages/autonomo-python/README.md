# autonomo

> ⚠️ **Testing/Source Package** - This package is currently installed from source and is not published as a standalone PyPI package.

Python integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

WebSocket is the primary integration path. HTTP transport helpers are legacy/optional.

## Installation

```bash
pip install git+https://github.com/sebringj/autonomo.git#subdirectory=packages/autonomo-python
```

## Quick Start

### 1. Register elements

```python
from autonomo import register_tap_handler, register_fill_handler, state

# Register a button
unregister = register_tap_handler(
    "Login.Submit",
    lambda: handle_login(),
    hint="Submits the login form",
)

# Register an input
unregister = register_fill_handler(
    "Login.Email",
    lambda value: set_email(value),
    get_value=lambda: email,
)

# Set current screen
state.set_screen("login")
```

### 2. Connect to MCP WebSocket server

```python
# No in-app HTTP server required.
# Register handlers and run with MCP server configured on AUTONOMO_PORT.
```

### 3. Connect your AI tool

Add to `.vscode/mcp.json`:

```json
{
    "servers": {
        "autonomo": {
            "command": "npx",
            "args": ["-y", "autonomo"],
            "env": {
                "AUTONOMO_PORT": "9876"
            }
    }
  }
}
```

## Custom Actions

For complex flows:

```python
from autonomo import register_custom_action, ActionResult

def enter_otp(value):
    # Fill all OTP boxes
    for i, char in enumerate(value or ""):
        otp_fields[i].set(char)
    return ActionResult(success=True, message="OTP entered")

unregister = register_custom_action("enterOTP", enter_otp)
```

## Framework Integration

### Flask

```python
from flask import Flask
from autonomo import state, register_tap_handler

app = Flask(__name__)

@app.route("/")
def index():
    state.set_screen("home")
    return render_template("index.html")
```

### Django

```python
from autonomo import state

class MyView(View):
    def get(self, request):
        state.set_screen("my_view")
        return render(request, "my_view.html")
```

### Tkinter

```python
import tkinter as tk
from autonomo import register_tap_handler, state, create_http_transport, TransportConfig

root = tk.Tk()
state.set_screen("main")

def on_click():
    print("Button clicked!")

btn = tk.Button(root, text="Click Me", command=on_click)
btn.pack()

# Register with Autonomo
unregister = register_tap_handler("Main.ClickMe", on_click)

# Start bridge
transport = create_http_transport(TransportConfig(port=8080))

root.mainloop()
transport.stop()
```

## API Reference

### Registry

- `register_tap_handler(id, handler, ...)` - Register a tappable element
- `register_fill_handler(id, handler, ...)` - Register a fillable input
- `register_toggle_handler(id, handler, ...)` - Register a toggle

### State

- `state.set_screen(name)` - Set current screen
- `state.set_user(context)` - Set user context
- `state.merge_data(data)` - Add app-specific data
- `state.add_error(error)` - Log an error

### Commands

- `execute_command(cmd, target, value)` - Execute a command programmatically

### Transport

- `create_http_transport(config)` - Legacy optional HTTP server helper
- `handle_request(method, path, body)` - Handle request manually

## License

See [LICENSE.md](../../LICENSE.md) for license information.
