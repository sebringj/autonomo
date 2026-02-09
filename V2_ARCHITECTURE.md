# Autonomo v2 Architecture

> **Core Insight**: Let the LLM do the integration work, not the developer.

## The Shift

| v1 (Current) | v2 (Proposed) |
|--------------|---------------|
| Developer adds `useTestId()` hooks everywhere | LLM scans codebase, adds `data-testid` attributes |
| Custom actions registered in component code | Custom actions defined in `.autonomo/` config |
| Metadata embedded in running app | Metadata lives in `.autonomo/` folder |
| Heavy per-component integration | Single top-level observer |
| Developer learns Autonomo API | LLM handles Autonomo setup |

---

## The `.autonomo/` Folder

```
.autonomo/
├── config.json          # Platform, observer settings, last sync
├── manifest.json        # All discovered elements + metadata
├── actions/             # Custom action definitions
│   ├── devLogin.md      # LLM-readable action definition
│   └── seedTestData.md
├── screens/             # Per-screen context (optional)
│   ├── Login.md         # Hints, flows, relationships
│   └── Dashboard.md
└── history/             # Change tracking (optional)
    └── 2026-02-09.json
```

### `config.json`
```json
{
  "version": "2.0.0",
  "platform": "react-native",
  "observer": "@autonomo/observer-react-native",
  "lastSync": {
    "commit": "abc123",
    "timestamp": "2026-02-09T10:30:00Z",
    "filesScanned": 47
  },
  "settings": {
    "attributeName": "data-testid",
    "idFormat": "Screen.Element"
  }
}
```

### `manifest.json`
```json
{
  "elements": {
    "Login.Email": {
      "file": "src/screens/LoginScreen.tsx",
      "line": 42,
      "type": "input",
      "description": "Email input field for user authentication",
      "hint": "Accepts email format, shows validation error below"
    },
    "Login.Submit": {
      "file": "src/screens/LoginScreen.tsx", 
      "line": 58,
      "type": "button",
      "description": "Submits login form",
      "preconditions": ["Login.Email filled", "Login.Password filled"],
      "postconditions": ["Navigates to Home on success", "Shows error toast on failure"]
    }
  },
  "screens": {
    "Login": {
      "file": "src/screens/LoginScreen.tsx",
      "elements": ["Login.Email", "Login.Password", "Login.Submit", "Login.ForgotPassword"],
      "flow": "Fill email → Fill password → Press submit"
    }
  }
}
```

### `actions/devLogin.md`
```markdown
# devLogin

## Description
Bypass OAuth/OTP flow for local development testing.

## Arguments
| Name | Type | Required | Description |
|------|------|----------|-------------|
| email | string | yes | Email of test user to login as |
| role | string | no | Role to assume (default: "user") |

## Implementation
This action is handled by the MCP server, not app code.

### Method: API Call
```bash
curl -X POST http://localhost:3000/api/dev/login \
  -H "Content-Type: application/json" \
  -d '{"email": "${email}", "role": "${role}"}'
```

### Alternative: Command Sequence
1. Navigate to Login screen
2. Fill Login.Email with "${email}"  
3. Fill Login.Password with "devpassword123"
4. Press Login.Submit

## When to Use
- Local development only (never in production)
- Bypasses 2FA/OTP verification
- Creates session with specified role
```

---

## The Init Flow

When someone tries to use Autonomo and `.autonomo/` doesn't exist:

```
┌─────────────────────────────────────────────────────────────┐
│  User: "Use Autonomo to test my login flow"                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  MCP Server: No .autonomo/ folder found                     │
│  → Returns "autonomo_init_required" status                  │
│  → Provides init instructions for LLM                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  LLM reads init prompt, begins setup:                       │
│                                                             │
│  1. Detect platform (React, React Native, Vue, etc.)        │
│  2. Create .autonomo/ folder structure                      │
│  3. Install minimal observer package                        │
│  4. Add observer to app entry point (ONE import)            │
│  5. Scan UI files for interactive elements                  │
│  6. Add data-testid attributes where missing                │
│  7. Build manifest.json with element metadata               │
│  8. Commit: "chore: initialize autonomo"                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  Autonomo ready! LLM can now test the app.                  │
└─────────────────────────────────────────────────────────────┘
```

---

## The Observer Pattern

Instead of per-component hooks, ONE top-level observer:

