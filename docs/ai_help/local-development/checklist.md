# AI Assistant Checklist: Setting Up Local Dev

> **Purpose**: Step-by-step guide for AI assistants helping users set up local development.

---

## Step 1: Identify the Stack

Ask or detect what services the project uses:

```
☐ Database (Postgres, MongoDB, etc.)
☐ Auth provider (Supabase, Firebase, Auth0, Clerk)
☐ Payments (Stripe, PayPal)
☐ File storage (S3, Azure Blob, GCS)
☐ Email (SendGrid, Mailgun)
☐ Push notifications
☐ Real-time/WebSockets
☐ AI/LLM services
```

---

## Step 2: Recommend Local Emulators

Based on stack, suggest appropriate emulators:

| Stack | Emulator | File |
|-------|----------|------|
| Supabase | `supabase start` | [databases.md](databases.md) |
| Firebase | `firebase emulators:start` | [databases.md](databases.md) |
| AWS | LocalStack | [aws.md](aws.md) |
| Azure | Azurite | [azure.md](azure.md) |
| Stripe | Stripe CLI | [payments.md](payments.md) |
| Email | Mailhog | [email.md](email.md) |

---

## Step 3: Create VS Code Tasks

Suggest creating `.vscode/tasks.json` with:

- Default build task to start everything
- Sequential: database first
- Parallel: servers and webhooks
- Stop tasks for cleanup

See [vscode-tasks.md](vscode-tasks.md) for full example.

---

## Step 4: Add Custom Actions for Auth

```typescript
// Suggest adding to app root
if (__DEV__) {
  autonomoRegisterCustomAction('devLogin', async (phone) => {
    // Bypass real OTP
    await auth.signIn(phone, '111111');
  });
}
```

See [auth-bypass.md](auth-bypass.md) for strategies.

---

## Step 5: Document Test Data

Create or update project docs with:

- Magic OTP code (e.g., `111111`)
- Test card numbers (e.g., `4242 4242 4242 4242`)
- Seed data scripts
- Test user credentials

---

## Step 6: Verify Setup

Quick verification commands:

```bash
supabase status                    # DB running?
curl http://localhost:PORT/health  # API healthy?
stripe listen --print-json         # Webhooks connected?
```

---

## Example Dialogue

**User**: "I want to test the payment flow but Stripe requires real webhooks"

**AI Assistant**: 
1. "Install Stripe CLI: `brew install stripe/stripe-cli/stripe`"
2. "Add a VS Code task to forward webhooks locally"
3. "Use test card `4242 4242 4242 4242` for successful payments"
4. "Register a custom action to bypass checkout UI if needed"

---

## Development Environment Checklist

```bash
# Typical local dev stack:
☐ supabase start           # Database + Auth + Storage + Realtime
☐ stripe listen ...        # Payment webhooks
☐ mailhog                  # Email capture
☐ ollama run llama2        # Local AI (optional)

# App configuration:
☐ .env.local with local URLs
☐ Custom actions registered for auth bypass
☐ Test data seeding scripts
☐ Mock location support (mobile)
```

---

## Summary: Production → Local

| Production | Local Alternative |
|------------|-------------------|
| Real OTP codes | Magic code `111111` |
| OAuth redirects | Custom `devLogin` action |
| Stripe webhooks | Stripe CLI forwarding |
| AWS S3 | LocalStack / MinIO |
| Azure Storage | Azurite |
| Real emails | Mailhog capture |
| Production database | Local Supabase/Docker |
| Cloud functions | SAM Local / func start |
| Multiple terminal commands | VS Code tasks.json |

**Goal**: Make local development **deterministic** and **automatable** so AI can effectively test your application.
