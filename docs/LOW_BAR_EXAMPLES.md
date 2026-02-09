# Low-Bar Integration Examples

> Zero-to-minimal code changes to get Autonomo working.

## Level 0: True Zero Integration (Coming Soon)

Browser extension or accessibility bridge—no code changes at all.

---

## Level 1: Provider Only (No Hooks)

Add the provider, but skip `useTestId` hooks. Autonomo auto-discovers from existing attributes.

### React / Next.js

```tsx
// app/layout.tsx or _app.tsx
import { AutonomoProvider } from '@autonomo/react';

export default function RootLayout({ children }) {
  return (
    <AutonomoProvider 
      name="my-app" 
      enabled={process.env.NODE_ENV === 'development'}
      autoDiscover={true}  // ← Enable auto-discovery
    >
      {children}
    </AutonomoProvider>
  );
}
```

Your existing code works as-is:

```tsx
// No changes needed!
function LoginForm() {
  return (
    <form>
      {/* Autonomo finds these from existing attributes */}
      <input 
        data-testid="email-input"    {/* ← Auto-discovered */}
        type="email" 
        placeholder="Email" 
      />
      <input 
        aria-label="Password"         {/* ← Auto-discovered */}
        type="password" 
      />
      <button type="submit">Login</button>  {/* ← Inferred from text */}
    </form>
  );
}
```

**What AI sees:**
```json
{
  "elements": [
    { "id": "Auto.EmailInput", "type": "input", "actions": ["fillIn", "submit"] },
    { "id": "Auto.Password", "type": "input", "actions": ["fillIn", "submit"] },
    { "id": "Auto.Login", "type": "button", "actions": ["press"] }
  ]
}
```

---

## Level 2: Attribute Convention (Explicit, No Imports)

Use `data-auto` attributes for explicit naming without any imports:

```tsx
function LoginForm() {
  return (
    <form>
      <input data-auto="Login.Email" type="email" />
      <input data-auto="Login.Password" type="password" />
      <button data-auto="Login.Submit" type="submit">Login</button>
    </form>
  );
}
```

**What AI sees:**
```json
{
  "elements": [
    { "id": "Login.Email", "type": "input", "actions": ["fillIn", "submit"] },
    { "id": "Login.Password", "type": "input", "actions": ["fillIn", "submit"] },
    { "id": "Login.Submit", "type": "button", "actions": ["press"] }
  ]
}
```

---

## Level 3: Full Integration (Maximum Power)

When you need custom actions, auth bypass, network tracking:

```tsx
import { useTestId, useCustomAction } from '@autonomo/react';

function LoginForm() {
  const emailId = useTestId('Login.Email');
  const passwordId = useTestId('Login.Password');
  const submitId = useTestId('Login.Submit');
  
  // Custom action for dev login bypass
  useCustomAction('devLogin', {
    description: 'Bypass OAuth for local testing',
    args: { email: { type: 'string', required: true } },
    handler: async ({ email }) => {
      await devAuthService.loginAs(email);
      return { success: true };
    },
  });
  
  return (
    <form>
      <input {...emailId} type="email" />
      <input {...passwordId} type="password" />
      <button {...submitId} type="submit">Login</button>
    </form>
  );
}
```

---

## Comparison

| Feature | Level 0 | Level 1 | Level 2 | Level 3 |
|---------|---------|---------|---------|---------|
| Code changes | None | 1 line | Attributes | Hooks |
| Element discovery | ✅ | ✅ | ✅ | ✅ |
| Explicit IDs | ❌ | ❌ | ✅ | ✅ |
| Custom actions | ❌ | ❌ | ❌ | ✅ |
| Auth bypass | ❌ | ❌ | ❌ | ✅ |
| Network tracking | ❌ | ❌ | ❌ | ✅ |
| Multi-device | ❌ | ✅ | ✅ | ✅ |

**Recommendation**: Start at Level 1, upgrade to Level 3 for features that need custom actions.
