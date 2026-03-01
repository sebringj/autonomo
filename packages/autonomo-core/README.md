# autonomo-core

Framework-agnostic core for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

This is the core TypeScript/JavaScript library that all Autonomo integrations are built on. Use it directly for vanilla JS/TS projects, or when building integrations for frameworks without official packages.

## Installation

```bash
npm install autonomo-core
```

## Quick Start

### 1. Register interactive elements

```typescript
import { 
  registerTapHandler, 
  registerFillHandler, 
  state 
} from 'autonomo-core';

// Register a button
const unregister = registerTapHandler(
  'Login.Submit',
  () => handleLogin(),
  { hint: 'Submits the login form' }
);

// Register an input
const unregister = registerFillHandler(
  'Login.Email',
  (value) => setEmail(value),
  { getValue: () => email }
);

// Set current screen
state.setScreen('login');

// Clean up when element is removed
unregister();
```

### 2. Start the HTTP bridge

```typescript
import { createHttpTransport } from 'autonomo-core';

// Start the bridge server
const transport = createHttpTransport({
  port: 8080,
  onStart: (url) => console.log(`Autonomo ready at ${url}`),
});

// Later, to stop:
transport.stop();
```

### 3. Connect your AI tool

Add to VS Code settings or claude_desktop_config.json:

```json
{
  "mcpServers": {
    "autonomo": {
      "command": "npx",
      "args": ["autonomo", "serve", "--url", "http://localhost:8080"]
    }
  }
}
```

## API Reference

### Registry

The registry tracks all interactive elements in your application.

```typescript
import { registry, ElementType, ElementHandler } from 'autonomo-core';

// Low-level registration
const unregister = registry.register('MyElement', {
  type: ElementType.Button,
  handler: (value) => doSomething(value),
  disabled: false,
  hint: 'Does something',
});

// Get element info
const handler = registry.get('MyElement');
const allElements = registry.getAll();
const matching = registry.find(/^Login\./);

// Subscribe to changes
const unsubscribe = registry.onChange(() => {
  console.log('Registry changed:', registry.list());
});
```

#### Helper Functions

```typescript
import { 
  registerTapHandler,
  registerFillHandler,
  registerToggleHandler 
} from 'autonomo-core';

// Button/link - triggered by tap/click
registerTapHandler('id', () => onClick(), { 
  disabled: false,
  hint: 'Click to submit',
  meta: { customData: true }
});

// Input field - receives text
registerFillHandler('id', (value) => setValue(value), {
  getValue: () => currentValue,
  onSubmit: () => handleEnter(),
  disabled: false,
  hint: 'Enter your email'
});

// Toggle/checkbox - on/off state
registerToggleHandler('id', (value) => setToggle(value === 'true'), {
  getValue: () => String(isToggled),
  disabled: false
});
```

### State

The state manager collects application state for AI inspection.

```typescript
import { state, UserContext, NetworkRequest } from 'autonomo-core';

// Set current screen/route
state.setScreen('dashboard');

// Set user context
state.setUser({
  id: 'user-123',
  email: 'user@example.com',
  role: 'admin'
});

// Add application data
state.mergeData({
  cartItems: 3,
  totalPrice: 45.99
});

// Log errors and messages
state.addError('Failed to load user');
state.addLog('User clicked checkout');
state.addRenderError('Component failed to mount');

// Track network requests
state.addNetworkRequest({
  method: 'POST',
  url: '/api/orders',
  status: 201,
  duration: 245
});

// Get full state snapshot
const snapshot = state.getState();
// → { screen, timestamp, user, elements, customActions, data, errors, logs, ... }

// Subscribe to state changes
const unsubscribe = state.onChange((newState) => {
  console.log('State updated:', newState.screen);
});
```

### Custom Actions

For complex multi-step operations that should be atomic.

```typescript
import { registerCustomAction, customActions, ActionResult } from 'autonomo-core';

// Register a custom action
const unregister = registerCustomAction('enterOTP', (value) => {
  if (!value || value.length !== 6) {
    return { success: false, error: 'OTP must be 6 digits' };
  }
  
  // Fill all OTP boxes
  value.split('').forEach((char, i) => {
    otpInputs[i].value = char;
  });
  
  return { success: true, message: 'OTP entered' };
});

// Execute programmatically
const result = customActions.execute('enterOTP', '123456');

// List available actions
const actions = customActions.list();
```

