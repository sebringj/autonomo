# autonomo

> ⚠️ **GitHub Deployment Only** - This package is deployed directly from GitHub for VS Code MCP integration. It is not published to npm.

MCP (Model Context Protocol) server for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

### VS Code MCP Configuration

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "autonomo": {
      "command": "npx",
      "args": ["-y", "github:sebringj/autonomo/packages/autonomo"],
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

Or with an absolute Node.js path:

```json
{
  "servers": {
    "autonomo": {
      "command": "/path/to/node",
      "args": ["/path/to/autonomo/packages/autonomo/dist/index.js"],
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTONOMO_PORT` | `9876` | WebSocket server port for app connections |

## Features

- WebSocket server for app-to-AI communication
- MCP tools for AI agents: `get_state`, `send_command`, `wait_for`, `run_scenario`, `list_bridges`
- Multi-app support (multiple bridges)
- Graceful shutdown handling

## Architecture

```
VS Code Copilot ←→ MCP Server ←→ WebSocket ←→ Your App
```

The MCP server provides tools that AI agents can use to:
1. **get_state** - Get current app state (screen, elements, errors)
2. **send_command** - Execute actions (press, fill, toggle, navigate)
3. **wait_for** - Wait for conditions (element appears, screen changes)
4. **run_scenario** - Execute multi-step test scenarios
5. **list_bridges** - List connected apps
