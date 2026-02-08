# Autonomo Recommendations & Guidance

> Use this topic when the user asks "what should I do?", "recommend", "advise", or needs guidance.

## Decision Tree: What Should I Do?

### 1. Are you implementing a NEW feature?

**Yes → Follow this workflow:**
1. Implement the code changes
2. Run type checking (`deno check`, `yarn typecheck`, etc.)
3. **Use `autonomo_validate` to test it actually works**
4. If validation fails → fix and retry
5. Only mark complete when validation passes

### 2. Are you fixing a BUG?

**Yes → Follow this workflow:**
1. First, reproduce the bug with `autonomo_get_state` to see current behavior
2. Make the fix
3. **Use `autonomo_validate` to confirm the bug is fixed**
4. Test the happy path still works too

### 3. Is the app not responding or erroring?

**Yes → Troubleshoot:**
1. `autonomo_list_bridges` - Is the bridge connected?
   - No bridge? App isn't running or AutonomoBridge not mounted
2. `autonomo_get_state` - Check the `errors` array
   - Has errors? Read them and fix the underlying issue
3. Check if you're on the right screen
4. Check if user is authenticated (many features require login)

### 4. User says "test this" or "validate"?

**Use `autonomo_validate`** - this is THE tool for validation. It:
- Executes your test steps
- Returns clear PASS/FAIL
- Shows exactly what failed and why

### 5. User is stuck or confused?

**Use `autonomo_help`** with a relevant topic:
- `overview` - Getting started
- `elements` - How to find and interact with UI
- `custom-actions` - Bypassing auth/OTP
- `troubleshooting` - Common problems

## The Golden Rule

**Never say "done" without validating through Autonomo.**

Code that compiles isn't code that works. Always:
1. Implement
2. **Validate with Autonomo**
3. Fix any issues
4. Only then mark complete

## Quick Reference: Which Tool to Use

| User Says | Tool to Use |
|-----------|-------------|
| "validate", "test", "verify", "check" | `autonomo_validate` |
| "what should I do?", "recommend", "help" | `autonomo_help` (this doc) |
| "what's on screen?", "what can I click?" | `autonomo_get_state` |
| "click", "fill", "type", "press" | `autonomo_send_command` |
| "wait for", "wait until" | `autonomo_wait_for` |
| "run this flow", "execute scenario" | `autonomo_run_scenario` |
| "what apps are connected?" | `autonomo_list_bridges` |

## Validation Step Examples

When using `autonomo_validate`, provide clear steps:

```json
{
  "bridge": "my-app",
  "description": "user can submit contact form",
  "steps": [
    { "action": "navigate", "target": "/contact" },
    { "action": "fillIn", "target": "NameInput", "value": "Test User" },
    { "action": "fillIn", "target": "EmailInput", "value": "test@example.com" },
    { "action": "press", "target": "SubmitButton" },
    { "action": "assertElement", "target": "SuccessMessage" }
  ],
  "expectElement": "SuccessMessage"
}
```

## Common Patterns

### Login First Pattern
Most features require authentication:
1. Check `autonomo_get_state` - is there a user?
2. If no user, look for login elements or `devLogin` custom action
3. Authenticate, then proceed with your task

### Check Errors Pattern
After any command:
1. `autonomo_get_state` 
2. Look at `errors` array
3. Empty = good, has errors = stop and fix

### Confirm Navigation Pattern
After navigation or actions that change screens:
1. `autonomo_get_state`
2. Verify `screen` is what you expect
3. Verify expected elements are present