### Commands

Execute commands programmatically (usually handled by the transport).

```typescript
import { 
  executeCommand,
  navigate,
  press,
  fill,
  submit,
  wait,
  getState,
  setNavigationHandler
} from 'autonomo-core';

// Set up navigation (required for navigate command)
setNavigationHandler((screen) => {
  router.push(screen);
});

// Execute by name
const result = executeCommand('press', 'Login.Submit');
const result = executeCommand('fill', 'Login.Email', 'test@example.com');
const result = executeCommand('navigate', '/dashboard');

// Or use direct functions
const result = press('Login.Submit');
const result = fill('Login.Email', 'test@example.com');
const result = navigate('/dashboard');
const result = wait(1000);
const result = getState();

// All commands return: { success, state, message?, error? }
```

### Transport

HTTP server for AI tool communication.

```typescript
import { createHttpTransport, handleRequest } from 'autonomo-core';

// Full HTTP server
const transport = createHttpTransport({
  port: 8080,
  host: '127.0.0.1',
  cors: true,
  onStart: (url) => console.log(`Ready at ${url}`),
  onCommand: (cmd, target, value) => console.log(`Command: ${cmd}`),
});

// Stop server
transport.stop();

// Or handle requests manually (for custom server integration)
const response = handleRequest('POST', '/command', {
  command: 'press',
  target: 'Login.Submit'
});
// → { status: 200, body: { success: true, state: {...} } }
```

## Framework Integration Examples

### Vanilla JavaScript (Browser)

```html
<script type="module">
import { registerTapHandler, state, createHttpTransport } from 'autonomo-core';

// Track current page
state.setScreen(window.location.pathname);
window.addEventListener('popstate', () => {
  state.setScreen(window.location.pathname);
});

// Register button
const btn = document.getElementById('submit');
registerTapHandler('Form.Submit', () => btn.click());

// Start bridge in dev
if (location.hostname === 'localhost') {
  createHttpTransport({ port: 8080 });
}
</script>
```

### Node.js (Express)

```typescript
import express from 'express';
import { registerTapHandler, state, handleRequest } from 'autonomo-core';

const app = express();

// Register routes as "elements"
app.post('/api/users', (req, res) => {
  // Route handler
});
registerTapHandler('POST /api/users', () => {/* tracked */});

// Autonomo endpoint
app.all('/autonomo/*', express.json(), (req, res) => {
  const path = req.path.replace('/autonomo', '');
  const result = handleRequest(req.method, path, req.body);
  res.status(result.status).json(result.body);
});

app.listen(3000);
```

### Web Components

```typescript
import { registerTapHandler, registerFillHandler, state } from 'autonomo-core';

class MyButton extends HTMLElement {
  private unregister?: () => void;

  connectedCallback() {
    const id = this.getAttribute('autonomo-id') || 'Button';
    this.unregister = registerTapHandler(id, () => {
      this.dispatchEvent(new Event('click'));
    });
  }

  disconnectedCallback() {
    this.unregister?.();
  }
}

customElements.define('my-button', MyButton);
```

### Electron

```typescript
// Main process
import { createHttpTransport } from 'autonomo-core';

if (process.env.NODE_ENV === 'development') {
  createHttpTransport({ port: 8080 });
}

// Renderer process
import { registerTapHandler, state } from 'autonomo-core';

state.setScreen('main-window');
registerTapHandler('App.Settings', () => openSettings());
```

## Building Custom Integrations

The core package is designed to be wrapped by framework-specific packages. Here's the pattern:

```typescript
import { 
  registry, 
  state, 
  ElementType,
  type ElementHandler 
} from 'autonomo-core';

// Create framework-specific hook/composable/decorator
export function useAutonomoButton(id: string, onClick: () => void) {
  // Framework lifecycle: register on mount
  onMount(() => {
    const unregister = registry.register(id, {
      type: ElementType.Button,
      handler: () => onClick(),
    });
    
    // Framework lifecycle: unregister on unmount
    onUnmount(() => unregister());
  });
}

// Screen tracking
export function useAutonomoScreen(name: string, data?: object) {
  onMount(() => {
    state.setScreen(name);
    if (data) state.mergeData(data);
  });
}
```

## License

See [LICENSE.md](../../LICENSE.md) for license information.
