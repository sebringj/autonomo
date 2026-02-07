# Autonomo AI-Discoverability TODO

> Improvements discovered while testing with AI agents. The goal: **state should be a complete AI prompt**.

## 🔴 High Priority (Caused Failures)

### Route Validation
- [x] Add `availableRoutes` to AppState interface
- [x] Add route validation in `sendCommand()` before sending to bridge
- [x] Support glob patterns for dynamic routes (`/league/*`, `/user/**`)
- [x] Return helpful error with valid routes when navigation fails

### Custom Actions Invisible to AI
- [x] Separate `customActions` from `elements` in state response
- [x] Include schema for each custom action:
  ```typescript
  customActions: [{
    name: 'fillOtp',
    description: 'Fill all 6 OTP digits at once',
    args: { code: 'string (6 digits)' },
    example: { action: 'fillOtp', value: '111111' }
  }]
  ```
- [x] Update MCP tools to accept custom action names (not just enum)

## 🟡 Medium Priority (Caused Confusion)

### Elements Need Capabilities
- [x] Include supported actions per element:
  ```typescript
  elements: [
    { id: 'Login.PhoneInput', type: 'input', actions: ['fillIn', 'submit'] },
    { id: 'Login.SendCodeButton', type: 'button', actions: ['press'] }
  ]
  ```

### Screen Context/Hints
- [ ] Allow apps to provide screen-level hints:
  ```typescript
  state: {
    screen: '/login',
    hint: 'Enter phone number and tap Send Code. Use fillOtp after.',
    suggestedFlow: [...]
  }
  ```

### Better Error Messages
- [x] On element not found: show element types, not just IDs
- [x] On action mismatch: suggest correct action for element type
- [x] Include "did you mean?" for typos

## 🟢 Nice to Have

### AI-Friendly Documentation
- [ ] Generate MCP tool descriptions from AppState schema
- [ ] Auto-document custom actions in tool descriptions
- [ ] Include examples in error messages

### State Diff for Efficiency
- [ ] Return only changed elements after command
- [ ] Track element additions/removals between states

### Validation Helpers
- [ ] `canPerform(action, target)` query before execution
- [ ] `whatCanIDo()` returns all valid actions for current screen

---

## Discovered Issues Log

| Date | Issue | Status |
|------|-------|--------|
| 2026-02-06 | Mobile couldn't connect - localhost doesn't work from RN | ✅ Fixed: `getDevHost()` |
| 2026-02-06 | Command timeout - wrong message format | ✅ Fixed: `id` → `commandId`, `type: 'result'` |
| 2026-02-06 | AI navigated to `/verify` which doesn't exist | ✅ Fixed: route validation |
| 2026-02-06 | `fillOtp` custom action not discoverable | ✅ Fixed: `action='custom'` with target |
| 2026-02-06 | State returned before React re-render | ⚠️ Fixed in LeagueHub (100ms delay) |
| 2026-02-06 | Elements don't indicate what actions they support | ✅ Fixed: elements now include `actions` array |
| 2026-02-07 | Custom actions invisible to AI (no metadata) | ✅ Fixed: customActions now include description, args, example |
| 2026-02-07 | Cryptic element not found errors | ✅ Fixed: "did you mean?" suggestions + elements by type |

## Future: State Sync Improvements

The 100ms delay before collecting state is a hack. Better solutions:
- [ ] Let apps signal when state is "settled" (e.g., after animations complete)
- [ ] Debounce state updates from apps
- [ ] Add `stateVersion` and let MCP wait for version change
- [ ] Support `waitForElement` in command options
