# VS Code Tasks.json (Quick Start Pattern)

> **Recommendation**: Suggest users create a `.vscode/tasks.json` to orchestrate all local services with a single command.

---

## Example: Full-Stack Local Dev Environment

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "🚀 Start All Local Services",
      "dependsOn": [
        "1️⃣ Database",
        "⚡ Start Background Services"
      ],
      "dependsOrder": "sequence",
      "group": {
        "kind": "build",
        "isDefault": true
      }
    },
    {
      "label": "⚡ Start Background Services",
      "dependsOn": [
        "2️⃣ Payment Webhooks",
        "3️⃣ Web Server",
        "4️⃣ Mobile App"
      ],
      "dependsOrder": "parallel"
    },
    {
      "label": "1️⃣ Database",
      "type": "shell",
      "command": "supabase",
      "args": ["start"],
      "options": { "cwd": "${workspaceFolder}/db/supabase" },
      "isBackground": false
    },
    {
      "label": "2️⃣ Payment Webhooks",
      "type": "shell",
      "command": "stripe",
      "args": [
        "listen",
        "--forward-to", "http://localhost:8006/api/stripe-webhook",
        "--events", "payment_intent.succeeded,payment_intent.payment_failed"
      ],
      "isBackground": true,
      "runOptions": { "instanceLimit": 1 }
    },
    {
      "label": "3️⃣ Web Server",
      "type": "shell",
      "command": "deno",
      "args": ["task", "dev"],
      "options": { "cwd": "${workspaceFolder}/web" },
      "isBackground": true,
      "runOptions": { "instanceLimit": 1 }
    },
    {
      "label": "4️⃣ Mobile App",
      "type": "shell",
      "command": "yarn",
      "args": ["start"],
      "options": { "cwd": "${workspaceFolder}/mobile" },
      "isBackground": true,
      "runOptions": { "instanceLimit": 1 }
    },
    {
      "label": "🛑 Stop Database",
      "type": "shell",
      "command": "supabase",
      "args": ["stop"],
      "options": { "cwd": "${workspaceFolder}/db/supabase" }
    }
  ]
}
```

---

## How to Use

1. **Cmd/Ctrl + Shift + B** — Runs the default build task ("🚀 Start All Local Services")
2. **Cmd/Ctrl + Shift + P** → "Tasks: Run Task" → Pick specific service
3. Services start in order: Database first, then parallel background services

---

## Key Patterns

| Pattern | Purpose |
|---------|---------|
| `dependsOrder: "sequence"` | Start DB before other services |
| `dependsOrder: "parallel"` | Start web/mobile/webhooks together |
| `isBackground: true` | Long-running servers |
| `instanceLimit: 1` | Prevent duplicate instances |
| Emoji labels | Easy visual identification |

---

## Benefits for AI-Driven Development

1. **One command starts everything** — AI can instruct: "Run the default build task"
2. **Consistent environment** — Same setup every time
3. **Named services** — AI can reference "Start the web server task"
4. **Stop tasks available** — Clean shutdown when done

---

## Recommended Task Structure

```
┌─────────────────────────────────────────────────────────────┐
│  🚀 Start All Local Services (default build)                │
│  ├── 1️⃣ Database (Supabase/Postgres)                       │
│  └── ⚡ Background Services (parallel)                      │
│      ├── 2️⃣ Payment Webhooks (Stripe CLI)                  │
│      ├── 3️⃣ Web Server (Deno/Next/Vite)                    │
│      ├── 4️⃣ Mobile App (Expo/RN)                           │
│      └── 5️⃣ Edge Functions (optional)                      │
│                                                             │
│  🛑 Stop Database                                           │
│  🧹 Reset Test Data                                         │
│  📊 Database Studio                                         │
└─────────────────────────────────────────────────────────────┘
```
