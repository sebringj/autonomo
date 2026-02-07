# Security & Coding Guidelines

> **⚠️ READ THIS FIRST** — Especially if you're using AI to generate code quickly ("vibe coding").

---

## 🚨 The #1 Rule: Dev Code ≠ Production Code

**Custom actions, bypass logic, and test helpers must NEVER reach production.**

```typescript
// ✅ SAFE: Gated behind dev check
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', handler);
}

// ❌ DANGEROUS: Will ship to production!
autonomoRegisterCustomAction('devLogin', handler);
```

### Environment Checks by Platform

| Platform | Dev Check |
|----------|-----------|
| React Native | `if (__DEV__)` |
| React (CRA) | `if (process.env.NODE_ENV === 'development')` |
| Vite | `if (import.meta.env.DEV)` |
| Next.js | `if (process.env.NODE_ENV !== 'production')` |
| Node.js | `if (process.env.NODE_ENV === 'development')` |
| Deno | `if (Deno.env.get('DENO_ENV') === 'development')` |

---

## 🔐 Security Fundamentals

### Never Commit Secrets

```bash
# ❌ NEVER do this
const API_KEY = 'sk_live_abc123...';
const DB_PASSWORD = 'supersecret';

# ✅ Use environment variables
const API_KEY = process.env.STRIPE_API_KEY;
const DB_PASSWORD = process.env.DB_PASSWORD;
```

**Add to `.gitignore`:**
```
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

### Never Trust User Input

```typescript
// ❌ SQL Injection vulnerable
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ Parameterized query
const query = `SELECT * FROM users WHERE id = $1`;
const result = await db.query(query, [userId]);
```

```typescript
// ❌ XSS vulnerable
element.innerHTML = userInput;

// ✅ Safe
element.textContent = userInput;
// Or use a sanitization library
```

### Validate on the Backend

```typescript
// ❌ Client-only validation (can be bypassed)
if (isValidEmail(email)) {
  await api.createAccount(email);
}

// ✅ Always validate server-side too
// Backend:
function createAccount(email) {
  if (!isValidEmail(email)) {
    throw new Error('Invalid email');
  }
  // proceed...
}
```

### Use HTTPS in Production

```typescript
// ❌ Insecure
const API_URL = 'http://api.example.com';

// ✅ Secure
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.example.com'
  : 'http://localhost:3000';
```

---

## 🧹 DRY: Don't Repeat Yourself

### Extract Reusable Functions

```typescript
// ❌ Copy-pasted everywhere
// File 1:
const formattedDate = new Date(date).toLocaleDateString('en-US', {
  year: 'numeric', month: 'long', day: 'numeric'
});
// File 2: (same code copy-pasted)
// File 3: (same code copy-pasted)

// ✅ Single source of truth
// utils/format.ts
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

// Then import everywhere
import { formatDate } from '@/utils/format';
```

### Use Constants for Magic Values

```typescript
// ❌ Magic numbers/strings scattered
if (user.role === 'admin') { ... }
if (retries > 3) { ... }
if (timeout > 30000) { ... }

// ✅ Named constants
const ROLES = { ADMIN: 'admin', USER: 'user' } as const;
const MAX_RETRIES = 3;
const TIMEOUT_MS = 30_000;

if (user.role === ROLES.ADMIN) { ... }
if (retries > MAX_RETRIES) { ... }
```

### Create Custom Hooks (React)

```typescript
// ❌ Same logic in multiple components
function ComponentA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);
  // ...
}

// ✅ Extract to hook
function useApiData(url: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [url]);
  
  return { data, loading, error };
}

// Then use everywhere
function ComponentA() {
  const { data, loading } = useApiData('/api/data');
}
```

---

## 🏗️ Code Organization

### Single Responsibility

```typescript
// ❌ One function doing everything
async function handleSubmit(formData) {
  // Validate
  if (!formData.email) throw new Error('Email required');
  if (!formData.password) throw new Error('Password required');
  
  // Hash password
  const hashed = await bcrypt.hash(formData.password, 10);
  
  // Save to database
  const user = await db.users.create({ email: formData.email, password: hashed });
  
  // Send welcome email
  await sendEmail(formData.email, 'Welcome!', '...');
  
  // Create session
  const session = await createSession(user.id);
  
  return session;
}

