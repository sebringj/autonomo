# Autonomo Quick Start

> **For AI Assistants**: This document contains installation instructions. Follow each step in order.

## What to Install

Autonomo has two parts:
1. **MCP Server** - Connects your AI tool to apps (install once globally)
2. **App Bridge** - Embedded in your app to expose UI elements (install per-project)

---

## Step 1: Install MCP Server (Global)

```bash
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server
```

## Step 2: Configure MCP in VS Code

Create or update `.vscode/mcp.json` in the project root:

```json
{
  "servers": {
    "autonomo": {
      "command": "autonomo-mcp",
      "args": ["--multi"]
    }
  }
}
```

For **Cursor** or **Windsurf**: Add the same server config to your MCP settings.

## Step 3: Install App Bridge

### For React / Next.js / Remix

```bash
npm install github:sebringj/autonomo#packages/@autonomo/react
```

Add provider to your app root (e.g., `App.tsx`, `layout.tsx`, or `_app.tsx`):

```tsx
import { AutonomoProvider } from '@autonomo/react';

export default function App({ children }) {
  return (
    <AutonomoProvider name="my-app" enabled={process.env.NODE_ENV === 'development'}>
      {children}
    </AutonomoProvider>
  );
}
```

### For React Native / Expo

```bash
npm install github:sebringj/autonomo#packages/@autonomo/react-native
```

Add provider to your app root:

```tsx
import { AutonomoProvider } from '@autonomo/react-native';

export default function App() {
  return (
    <AutonomoProvider name="my-app" enabled={__DEV__}>
      <Navigation />
    </AutonomoProvider>
  );
}
```

## Step 4: Mark Interactive Elements

Import `useTestId` and spread it on interactive elements:

```tsx
import { useTestId } from '@autonomo/react'; // or '@autonomo/react-native'

function LoginScreen() {
  const emailTestId = useTestId('Login.Email');
  const passwordTestId = useTestId('Login.Password');
  const submitTestId = useTestId('Login.Submit');

  return (
    <form>
      <input {...emailTestId} type="email" placeholder="Email" />
      <input {...passwordTestId} type="password" placeholder="Password" />
      <button {...submitTestId} type="submit">Login</button>
    </form>
  );
}
```

**Naming convention**: Use `Screen.Element` format (e.g., `Login.Submit`, `Home.ProfileButton`).

## Step 5: Verify Installation

1. Start the app (`npm run dev` or `expo start`)
2. The AI can now use Autonomo tools to interact with the app

**Test commands to try:**
- "List all connected bridges" → Should show your app
- "Get state from my app" → Should show registered elements
- "Press Login.Submit" → Should trigger the button

---

## Troubleshooting

### MCP Server Not Found
```bash
# Verify installation
which autonomo-mcp
# If not found, reinstall:
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server
```

### App Not Connecting
1. Ensure `AutonomoProvider` has `enabled={true}` (or `__DEV__` / `process.env.NODE_ENV === 'development'`)
2. Check browser console / React Native logs for connection errors
3. Restart VS Code to reload MCP server

### Elements Not Appearing
```tsx
// ✅ Correct - use useTestId hook
const testId = useTestId('Button.Submit');
return <button {...testId}>Submit</button>;

// ❌ Wrong - plain data attribute won't register
return <button data-testid="submit">Submit</button>;
```

---

## Other Platforms

For Swift, Flutter, Python, Ruby, Kotlin, or C# — see the platform-specific README:

- [Swift/iOS](./packages/autonomo-swift/README.md)
- [Flutter](./packages/autonomo_flutter/README.md)  
- [Python](./packages/autonomo-python/README.md)
- [Ruby](./packages/autonomo-ruby/README.md)
- [Kotlin](./packages/autonomo-kotlin/README.md)
- [C#/.NET](./packages/Autonomo.CSharp/README.md)

---

## Full Documentation

- [README.md](./README.md) - Overview and architecture
- [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) - How MCP tools work
- [PROTOCOL_SPECIFICATION.md](./PROTOCOL_SPECIFICATION.md) - HTTP API reference
