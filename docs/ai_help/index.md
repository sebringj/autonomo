# Autonomo AI Help Index

> **For AI Assistants**: Call `autonomo_help` with a topic to get detailed guidance.

## 📚 Available Topics

| Topic | Description | When to Read |
|-------|-------------|--------------|
| [overview](overview.md) | Core concepts, workflow, and quick start | **Start here** |
| [elements](elements.md) | How element registration works (CRITICAL) | Before your first command |
| [custom-actions](custom-actions.md) | Bypass OTP/OAuth, create shortcuts | When testing auth flows |
| [local-development](local-development.md) | Local emulators for auth, payments, etc. | **Setting up dev environment** |
| [multi-device](multi-device.md) | Test across multiple devices/users | For chat, notifications, collaboration |
| [troubleshooting](troubleshooting.md) | Common issues and solutions | When things don't work |
| [scenarios](scenarios.md) | Real-world testing patterns | For complex workflows |
| [best-practices](best-practices.md) | Tips for reliable testing | Before production testing |

## 🚀 Quick Decision Tree

```
I need to...
│
├─► Understand Autonomo → Read "overview"
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
