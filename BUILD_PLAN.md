# Autonomo Build Plan

> From LeagueHub reference implementation → Standalone MCP product

## What Exists Today

✅ **Working in LeagueHub:**
- React Native test bridge (~1200 lines)
- Web (Preact) test bridge (~400 lines)
- HTTP endpoints for command/result
- WebSocket support for real-time
- Element auto-registration pattern
- State reporting (screen, elements, errors, logs)
- Custom actions (devLogin, switchRole, etc.)

✅ **Documentation:**
- Mobile test bridge guide
- Web test bridge guide
- Interplay testing guide

## What Needs to Be Built

### Phase 1: Extract Core (1-2 weeks)

**Goal:** Standalone npm package + MCP server that works with any AI tool

```
autonomo/
  packages/
    @autonomo/core/           # Framework-agnostic core
      src/
        registry.ts           # Element registration
        commands.ts           # Command processing
        state.ts              # State collection
        transport.ts          # HTTP/WebSocket client
      package.json
    
    @autonomo/mcp-server/     # MCP server binary
      src/
        server.ts             # MCP protocol handler
        tools.ts              # Tool definitions
        bridge-manager.ts     # Manages connected apps
      package.json
    
    @autonomo/react/          # React integration
      src/
        provider.tsx          # Context provider
        hooks.ts              # useTestable, useScreen
      package.json
    
    @autonomo/react-native/   # React Native integration
      src/
        provider.tsx
        hooks.ts
      package.json
```

**Tasks:**

1. **Extract core logic from LeagueHub** (3-4 days)
   - Pull out registry, command processing, state collection
   - Make transport layer pluggable (HTTP polling vs WebSocket)
   - Remove LeagueHub-specific code
   - Add TypeScript types

2. **Build MCP server** (3-4 days)
   - Implement MCP protocol (JSON-RPC over stdio)
   - Define tools: `list_bridges`, `get_state`, `send_command`, `wait_for`
   - Bridge manager to track connected apps
   - Test with Claude Desktop

3. **Create React/RN packages** (2-3 days)
   - Thin wrappers around core
   - Auto-registration hooks
   - Provider components

4. **Verify with LeagueHub** (1-2 days)
   - Replace LeagueHub's bridge with @autonomo packages
   - Ensure everything still works
   - This is your first "customer"

### Phase 2: Developer Experience (1-2 weeks)

**Goal:** Easy to install, easy to configure, delightful to use

**Tasks:**

1. **One-line install** (2 days)
   ```bash
   npx autonomo init
   # Detects framework, installs right package, adds provider
   ```

2. **MCP config generators** (1 day)
   ```bash
   npx autonomo mcp-config --tool=copilot
   npx autonomo mcp-config --tool=claude
   npx autonomo mcp-config --tool=cursor
   ```

3. **CLI for testing** (2 days)
   ```bash
   autonomo status              # Show connected bridges
   autonomo send press Submit   # Manual command
   autonomo watch               # Live state stream
   ```

4. **VS Code extension (optional, nice-to-have)** (3-4 days)
   - Status bar showing connected bridges
   - Panel with element tree
   - Click to copy testID

### Phase 3: Framework Guides (1 week)

**Goal:** AI can integrate Autonomo into any framework by reading a guide

```
autonomo/
  guides/
    react.md
    react-native.md
    vue.md
    svelte.md
    angular.md
    solid.md
    next.md
    remix.md
    express.md          # Backend
    fastify.md
    django.md
    flask.md
    fastapi.md
```

**Each guide contains:**
- 5-minute quickstart
- Framework lifecycle patterns
- Registration examples
- State reporting patterns
- Verification steps (AI tests its own integration)

### Phase 4: Polish & Launch (1 week)

**Tasks:**

1. **Documentation site** (2 days)
   - Landing page with value prop
   - Quickstart
   - API reference
   - Framework guides

2. **npm publish** (1 day)
   - @autonomo/core
   - @autonomo/mcp-server
   - @autonomo/react
   - @autonomo/react-native
   - autonomo (CLI)

3. **Launch materials** (2 days)
   - README with demo GIF
   - Blog post / dev.to article
   - Twitter thread
   - HN Show post

---

## Detailed Week-by-Week

### Week 1: Core Extraction

| Day | Task |
|-----|------|
| Mon | Set up monorepo, extract registry.ts from LeagueHub |
| Tue | Extract command processing, state collection |
| Wed | Build transport layer (HTTP + WebSocket) |
| Thu | Create @autonomo/core package, tests |
| Fri | Start MCP server, implement protocol basics |

### Week 2: MCP + React Packages

