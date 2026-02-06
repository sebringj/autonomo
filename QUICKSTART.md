# Autonomo Quick Start

> Get your AI testing your app in 5 minutes

## What is This?

Autonomo lets your AI coding assistant (Copilot, Claude, Cursor) **actually interact with your running app** - pressing buttons, filling forms, navigating screens - and see the results. No more "that should work" - now it's "I verified it works."

## TL;DR Setup

```bash
# 1. Install MCP server globally
npm install -g github:sebringj/autonomo#packages/@autonomo/mcp-server

# 2. Add to VS Code MCP config (.vscode/mcp.json)
echo '{
  "servers": {
    "autonomo": {
      "command": "autonomo-mcp",
      "args": ["--multi"]
    }
  }
}' > .vscode/mcp.json

# 3. Install the bridge for your framework (pick one)
npm install github:sebringj/autonomo#packages/@autonomo/react
# OR
npm install github:sebringj/autonomo#packages/@autonomo/react-native
```

## Add to Your App

### React / Next.js / Remix

```tsx
// App.tsx or layout.tsx
import { AutonomoProvider } from '@autonomo/react';

export default function App({ children }) {
  return (
    <AutonomoProvider name="my-app" enabled={process.env.NODE_ENV === 'development'}>
      {children}
    </AutonomoProvider>
  );
}
```

### React Native / Expo

```tsx
// App.tsx
import { AutonomoProvider } from '@autonomo/react-native';

export default function App() {
  return (
    <AutonomoProvider name="my-app" enabled={__DEV__}>
      <Navigation />
    </AutonomoProvider>
  );
}
```

### Mark Interactive Elements

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

## Test It

1. Start your app (`npm run dev` or `expo start`)
2. Open VS Code with your project
3. Ask your AI:

> "What elements can you see in my app?"

The AI should respond with the registered elements (`Login.Email`, `Login.Password`, `Login.Submit`).

> "Fill in Login.Email with 'test@example.com' and press Login.Submit"

The AI will actually perform these actions and report what happened.

## That's It!

Your AI can now:
- See what's on screen
- Press buttons
- Fill in forms
- Navigate between screens
- Verify actions worked
- Debug when things fail

## Next Steps

- **More frameworks**: See [README.md](./README.md#installation) for Swift, Flutter, Python, Ruby
- **API testing**: Expose API endpoints as "elements" - see [PROTOCOL_SPECIFICATION.md](./PROTOCOL_SPECIFICATION.md)
- **Multi-instance**: Test multiple browser tabs/simulators simultaneously
- **Deep dive**: [MCP_INTEGRATION.md](./MCP_INTEGRATION.md) explains how it all works

## Common Issues

### "AI can't see my app"

1. Make sure your app is running (`localhost:3000` or similar)
2. Check the AutonomoProvider is enabled
3. Restart the MCP server: close and reopen VS Code

### "Elements not showing up"

Make sure you're using `useTestId()` hook on interactive elements:

```tsx
// ✅ Correct
const testId = useTestId('Button.Submit');
return <button {...testId}>Submit</button>;

// ❌ Won't work - just a data attribute
return <button data-testid="submit">Submit</button>;
```

### "Commands not working"

Check the browser console / React Native debugger for errors. The bridge logs all commands and results.

---

**Need help?** Open an issue on GitHub or check the [full documentation](./README.md).
