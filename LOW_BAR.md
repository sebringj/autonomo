# Low-Bar: Reducing Autonomo Integration Friction

> **Goal**: Minimize the code developers must write to get value from Autonomo.

## The Problem

Current Autonomo integration requires:
1. Add `AutonomoProvider` to app root
2. Import and use `useTestId()` on every interactive element
3. Register custom actions for auth bypass, etc.
4. Configure network/error tracking

**Developer pushback**: "Why do I need to annotate my entire codebase?"

---

## Quick Wins (Incremental, Ship-able Ideas)

### 1. 🎯 Auto-Discovery Mode (Zero-Integration Start)

**Concept**: Scrape semantic info from existing props—no code changes needed.

For React/React Native, automatically discover elements from:
- `accessibilityLabel` / `aria-label` (already there for a11y)
- `testID` / `data-testid` (already used in testing)
- `name` / `id` attributes
- `placeholder` text on inputs
- Button/link text content

```tsx
// User writes NOTHING new - Autonomo finds this:
<Button accessibilityLabel="Submit Order">Checkout</Button>
<TextInput testID="email-input" placeholder="Email" />
<TouchableOpacity accessibilityLabel="Profile">...</TouchableOpacity>
```

**AI sees**:
```
elements: [
  { id: "Button.Submit Order", type: "button", actions: ["press"] },
  { id: "Input.email-input", type: "input", actions: ["fillIn"] },
  { id: "Button.Profile", type: "button", actions: ["press"] }
]
```

**Implementation**: Tree walker that extracts from existing DOM/component tree.

**Effort**: Medium | **Impact**: High — most apps already have testIDs or a11y labels.

---

### 2. 🔌 Accessibility Bridge (Platform-Level, Zero Integration)

**Concept**: Use the OS accessibility tree—no app changes at all.

iOS/Android/macOS/Windows all expose accessibility APIs that describe UI:
- Element types (button, text field, etc.)
- Labels and values
- Enabled/disabled state
- Hierarchy

**How it works**:
```
┌─────────────────────┐
│    Your App         │  ← No changes
└─────────────────────┘
         ↓
┌─────────────────────┐
│  OS Accessibility   │  ← Already exists
│       Tree          │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  Autonomo A11y      │  ← New bridge (runs alongside app)
│     Scanner         │
└─────────────────────┘
         ↓
       MCP Server
```

**Platforms**:
- iOS: `XCUIApplication` / `AXUIElement`
- Android: `UiAutomator` / `AccessibilityService`
- Web: DOM + ARIA
- macOS: `AXUIElement`
- Windows: `UI Automation`

**Effort**: High per platform | **Impact**: Huge — true zero integration.

---

### 3. 📸 Screenshot + Vision Hybrid

**Concept**: When structured data isn't available, fall back to screenshot + OCR/vision.

Not as a replacement, but as a **fallback for un-annotated areas**:

```
┌─────────────────────────────┐
│  Autonomo sees:             │
│                             │
│  [Annotated Area]           │  ← Fast, structured (~50ms)
│    • Button.Submit          │
│    • Input.Email            │
│                             │
│  [Un-annotated Area]        │  ← Fallback to vision
│    • (screenshot region)    │
│    • "I see a modal with    │
│       'Confirm' and 'Cancel'│
│       buttons"              │
└─────────────────────────────┘
```

**Effort**: Low (use existing vision APIs) | **Impact**: Medium — graceful degradation.

---

### 4. 🏷️ Attribute Namespacing (Even Less Code)

**Concept**: Instead of importing `useTestId`, just use a data attribute convention.

```tsx
// Before (requires import + hook)
import { useTestId } from '@autonomo/react';
const tid = useTestId('Login.Email');
<input {...tid} />

// After (just an attribute)
<input data-auto="Login.Email" />
```

Autonomo scans for `data-auto` attributes automatically. Provider still needed, but no hooks.

**Effort**: Low | **Impact**: Medium — reduces boilerplate significantly.

---

### 5. 🔧 Dev Tools Extension (Browser/React DevTools Integration)

**Concept**: Browser extension or React DevTools plugin that exposes elements without app code.

For web:
- Chrome/Firefox extension scrapes the page
- Identifies interactive elements (buttons, inputs, links)
- Infers IDs from nearest label, placeholder, or aria

For React Native:
- Flipper plugin or standalone inspector
- Walks component tree via debug bridge

**Effort**: Medium | **Impact**: High — zero app code for basic usage.

---

### 6. 🎭 Playwright/Detox Adapter (Leverage Existing Test Infrastructure)

**Concept**: If team already uses Playwright/Detox/XCUITest, bridge their test infrastructure.

```
┌─────────────────────────────┐
│  Existing Playwright Setup  │  ← Team already has this
└─────────────────────────────┘
         ↓
┌─────────────────────────────┐
│  Autonomo-Playwright Bridge │  ← Adapter layer
└─────────────────────────────┘
         ↓
       MCP Server
```

AI commands become Playwright commands:
- `press("Login.Submit")` → `page.getByTestId("Login.Submit").click()`
- `fillIn("Email", "test@example.com")` → `page.getByTestId("Email").fill(...)`

**Effort**: Medium | **Impact**: High for teams with existing E2E setup.

---

## Recommended Roadmap

### Phase 1: Quick Wins (This Release)
1. **Auto-discovery from existing attributes** (testID, accessibilityLabel)
2. **`data-auto` convention** (no hooks needed)
3. **Vision fallback** for un-annotated regions

### Phase 2: Zero Integration Options
4. **Browser extension** for web apps
5. **Accessibility tree bridge** (start with web/macOS)

### Phase 3: Enterprise Integration
6. **Playwright/Detox adapters** for existing test infrastructure

---

## Design Principles

1. **Progressive Enhancement**: Works with zero integration, gets better with more
2. **Leverage Existing Work**: a11y labels, testIDs, existing test frameworks
3. **Don't Fight the Platform**: Use native accessibility/automation APIs
4. **Graceful Degradation**: Vision fallback when structured data unavailable

---

## Notes

The "full" Autonomo integration (hooks, custom actions, etc.) provides the **richest** experience:
- Type-safe element registration
- Custom auth bypass flows  
- Network/error tracking
- Multi-device coordination

Low-bar mode trades some richness for adoption friction. Both can coexist.
