# Authentication Bypass Strategies

> **Purpose**: Skip OTP/OAuth flows that block AI-driven testing.

---

## Strategy 1: Dev OTP Code (Recommended)

Configure your auth system to accept a fixed OTP in development:

```typescript
// Backend: auth service
async function verifyOtp(phone: string, code: string) {
  // In development, accept magic code
  if (process.env.NODE_ENV === 'development' && code === '111111') {
    return { valid: true };
  }
  
  // Production: verify with real provider
  return await twilioVerify(phone, code);
}
```

```typescript
// App: Register custom action
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', async (phone) => {
    await auth.sendOtp(phone);
    await auth.verifyOtp(phone, '111111'); // Magic code
  });
}
```

**Usage**:
```
autonomo_send_command(bridge="myapp", action="custom", target="devLogin", value="5551234567")
```

---

## Strategy 2: Supabase Local Auth

Supabase's local emulator supports auto-confirm:

```bash
# supabase/config.toml
[auth]
enable_signup = true
enable_anonymous_sign_ins = true

[auth.email]
enable_confirmations = false  # Skip email verification locally
```

```typescript
// Custom action using Supabase
autonomoRegisterCustomAction('devLogin', async (phone) => {
  const { data, error } = await supabase.auth.signInWithOtp({
    phone: `+1${phone}`,
  });
  
  // Local Supabase: auto-verify with any code
  if (__DEV__) {
    await supabase.auth.verifyOtp({
      phone: `+1${phone}`,
      token: '111111',
      type: 'sms'
    });
  }
});
```

---

## Strategy 3: Firebase Auth Emulator

```bash
# Start Firebase emulator
firebase emulators:start --only auth
```

```typescript
// Connect to emulator in dev
if (__DEV__) {
  import { connectAuthEmulator } from 'firebase/auth';
  connectAuthEmulator(auth, 'http://localhost:9099');
}

// Custom action - Firebase emulator accepts any verification code
autonomoRegisterCustomAction('devLogin', async (phone) => {
  const confirmationResult = await signInWithPhoneNumber(auth, phone);
  // Emulator accepts any 6-digit code
  await confirmationResult.confirm('123456');
});
```

---

## Strategy 4: Auth0 Test Users

Auth0 allows test users that bypass normal flows:

```typescript
autonomoRegisterCustomAction('devLogin', async (email) => {
  const response = await fetch(`${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    body: JSON.stringify({
      grant_type: 'password',
      username: email,
      password: process.env.TEST_USER_PASSWORD,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
    })
  });
  const { access_token } = await response.json();
  await setAuthToken(access_token);
});
```

---

## Strategy 5: Clerk Dev Mode

Clerk provides development-friendly testing:

```typescript
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', async (identifier) => {
    // Use Clerk's test user feature
    await clerk.signIn.create({
      identifier,
      strategy: 'password',
      password: 'test-password-123'
    });
  });
}
```

---

## ⚠️ Security: Dev-Only Code

**Always gate dev features**:

```typescript
// ✓ Good: Only in development
if (__DEV__ || process.env.NODE_ENV === 'development') {
  autonomoRegisterCustomAction('devLogin', devLoginHandler);
}

// ✗ Bad: Available in production
autonomoRegisterCustomAction('devLogin', devLoginHandler); // Security risk!
```

**Environment checks by platform**:

| Platform | Dev Check |
|----------|-----------|
| React Native | `if (__DEV__)` |
| Node.js | `if (process.env.NODE_ENV === 'development')` |
| Vite | `if (import.meta.env.DEV)` |
| Next.js | `if (process.env.NODE_ENV !== 'production')` |
