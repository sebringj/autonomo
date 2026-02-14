# Autonomo Quick Start

> **For AI Assistants**: This document contains installation instructions. Follow each step in order.

## What You're Installing

Autonomo gives your AI coding assistant live eyes and hands on your running app. After setup, your AI can see every screen, interact with every element, and verify its own work — in real time.

Two parts:
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
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

For **Cursor** or **Windsurf**: Add the same server config to your MCP settings.

> **Multiple VS Code instances:** Each workspace should use a different port (9876, 9877, etc.).

## Step 3: Install App Bridge

### For React / Next.js / Remix

```bash
npm install @sebringj/autonomo-react
```

Add to your app root (e.g., `App.tsx`, `layout.tsx`, or `_app.tsx`):

```tsx
import { useAutonomo } from '@sebringj/autonomo-react';

export default function App({ children }) {
  // Connect to Autonomo WebSocket server
  const { connected } = useAutonomo({ 
    name: 'my-app', 
    devOnly: true  // Only runs in development
  });
  
  return (
    <div>
      {connected && <span style={{ position: 'fixed', bottom: 8, right: 8 }}>🟢</span>}
      {children}
    </div>
  );
}
```

Create a `.env` file in your project root:
```bash
VITE_AUTONOMO_PORT=9876
```

### For React Native / Expo

```bash
npm install github:sebringj/autonomo#packages/@autonomo/react-native
```

Add to your app root:

```tsx
import { useAutonomo } from '@autonomo/react-native';

export default function App() {
  const { connected } = useAutonomo({ 
    name: 'my-app', 
    devOnly: true  // Only runs when __DEV__ is true
  });
  
  return <Navigation />;
}
```

### For Angular

```bash
npm install github:sebringj/autonomo#packages/@autonomo/angular
```

Add module to your AppModule:

```typescript
import { AutonomoModule } from '@autonomo/angular';

@NgModule({
  imports: [
    AutonomoModule.forRoot({
      name: 'my-app',
      debug: !environment.production,
    }),
  ],
})
export class AppModule {}
```

Mark elements with directives:

```html
<input autonomoFill="Login.Email" [(ngModel)]="email" />
<button autonomoTap="Login.Submit" (click)="onSubmit()">Login</button>
```

## Step 4: Register Interactive Elements

Use hooks to register elements the AI can interact with:

```tsx
import { useTapHandler, useFillHandler, useScreen } from '@autonomo/react';
import { useState } from 'react';

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Set current screen name
  useScreen('Login');
  
  // Register input handlers
  useFillHandler('Login.Email', setEmail, { hint: 'Email input' });
  useFillHandler('Login.Password', setPassword, { hint: 'Password input' });
  
  // Register button handler
  useTapHandler('Login.Submit', () => handleSubmit(), { hint: 'Submit login' });
  
  const handleSubmit = () => {
    // Your login logic
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email} 
        onChange={e => setEmail(e.target.value)} 
        placeholder="Email" 
      />
      <input 
        type="password" 
        value={password} 
        onChange={e => setPassword(e.target.value)} 
        placeholder="Password" 
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

**Naming convention**: Use `Screen.Element` format (e.g., `Login.Submit`, `Home.ProfileButton`).

## Step 5: Start Developing with Eyes

1. Start the app (`npm run dev` or `expo start`)
2. Your AI can now see and interact with the running app

**Try these:**
- "What elements can you see in my app?" → Should show registered elements
- "Get state from my app" → Should show current screen and UI state
- "Press Login.Submit" → Should trigger the button and show what happened

Your AI sees the result of every action. No more guessing.

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
1. Ensure `useAutonomo` has `devOnly: false` if testing in production mode
2. Check that `VITE_AUTONOMO_PORT` in `.env` matches `AUTONOMO_PORT` in `mcp.json`
3. Check browser console for connection errors
4. Restart VS Code to reload MCP server

### Elements Not Appearing
```tsx
// ✅ Correct - use handler hooks to register elements
useTapHandler('Button.Submit', () => handleSubmit(), { hint: 'Submit form' });
useFillHandler('Input.Email', setEmail, { hint: 'Email input' });

// ❌ Wrong - plain data attribute won't register
return <button data-testid=\"submit\">Submit</button>;
```

---

## Other Platforms

### Deno Fresh 2.0

See [Deno Fresh Integration Guide](./docs/DENO_FRESH_INTEGRATION.md) for complete instructions.

**Quick version:**

1. Create `islands/AutonomoBridge.tsx` (see guide for full code)
2. Add to your main route (NOT `_app.tsx` - islands don't hydrate there!):

```tsx
// routes/dashboard/index.tsx
import AutonomoBridge from "../../islands/AutonomoBridge.tsx";

const isDev = Deno.env.get("DENO_ENV") !== "production";

export default function Page() {
  return (
    <>
      <YourApp />
      {isDev && <AutonomoBridge debug />}
    </>
  );
}
```

3. Configure MCP in `.vscode/mcp.json`:
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

**Key insight**: Fresh islands in `_app.tsx` are server-rendered only. The bridge must be in actual route components to hydrate and connect via WebSocket.

---

For Swift, Flutter, Python, Ruby, Kotlin, C#, or Angular — see the platform-specific README:

- [Swift/iOS](./packages/autonomo-swift/README.md)
- [Flutter](./packages/autonomo_flutter/README.md)
- [Python](./packages/autonomo-python/README.md)
- [Ruby](./packages/autonomo-ruby/README.md)
- [Kotlin](./packages/autonomo-kotlin/README.md)
- [C#/.NET](./packages/Autonomo.CSharp/README.md)
- [Angular](./packages/@autonomo/angular/README.md)

---

## Full Documentation

- [README.md](./README.md) - Overview and architecture
- [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) - How MCP tools work
- [PROTOCOL_SPECIFICATION.md](./PROTOCOL_SPECIFICATION.md) - HTTP API reference
