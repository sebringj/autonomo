# Custom Actions

## What Are Custom Actions?

Custom actions let apps expose **any operation** as an Autonomo command. They're perfect for:

- **Bypassing auth flows** (OTP, OAuth, SSO)
- **Setting up test state** (seed data, clear cache)
- **Role switching** (admin, user, guest)
- **Complex operations** (checkout flow, file upload)

## Why Use Custom Actions?

### The Problem with UI-Based Auth Testing

```
Traditional approach (slow, fragile):
1. Navigate to login
2. Fill phone number
3. Press submit
4. Wait for OTP screen
5. Fill OTP code (where does AI get this?)
6. Press verify
7. Wait for redirect
8. Finally at dashboard... maybe

Problems:
- OTP codes are real/random in production
- OAuth redirects to external sites
- SSO involves enterprise IdP
- 2FA requires physical device
```

### The Custom Action Solution

```
Custom action approach (fast, reliable):
1. send_command(action="custom", target="devLogin", value="5551234567")
2. get_state → Already at dashboard, logged in

Benefits:
- Works in any environment
- Deterministic
- Fast (no network waits)
- Testable
```

## Registering Custom Actions

### React Native

```tsx
import { useAutonomoCustomAction } from 'autonomo-react-native';

function App() {
  useAutonomoCustomAction('devLogin', async (phone) => {
    // Directly call your auth API with dev credentials
    const { session } = await supabase.auth.signInWithOtp({
      phone: `+1${phone}`,
      options: { data: { dev_mode: true } }
    });
    
    // Auto-verify in dev mode
    if (__DEV__) {
      await supabase.auth.verifyOtp({
        phone: `+1${phone}`,
        token: '111111', // Dev OTP always works
        type: 'sms'
      });
    }
  });
  
  return <AppContent />;
}
```

### Web (React/Preact)

```tsx
import { autonomoRegisterCustomAction } from 'autonomo-react';

useEffect(() => {
  return autonomoRegisterCustomAction('devLogin', async (phone) => {
    // Same pattern - bypass real OTP flow
    await authService.devLogin(phone);
  });
}, []);
```

### Direct Registration

```typescript
import { autonomoRegisterCustomAction } from 'autonomo-core';

// Simple action
autonomoRegisterCustomAction('clearCache', () => {
  localStorage.clear();
  sessionStorage.clear();
});

// Action with value
autonomoRegisterCustomAction('switchRole', (role) => {
  store.setActiveRole(role);
});

// Async action
autonomoRegisterCustomAction('seedTestData', async (scenario) => {
  await api.post('/test/seed', { scenario });
});
```

## Common Custom Actions

### Authentication

```typescript
// Bypass OTP
autonomoRegisterCustomAction('devLogin', async (phone) => {
  await auth.devSignIn(phone, '111111');
});

// Login as specific user
autonomoRegisterCustomAction('loginAs', async (email) => {
  await auth.impersonate(email);
});

// Logout
autonomoRegisterCustomAction('logout', async () => {
  await auth.signOut();
});
```

### Role Management

```typescript
// Switch active role
autonomoRegisterCustomAction('switchRole', (role) => {
  userStore.setActiveRole(role);
});

// Add role to user
autonomoRegisterCustomAction('addRole', async (role) => {
  await api.post('/user/roles', { role });
  await userStore.refresh();
});
```

### Test Data

```typescript
// Seed database
autonomoRegisterCustomAction('seedData', async (scenario) => {
  await api.post('/test/seed', { scenario });
});

// Clear test data
autonomoRegisterCustomAction('clearData', async () => {
  await api.post('/test/reset');
});

// Create test entity
autonomoRegisterCustomAction('createTeam', async (name) => {
  await api.post('/teams', { name, testMode: true });
});
```

### Navigation Shortcuts

```typescript
// Deep link to specific state
autonomoRegisterCustomAction('goToTeam', async (teamId) => {
  navigation.navigate('Team', { id: teamId });
});

// Open modal programmatically
autonomoRegisterCustomAction('openModal', (modalName) => {
  modalStore.open(modalName);
});
```

## Using Custom Actions

### Check Available Actions

```
autonomo_get_state(bridge="myapp")

Response includes:
{
  ...
  customActions: ["devLogin", "switchRole", "seedData", "clearData"]
}
```

### Invoke Custom Action

```
autonomo_send_command(
  bridge="myapp",
  action="custom",
  target="devLogin",      // Action name
  value="5551234567"      // Optional parameter
)
```

### In Scenarios

```
autonomo_run_scenario(
  bridge="myapp",
  scenario=[
    { action: "custom", target: "devLogin", value: "5551234567" },
    { action: "waitFor", condition: "screen:/dashboard" },
    { action: "custom", target: "switchRole", value: "admin" },
    { action: "press", target: "AdminPanel.UsersTab" }
  ]
)
```

## Best Practices

### 1. Keep Actions Focused
```typescript
// ✓ Good - single responsibility
autonomoRegisterCustomAction('login', (phone) => auth.login(phone));
autonomoRegisterCustomAction('addRole', (role) => user.addRole(role));

// ✗ Bad - too many things
autonomoRegisterCustomAction('setupUser', (data) => {
  auth.login(data.phone);
  user.addRole(data.role);
  user.setProfile(data.profile);
  // Too much!
});
```

### 2. Dev-Only Actions
```typescript
if (__DEV__ || process.env.NODE_ENV === 'development') {
  autonomoRegisterCustomAction('devLogin', devLoginHandler);
  autonomoRegisterCustomAction('seedData', seedDataHandler);
}
```

### 3. Document Parameters
```typescript
autonomoRegisterCustomAction('createTeam', (params) => {
  // params: JSON string with { name: string, ageGroup?: string }
  const { name, ageGroup = 'U12' } = JSON.parse(params);
  return teamService.create({ name, ageGroup });
});
```

### 4. Return Meaningful Results
```typescript
autonomoRegisterCustomAction('createTeam', async (name) => {
  const team = await api.createTeam(name);
  return { teamId: team.id, name: team.name }; // Useful for next steps
});
```
