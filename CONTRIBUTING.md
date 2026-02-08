# Contributing to Autonomo

We welcome contributions! Whether it's bug fixes, new platform SDKs, documentation, or ideas — your help makes Autonomo better for everyone.

## 📜 Contribution License Agreement

**By submitting a contribution, you agree that:**

1. Your contributions become part of the Autonomo project under the [Business Source License 1.1](LICENSE.md)
2. The project maintainer (Jason Sebring) retains all commercial licensing rights
3. Contributors are **not entitled to revenue share** from commercial licenses
4. You have the legal right to make the contribution

This is standard for commercially-licensed open source projects — it keeps IP clean while letting the community contribute freely. Your name stays in the git history, and you get the satisfaction of improving a tool developers use daily.

---

## 🧘 Philosophy: Get Out of the LLM's Way

Before contributing, internalize the core mantra:

> **Autonomo provides clean primitives. The LLM does the thinking.**

### Ask yourself:

1. **Is this a primitive operation the app must perform?** → ✅ Build it
2. **Is this reasoning/logic an LLM handles naturally?** → ❌ Don't build it

### Good contributions:
- New platform bridges (Kotlin, C#, etc.)
- Performance improvements to existing primitives
- Bug fixes
- Documentation improvements
- Cleaner, more reliable state reporting

### Bad contributions:
- "Smart" assertion tools (LLM already reasons about state)
- Auto-planning features (LLM already plans)
- Verbose helper methods that wrap simple primitives
- Anything that tries to outsmart the LLM

---

## 🛠 Development Setup

```bash
# Clone the repo
git clone https://github.com/sebringj/autonomo.git
cd autonomo

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

### Monorepo Structure

```
packages/
  @autonomo/         # Core TypeScript packages
    bridge/          # Universal bridge protocol
    mcp-server/      # MCP server implementation
    react/           # React bindings
    react-native/    # React Native bindings
  autonomo_flutter/  # Flutter SDK
  autonomo-swift/    # Swift/iOS SDK
  autonomo-kotlin/   # Kotlin/Android SDK
  autonomo-python/   # Python SDK
  autonomo-ruby/     # Ruby SDK
  Autonomo.CSharp/   # C#/.NET SDK
```

---

## 📝 Contribution Workflow

### 1. Check existing issues

Look at [GitHub Issues](https://github.com/sebringj/autonomo/issues) before starting work.

### 2. Open an issue first (for significant changes)

For new features or architectural changes, open an issue to discuss before writing code. This saves everyone time.

### 3. Fork and branch

```bash
git checkout -b feature/your-feature-name
```

### 4. Make your changes

- Keep changes minimal and focused
- Follow existing code style
- Add tests for new functionality
- Update docs if needed

### 5. Test

```bash
pnpm test
pnpm typecheck
```

### 6. Commit with clear messages

```
feat: add X support for Y platform
fix: resolve connection timeout in bridge
docs: clarify custom actions setup
```

### 7. Open a Pull Request

- Reference any related issues
- Describe what changed and why
- Keep PRs focused — one feature/fix per PR

---

## 🎯 Areas We'd Love Help With

### High Priority
- **New platform SDKs** — Go, Rust, PHP, etc.
- **Bug fixes** — especially in platform-specific bridges
- **Performance** — faster state serialization, lower latency

### Documentation
- Clearer quickstart guides
- Platform-specific tutorials
- Troubleshooting guides

### Testing
- More comprehensive test coverage
- CI/CD improvements

---

## 💬 Getting Help

- **Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: mail@jasonsebring.com for licensing questions

---

## 🙏 Thank You

Every contribution — code, docs, bug reports, or ideas — helps make Autonomo better. We appreciate you taking the time to help.

---

*By submitting a contribution, you confirm you've read and agree to the terms above.*
