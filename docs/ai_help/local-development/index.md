# Local Development Setup

> **📖 This folder contains guides for setting up local development environments for AI-driven testing.**

---

## 📑 Quick Index

| If you need... | File | Description |
|----------------|------|-------------|
| Start all services at once | [vscode-tasks.md](vscode-tasks.md) | VS Code tasks.json patterns |
| Bypass OTP/login flows | [auth-bypass.md](auth-bypass.md) | 5 strategies for auth bypass |
| Test Stripe payments locally | [payments.md](payments.md) | Stripe CLI, test cards |
| Test email flows | [email.md](email.md) | Mailhog, Mailtrap |
| Test push notifications | [notifications.md](notifications.md) | Expo, Firebase FCM |
| Local database options | [databases.md](databases.md) | Supabase, Firebase, MongoDB |
| WebSocket/realtime testing | [realtime.md](realtime.md) | Soketi, Supabase Realtime |
| Mock location/maps | [maps-location.md](maps-location.md) | Mock GPS coordinates |
| Local file storage | [file-storage.md](file-storage.md) | MinIO, Supabase Storage |
| **AWS emulators** | [aws.md](aws.md) | LocalStack, DynamoDB Local, SAM |
| **Azure emulators** | [azure.md](azure.md) | Azurite, Functions, Cosmos DB |
| **GCP emulators** | [gcp.md](gcp.md) | Firestore, Pub/Sub, Spanner |
| Mock AI/LLM responses | [ai-llm.md](ai-llm.md) | Ollama, LocalAI |
| Mock analytics | [analytics.md](analytics.md) | PostHog, Plausible |
| **Step-by-step setup guide** | [checklist.md](checklist.md) | AI assistant checklist |

---

## 🎯 Decision Tree

```
User wants to test an app with Autonomo?
│
├─ App won't run locally
│   └─ Read: vscode-tasks.md
│
├─ Blocked by login/auth
│   └─ Read: auth-bypass.md
│
├─ Testing payments
│   └─ Read: payments.md
│
├─ Testing email/notifications
│   ├─ Email → Read: email.md
│   └─ Push → Read: notifications.md
│
├─ Need local database
│   └─ Read: databases.md
│
├─ Using cloud services
│   ├─ AWS → Read: aws.md
│   ├─ Azure → Read: azure.md
│   └─ GCP → Read: gcp.md
│
└─ Need full setup from scratch
    └─ Read: checklist.md
```

---

## ⚡ Why This Matters

Third-party services are the #1 blocker for AI-driven testing:

- **OTP codes** are random and sent to real phones
- **OAuth flows** redirect to external sites AI can't control
- **Payment processing** requires real credentials
- **Push notifications** need device tokens
- **Email verification** waits for real emails

**Solution**: Use local emulators + custom actions to make everything deterministic.

---

## 📊 Quick Reference: Service → Local Alternative

| Service | Local Alternative | Guide |
|---------|-------------------|-------|
| **Supabase** | `supabase start` | [databases.md](databases.md) |
| **Firebase** | `firebase emulators:start` | [databases.md](databases.md) |
| **Stripe** | Stripe CLI + test cards | [payments.md](payments.md) |
| **Twilio** | Magic OTP code | [auth-bypass.md](auth-bypass.md) |
| **SendGrid** | Mailhog | [email.md](email.md) |
| **AWS S3** | LocalStack / MinIO | [aws.md](aws.md) |
| **Azure Storage** | Azurite | [azure.md](azure.md) |
| **Pusher** | Soketi | [realtime.md](realtime.md) |
| **OpenAI** | Ollama | [ai-llm.md](ai-llm.md) |