| Day | Task |
|-----|------|
| Mon | Finish MCP server, tool definitions |
| Tue | Test MCP server with Claude Desktop |
| Wed | Create @autonomo/react package |
| Thu | Create @autonomo/react-native package |
| Fri | Replace LeagueHub bridge, verify everything works |

### Week 3: DX + Guides

| Day | Task |
|-----|------|
| Mon | Build CLI (init, status, send) |
| Tue | MCP config generators |
| Wed | Write react.md, react-native.md guides |
| Thu | Write vue.md, svelte.md, angular.md guides |
| Fri | Write backend guides (express, django) |

### Week 4: Polish + Launch

| Day | Task |
|-----|------|
| Mon | Documentation site |
| Tue | Final testing, edge cases |
| Wed | npm publish, verify installs |
| Thu | Write launch blog post |
| Fri | Launch: HN, Twitter, Reddit |

---

## Technical Decisions

### Monorepo Structure

Use pnpm workspaces:

```json
// package.json
{
  "name": "autonomo",
  "private": true,
  "workspaces": ["packages/*"]
}
```

### MCP Server

Use the official MCP SDK:

```typescript
import { Server } from "@modelcontextprotocol/sdk/server";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";

const server = new Server({
  name: "autonomo",
  version: "1.0.0"
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "autonomo_list_bridges",
      description: "List connected applications",
      inputSchema: { type: "object", properties: {} }
    },
    // ...
  ]
}));
```

### Bridge Communication

Two modes:

1. **Embedded server** (simple)
   - MCP server includes HTTP server
   - Apps connect to localhost:9876
   - Single process

2. **External server** (advanced)
   - Separate autonomo-server process
   - MCP server connects to it
   - Better for multiple AI tools

Start with embedded, add external later if needed.

### Package Sizes

Keep them tiny:

| Package | Target Size |
|---------|-------------|
| @autonomo/core | < 10KB |
| @autonomo/react | < 5KB |
| @autonomo/react-native | < 5KB |
| @autonomo/mcp-server | < 20KB |

No heavy dependencies. Pure TypeScript.

---

## MVP Scope (4 weeks)

**In scope:**
- MCP server with 4 tools
- React + React Native packages
- CLI for init and status
- 5 framework guides
- Basic docs site

**Out of scope (later):**
- VS Code extension
- Cloud sync
- Analytics/dashboards
- Enterprise features
- Native mobile SDKs (Swift/Kotlin)

---

## Success Criteria

### Week 4 (Launch)

- [ ] `npx autonomo init` works for React/RN projects
- [ ] MCP server works with Claude Desktop
- [ ] MCP server works with VS Code Copilot
- [ ] LeagueHub running on @autonomo packages
- [ ] 3+ framework guides complete
- [ ] npm packages published
- [ ] Launch post live

### Month 2

- [ ] 100+ npm installs/week
- [ ] 10+ GitHub stars
- [ ] 5+ community integrations started
- [ ] First external user success story

### Month 3

- [ ] 500+ npm installs/week
- [ ] First enterprise inquiry
- [ ] First consulting engagement
- [ ] All major JS framework guides complete

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| MCP protocol changes | Pin to stable version, abstract |
| Copilot MCP support changes | Test weekly, maintain compat |
| Nobody uses it | Dogfood heavily, LeagueHub is customer #1 |
| Too complex to integrate | Focus on one-liner: `npx autonomo init` |

---

## Budget (Time)

| Phase | Duration | Can Parallelize? |
|-------|----------|------------------|
| Core extraction | 1 week | No (foundation) |
| MCP + packages | 1 week | Partially |
| DX + guides | 1 week | Yes |
| Polish + launch | 1 week | Yes |

**Total: 4 weeks to MVP**

If working part-time (10-15 hrs/week): 8-10 weeks

---

## Next Action

Start with `packages/@autonomo/core/src/registry.ts`:

```typescript
// Extract from LeagueHub's RemoteTestBridge.tsx

type ElementHandler = {
  type: 'tap' | 'fillIn';
  handler: (value?: string) => void;
  disabled?: boolean;
  getValue?: () => string;
};

class ElementRegistry {
  private elements = new Map<string, ElementHandler>();
  
  register(id: string, handler: ElementHandler) {
    this.elements.set(id, handler);
    this.onChange?.();
    return () => this.unregister(id);
  }
  
  unregister(id: string) {
    this.elements.delete(id);
    this.onChange?.();
  }
  
  get(id: string) {
    return this.elements.get(id);
  }
  
  list() {
    return Array.from(this.elements.keys());
  }
  
  onChange?: () => void;
}

export const registry = new ElementRegistry();
```

That's the foundation. Everything else builds on it.