### React / React Native
```tsx
// App.tsx - THE ONLY CHANGE NEEDED
import { AutonomoObserver } from '@autonomo/observer-react-native';

export default function App() {
  return (
    <>
      <AutonomoObserver enabled={__DEV__} />
      <Navigation />
    </>
  );
}
```

The observer:
- Listens for MCP commands
- Queries elements by `data-testid`
- Performs actions (press, fill, etc.)
- Reports state back to MCP server
- Reads `.autonomo/manifest.json` for rich metadata

### How It Works
```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    MCP Server    │────▶│     Observer     │────▶│   App UI Tree    │
│                  │     │  (top-level)     │     │                  │
│  "press Login.   │     │                  │     │  <Button         │
│   Submit"        │     │  Finds element   │     │   data-testid=   │
│                  │◀────│  by data-testid  │◀────│   "Login.Submit" │
│  { success }     │     │  Invokes click   │     │  />              │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ .autonomo/       │
                         │ manifest.json    │
                         │                  │
                         │ Rich metadata:   │
                         │ - descriptions   │
                         │ - hints          │
                         │ - preconditions  │
                         └──────────────────┘
```

---

## Custom Actions in v2

**v1 Problem**: Custom actions require code injection:
```tsx
// v1 - Code has to know about test infrastructure
useCustomAction('devLogin', {
  handler: async ({ email }) => {
    await devAuth.loginAs(email);
  }
});
```

**v2 Solution**: Custom actions are pure configuration:

```
.autonomo/actions/devLogin.md  ← LLM-readable definition
```

The MCP server executes custom actions via:
1. **API calls** - Hit a dev endpoint
2. **Shell commands** - Run a script
3. **Command sequences** - Chain Autonomo commands
4. **Database operations** - Direct DB manipulation (with connection string)

The app code never knows about custom actions. It's all orchestrated externally.

---

## Sync & Drift Detection

When the LLM uses Autonomo:

1. **Check last sync** - Compare `config.json` lastSync commit to current HEAD
2. **If diverged** - Prompt: "Codebase changed since last Autonomo sync. Run quick rescan?"
3. **Quick rescan** - Only check files changed since last sync
4. **Update manifest** - Add new elements, flag removed ones

```json
// manifest.json can track element health
{
  "elements": {
    "Login.Email": {
      "status": "active",
      "lastVerified": "2026-02-09T10:30:00Z"
    },
    "OldFeature.Button": {
      "status": "missing",  // Element no longer found in code
      "lastSeen": "2026-02-01T10:30:00Z"
    }
  }
}
```

---

## Benefits

### For Developers
- **One import** instead of hooks everywhere
- **No API to learn** - LLM handles setup
- **Minimal code changes** - just `data-testid` attributes
- **Metadata separate from code** - descriptions/hints don't clutter components

### For LLMs
- **Rich context** in `.autonomo/` folder (readable markdown + JSON)
- **Self-maintaining** - LLM can update manifest as it works
- **Custom actions without code** - define new test utilities on the fly

### For Teams
- **Version controlled** - `.autonomo/` is committed, reviewed like code
- **Audit trail** - history of what Autonomo knows about the app
- **Portable** - anyone cloning repo has full Autonomo context

---

## Migration from v1

```
┌─────────────────────────────────────────────────────────────┐
│  LLM: "Migrate this project from Autonomo v1 to v2"         │
└─────────────────────────────────────────────────────────────┘
                              ↓
1. Scan for useTestId() calls → extract to manifest.json
2. Scan for useCustomAction() → extract to .autonomo/actions/
3. Remove @autonomo/react imports from components
4. Add @autonomo/observer-react to app root
5. Add data-testid attributes where useTestId was used
6. Remove useTestId/useCustomAction from codebase
7. Create .autonomo/ folder with migrated content
```

---

## Open Questions

1. **Observer complexity** - Can a top-level observer reliably interact with deeply nested elements across all platforms?

2. **Real-time state** - v1 observers track live state (input values, errors). Can v2 observer do the same without per-component hooks?

3. **Custom action execution** - For actions needing app internals (not just API/shell), do we need a minimal in-app handler?

4. **Framework coverage** - Some frameworks (Flutter, SwiftUI) may need different observer strategies.

---

## Verdict

This is a **fundamentally better architecture** because it:
- Treats integration as an LLM task, not a developer task
- Separates concerns (app code vs. test infrastructure)
- Uses the filesystem (`.autonomo/`) as the source of truth
- Aligns with "get out of the LLM's way" - give it readable files to work with

**Recommendation**: Proceed with v2 as a breaking change. The reduced friction is worth it.
