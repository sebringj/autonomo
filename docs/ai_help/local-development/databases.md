# Database Emulators

> **Purpose**: Run databases locally for consistent, isolated testing.

---

## Supabase Local

```bash
# Start local Supabase
supabase start

# Access local services
# API: http://localhost:54321
# Studio: http://localhost:54323
# DB: postgresql://postgres:postgres@localhost:54322/postgres
```

```typescript
// Point app to local Supabase
const supabase = createClient(
  'http://localhost:54321',
  'your-local-anon-key'
);
```

---

## Firebase Emulator Suite

```bash
firebase emulators:start

# Services available:
# Auth: localhost:9099
# Firestore: localhost:8080
# Functions: localhost:5001
# Storage: localhost:9199
```

```typescript
import { connectFirestoreEmulator } from 'firebase/firestore';
import { connectStorageEmulator } from 'firebase/storage';

if (__DEV__) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectStorageEmulator(storage, 'localhost', 9199);
}
```

---

## PlanetScale (Local MySQL)

```bash
# Use local MySQL with PlanetScale-compatible schema
docker run -d -p 3306:3306 -e MYSQL_ROOT_PASSWORD=root mysql:8
```

---

## MongoDB Local

```bash
docker run -d -p 27017:27017 mongo:latest
```

---

## VS Code Task for Supabase

```json
{
  "label": "1️⃣ Database (Supabase)",
  "type": "shell",
  "command": "supabase",
  "args": ["start"],
  "options": { "cwd": "${workspaceFolder}/db/supabase" },
  "isBackground": false
}
```