// ✅ Separate concerns
async function handleSubmit(formData) {
  validateRegistration(formData);
  const user = await createUser(formData);
  await sendWelcomeEmail(user.email);
  return createSession(user.id);
}
```

### Consistent File Structure

```
src/
├── components/     # UI components
├── hooks/          # Custom React hooks
├── utils/          # Pure utility functions
├── services/       # API calls, external services
├── stores/         # State management
├── types/          # TypeScript types/interfaces
└── constants/      # App-wide constants
```

---

## ⚠️ Common "Vibe Coding" Mistakes

### 1. Not Handling Errors

```typescript
// ❌ Hope for the best
const data = await fetch('/api/data').then(r => r.json());

// ✅ Handle failures
try {
  const response = await fetch('/api/data');
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('Failed to fetch:', error);
  // Show user-friendly error
}
```

### 2. Not Handling Loading States

```typescript
// ❌ Flash of undefined content
function Profile() {
  const user = useUser();
  return <h1>{user.name}</h1>;  // Crashes if user is null!
}

// ✅ Handle all states
function Profile() {
  const { user, loading, error } = useUser();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  if (!user) return <NotFound />;
  
  return <h1>{user.name}</h1>;
}
```

### 3. Storing Sensitive Data Insecurely

```typescript
// ❌ Tokens in localStorage (XSS vulnerable)
localStorage.setItem('authToken', token);

// ✅ Use httpOnly cookies (set by server)
// Or secure storage on mobile
import * as SecureStore from 'expo-secure-store';
await SecureStore.setItemAsync('authToken', token);
```

### 4. Not Cleaning Up Side Effects

```typescript
// ❌ Memory leak - listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ Clean up
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 5. Mutating State Directly

```typescript
// ❌ Direct mutation (React won't re-render)
const [items, setItems] = useState([]);
items.push(newItem);  // WRONG!

// ✅ Create new array
setItems([...items, newItem]);
// Or
setItems(prev => [...prev, newItem]);
```

---

## 🧪 Testing Custom Actions Safely

### Always Scope to Development

```typescript
// Good pattern for Autonomo custom actions
function registerDevActions() {
  // Only runs in development
  if (!__DEV__) return;
  
  autonomoRegisterCustomAction('devLogin', async (phone) => {
    // Skip real OTP
    await auth.signInWithPhone(phone);
    await auth.verifyOtp(phone, '111111');
  });
  
  autonomoRegisterCustomAction('seedTestData', async () => {
    await db.seedTestUsers();
    await db.seedTestTeams();
  });
  
  autonomoRegisterCustomAction('clearData', async () => {
    await db.clearTestData();
  });
}

// Call once at app startup
registerDevActions();
```

### Never Expose Internal State Unintentionally

```typescript
// ❌ Exposes entire database state
autonomoRegisterCustomAction('getDebugState', () => {
  return { users: db.users, tokens: auth.tokens, secrets: config };
});

// ✅ Only expose what's needed for testing
autonomoRegisterCustomAction('getTestState', () => {
  return { 
    userCount: db.users.length,
    currentScreen: navigation.currentRoute,
  };
});
```

---

## 📋 Pre-Commit Checklist

Before committing code generated with AI assistance:

```
☐ No hardcoded secrets or API keys
☐ Dev-only code is properly gated
☐ User input is validated/sanitized
☐ Error states are handled
☐ Loading states are handled
☐ Side effects are cleaned up
☐ No console.log statements left in
☐ TypeScript has no errors
☐ Tests pass (if applicable)
```

---

## 🔗 Further Reading

- [OWASP Top 10](https://owasp.org/Top10/) — Most critical web security risks
- [React Security Best Practices](https://snyk.io/blog/10-react-security-best-practices/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
