# Element Registration (CRITICAL)

## The #1 Misconception

**Just adding `testID` or `data-testid` does NOT make elements visible to Autonomo!**

The app must explicitly register elements using Autonomo's API.

## Why This Matters

```
❌ WRONG assumption:
"I see <Button testID="submit" /> in the code, so I can press 'submit'"

✓ CORRECT understanding:
"Elements only appear in get_state if registered via autonomoRegister()"
```

## How Elements Get Registered

### React / React Native

```tsx
import { useAutonomoElement } from 'autonomo-react';

function LoginButton() {
  // This registers the element with Autonomo
  const ref = useAutonomoElement('Login.SubmitButton', 'tap', () => {
    handleLogin();
  });
  
  return <Button ref={ref}>Login</Button>;
}
```

### Web (Preact/React)

```tsx
import { autonomoRegister } from 'autonomo-react';

function LoginForm() {
  useEffect(() => {
    // Register on mount
    const unregister = autonomoRegister('Login.Submit', 'tap', handleSubmit);
    return unregister; // Cleanup on unmount
  }, []);
  
  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Direct Registration

```typescript
import { autonomoRegister } from 'autonomo-core';

// Register a tap element
autonomoRegister('Dashboard.RefreshButton', 'tap', () => refreshData());

// Register an input element
autonomoRegister('Search.Input', 'input', (value) => setSearchQuery(value));

// Register with hints
autonomoRegister('Login.Email', 'input', setEmail, {
  label: 'Email Address',
  hint: 'Enter a valid email format'
});
```

## Element Types

| Type | Description | Command |
|------|-------------|---------|
| `tap` | Clickable element | `press` |
| `input` | Text input field | `fillIn` / `fill` |
| `select` | Dropdown/picker | `fillIn` with value |
| `custom` | Special handling | Via custom action |

## Common Issues

### "Element not found"

**Cause**: Element not registered, or different ID than expected.

**Fix**:
1. Call `get_state` to see actual element IDs
2. Check app code for `autonomoRegister` or `useAutonomoElement`
3. Verify element is mounted (modals, conditional rendering)

### "Element exists in DOM but not in state"

**Cause**: `testID`/`data-testid` present but no Autonomo registration.

**Fix**: Add registration:
```tsx
// Before (doesn't work)
<Button testID="submit" onClick={handleSubmit}>Submit</Button>

// After (works)
const ref = useAutonomoElement('submit', 'tap', handleSubmit);
<Button ref={ref} testID="submit" onClick={handleSubmit}>Submit</Button>
```

### "Element appears then disappears"

**Cause**: Component unmounts (modal closes, screen changes).

**Fix**: 
- Elements are only visible when rendered
- Check screen/route before expecting elements
- Wait for modals to open before interacting

## Best Practice: Element Naming

Use dot-notation for hierarchy:

```
Screen.Section.Element
│       │       └── Specific element
│       └── Section within screen
└── Screen/component name

Examples:
- Login.PhoneInput
- Login.SubmitButton
- Dashboard.Stats.RefreshButton
- Modal.CreateTeam.NameInput
- Modal.CreateTeam.SaveButton
```

## Debugging Elements

### Step 1: Get state and examine elements
```
autonomo_get_state(bridge="myapp")
```

### Step 2: Check if element is in the list
Look at the `elements` array in the response.

### Step 3: If missing, check the app code
Search for:
- `autonomoRegister`
- `useAutonomoElement`
- `useAutonomo`

### Step 4: Verify the component is mounted
Elements from unmounted components won't appear. Check:
- Is the modal open?
- Is the user on the right screen?
- Has the conditional rendered?

## Element Hints

Apps can provide hints to help AI understand elements:

```typescript
autonomoRegister('Login.Email', 'input', setEmail, {
  label: 'Email Address',
  hint: 'Must be a valid email. Used for account recovery.',
  placeholder: 'user@example.com'
});
```

These appear in `get_state`:
```
elements: [
  {
    id: "Login.Email",
    type: "input",
    label: "Email Address",
    hint: "Must be a valid email. Used for account recovery."
  }
]
```
