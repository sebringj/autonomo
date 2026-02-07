# Autonomo AI Help Index

> **For AI Assistants**: Call `autonomo_help` with a topic to get detailed guidance.

## 📚 Available Topics

| Topic | Description | When to Read |
|-------|-------------|--------------|
| [overview](overview.md) | Core concepts, workflow, and quick start | **Start here** |
| [security](security.md) | **Security & coding guidelines (DRY, errors)** | **⚠️ Before writing code** |
| [elements](elements.md) | How element registration works (CRITICAL) | Before your first command |
| [custom-actions](custom-actions.md) | Bypass OTP/OAuth, create shortcuts | When testing auth flows |
| [local-development/](local-development/) | Local emulators, auth bypass, cloud services | **Setting up dev environment** |
| [multi-device](multi-device.md) | Test across multiple devices/users | For chat, notifications, collaboration |
| [troubleshooting](troubleshooting.md) | Common issues and solutions | When things don't work |
| [scenarios](scenarios.md) | Real-world testing patterns | For complex workflows |
| [best-practices](best-practices.md) | Tips for reliable testing | Before production testing |

### 📂 Local Development (Sub-Topics)

The `local-development/` folder contains focused guides:

| Sub-Topic | File | Description |
|-----------|------|-------------|
| VS Code Tasks | [vscode-tasks.md](local-development/vscode-tasks.md) | Orchestrate services |
| Auth Bypass | [auth-bypass.md](local-development/auth-bypass.md) | Skip OTP/OAuth |
| Payments | [payments.md](local-development/payments.md) | Stripe CLI, test cards |
| Databases | [databases.md](local-development/databases.md) | Supabase, Firebase |
| AWS | [aws.md](local-development/aws.md) | LocalStack, DynamoDB |
| Azure | [azure.md](local-development/azure.md) | Azurite, Functions |
| GCP | [gcp.md](local-development/gcp.md) | Firestore, Pub/Sub |
| Checklist | [checklist.md](local-development/checklist.md) | AI setup guide |

## 🚀 Quick Decision Tree

```
I need to...
│
├─► Understand Autonomo → Read "overview"
│
├─► Learn security/coding best practices → Read "security" ⚠️
│
├─► Know why elements aren't showing → Read "elements"
│
├─► Bypass login/OTP in tests → Read "custom-actions"
│
├─► Set up local dev environment → Read "local-development"
│
├─► Test User A sends to User B → Read "multi-device"
│
├─► Debug why my command failed → Read "troubleshooting"
│
├─► Learn testing patterns → Read "scenarios"
│
└─► Write more reliable tests → Read "best-practices"
```

## ⚡ The 30-Second Version

1. **Get state first**: `autonomo_get_state(bridge="myapp")` — see what's available
2. **Elements must be registered**: Just adding `testID` isn't enough; app must call `autonomoRegister()`
3. **Always check state after commands**: Commands are async; errors appear in next `get_state`
4. **Use custom actions for auth**: Register a `devLogin` action to skip OTP flows
5. **Multi-device = multiple bridges**: Each device/user connects as a separate bridge

## 🔗 Links

- [GitHub Repository](https://github.com/sebringj/autonomo)
- [Quick Start Guide](https://github.com/sebringj/autonomo/blob/main/QUICKSTART.md)
- [MCP Integration](https://github.com/sebringj/autonomo/blob/main/MCP_INTEGRATION.md)
- [Custom Actions Guide](https://github.com/sebringj/autonomo/blob/main/docs/CUSTOM_ACTIONS.md)
