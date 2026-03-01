# Best Practices

## The Golden Rules

### 1. Always Get State First

```
✗ Wrong:
"I'll press the login button"
send_command(press, "LoginButton")  # May not exist!

✓ Right:
"Let me check what's available"
get_state()  # See current screen and elements
# Then act based on actual state
```

### 2. Always Get State After Commands

```
✗ Wrong:
send_command(press, "Submit")
"It worked!"  # How do you know?

✓ Right:
send_command(press, "Submit")
get_state()
# Check: errors array empty? Screen changed? Expected elements present?
```

### 3. Stop On Errors

```
get_state() returns errors: ["Invalid email format"]

✗ Wrong:
"I'll try again with different input"

✓ Right:
"There's an error. I need to understand and fix this first."
# Investigate, fix the issue, verify errors cleared
```

## Element Handling

### Use Hierarchical IDs

```
Good naming convention:
Screen.Section.Element

Examples:
- Login.Form.EmailInput
- Login.Form.PasswordInput
- Login.Form.SubmitButton
- Dashboard.Header.ProfileButton
- Dashboard.Stats.RefreshButton
- Modal.CreateTeam.NameInput
- Modal.CreateTeam.SaveButton
```

### Check Element Existence Before Acting

```
state = get_state()
if "Modal.SaveButton" in state.elements:
    send_command(press, "Modal.SaveButton")
else:
    # Modal not open, need to open it first
    send_command(press, "Dashboard.CreateButton")
```

### Handle Conditional Elements

Elements only appear when rendered:

```
# Wrong assumption: "The error message element should always exist"
# Right understanding: "Error message only appears after validation fails"

# So:
send_command(press, "Submit")  # Trigger validation
get_state()  # NOW check for error element
```

## Custom Actions

### Create Actions for Common Operations

```typescript
// Instead of clicking through 5 screens:
autonomoRegisterCustomAction('goToTeamDashboard', (teamId) => {
  navigation.navigate('Team', { id: teamId, tab: 'dashboard' });
});

// Instead of filling 10 form fields:
autonomoRegisterCustomAction('createFullTeam', (data) => {
  const parsed = JSON.parse(data);
  return teamService.createWithDefaults(parsed);
});
```

### Keep Auth in Custom Actions

```typescript
// Always bypass real auth in testing
autonomoRegisterCustomAction('devLogin', async (phone) => {
  await auth.signInWithDevToken(phone);
});

// Never test real OTP/OAuth flows with Autonomo
// Those should be tested with proper E2E frameworks
```

### Document Custom Action Parameters

```typescript
// Good: Clear what's expected
autonomoRegisterCustomAction('createTeam', (jsonParams) => {
  // jsonParams: { name: string, ageGroup: string, color?: string }
  const { name, ageGroup, color = '#000000' } = JSON.parse(jsonParams);
  return teamService.create({ name, ageGroup, color });
});
```

## Multi-Device Testing

### Use Descriptive Bridge IDs

```
✓ Good:
- "alice-mobile"
- "bob-web"
- "admin-dashboard"
- "seller-app"
- "buyer-app"

✗ Bad:
- "bridge1"
- "b2"
- "test"
```

### Add Sync Delays Between Devices

```
# User A sends
{ bridge: "alice", action: "press", target: "SendButton" },

# Wait for server sync
{ bridge: "bob", action: "wait", timeout: 2000 },

# Then check User B
{ bridge: "bob", action: "waitFor", condition: "element:NewMessage" }
```

### Get All States for Debugging

```
# When something goes wrong:
autonomo_get_state(bridge="all")

# This shows state from every connected bridge
# Helps identify which device has the issue
```

## Error Handling

### Treat Errors as Stop Signs

```
get_state() returns:
{
  errors: ["Failed to save: Network error"],
  renderErrors: []
}

Action: STOP. Fix the network issue before continuing.
```

### Distinguish Error Types

```
errors: []          # App errors (API, validation)
renderErrors: []    # React/rendering errors

# Both empty = good
# Either populated = investigate and fix
```

### Backend Errors Must Be Clear and Actionable

The errors array is only useful if your backend returns **descriptive, serialized error messages**. Generic errors like "Something went wrong" make AI troubleshooting impossible.

**Bad backend responses:**
```json
{ "error": "Error" }
{ "error": "Request failed" }
{ "status": 500 }
```

**Good backend responses:**
```json
{ "error": "Validation failed: email format invalid", "field": "email" }
{ "error": "Team not found", "code": "TEAM_NOT_FOUND", "teamId": "abc123" }
{ "error": "Permission denied: user lacks 'admin' role for league 'xyz'" }
```

**App code should capture and expose these clearly:**
```typescript
// In your API layer, serialize errors for Autonomo
try {
  const result = await api.createTeam(data);
  return result;
} catch (err) {
  // Capture the full error context
  const errorMessage = err.response?.data?.error 
    || err.response?.data?.message
    || err.message
    || 'Unknown error';
  
  // Report to Autonomo state
  autonomoAddError(`createTeam failed: ${errorMessage}`);
  throw err;
}
```

**Why this matters:**
- AI agents can only diagnose what they can see
- "Failed to save" → AI doesn't know what to fix
- "Failed to save: team name already exists" → AI knows to try a different name
- Clear errors = faster iteration = better AI-assisted development

### Clean Up After Failures

```
# If a test fails midway:
autonomo_send_command(bridge="myapp", action="custom", target="resetState")
autonomo_send_command(bridge="myapp", action="custom", target="logout")
autonomo_send_command(bridge="myapp", action="navigate", target="/")

# Then start fresh
```

## Scenario Design

### Start Small, Then Combine

```
# First, test individual steps:
send_command(navigate, "/login")
get_state()  # Works?

send_command(fillIn, "Login.Email", "test@test.com")
get_state()  # Works?

# Once individual steps work, combine:
run_scenario([
  { action: "navigate", target: "/login" },
  { action: "fillIn", target: "Login.Email", value: "test@test.com" },
  ...
])
```

### Include Verification Steps

```
scenario=[
  { action: "press", target: "CreateButton" },
  { action: "waitFor", condition: "element:Modal.Title" },  # Verify modal opened
  
  { action: "fillIn", target: "Modal.Name", value: "Test" },
  { action: "press", target: "Modal.SaveButton" },
  { action: "waitFor", condition: "noElement:Modal.Title" },  # Verify modal closed
  
  { action: "waitFor", condition: "element:List.Test" }  # Verify item created
]
```

### Use Meaningful Step Descriptions

```
scenario=[
  {
    action: "custom",
    target: "devLogin",
    value: "admin@test.com",
    description: "Log in as admin user"  # Helps debugging
  },
  {
    action: "navigate",
    target: "/admin/users",
    description: "Navigate to user management"
  },
  ...
]
```

## Screen Hints & Suggested Flow

### Use Screen Hints to Guide AI Agents

Screen hints provide context about what a screen is for and how to use it:

```typescript
// React Native
const { setScreenContext } = useAutonomo({
  name: 'my-app',
  getState: () => ({
    screen: '/login',
    screenHint: 'Enter phone number and tap Send Code. Use the fillOtp custom action after receiving code.',
    elements: [...],
  }),
});

// Or use the state manager directly
import { state } from 'autonomo-core';
state.setScreenContext('/login', 
  'Enter phone number and tap Send Code. Use fillOtp after receiving code.',
  [
    { action: 'fillIn', target: 'Login.PhoneInput', value: '+15551234567', description: 'Enter phone number' },
    { action: 'press', target: 'Login.SendCodeButton', description: 'Request OTP code' },
  ]
);
```

### When to Use Screen Hints

```
✓ Good use cases:
- Complex flows with multiple steps
- Screens with custom actions that aren't obvious
- Forms with specific validation rules
- Workflows with dependencies between elements

✗ Unnecessary:
- Simple CRUD screens
- Standard forms with clear labels
- Screens with obvious single actions
```

### Suggested Flow for Multi-Step Screens

Help AI understand the typical workflow:

```typescript
getState: () => ({
  screen: '/checkout',
  screenHint: 'Complete checkout: fill shipping, then payment, then review.',
  suggestedFlow: [
    { 
      action: 'fillIn', 
      target: 'Checkout.AddressInput', 
      description: 'Enter shipping address' 
    },
    { 
      action: 'press', 
      target: 'Checkout.ContinueButton', 
      description: 'Proceed to payment' 
    },
    { 
      action: 'custom', 
      target: 'enterTestCard', 
      description: 'Use custom action for test payment card' 
    },
    { 
      action: 'press', 
      target: 'Checkout.PlaceOrderButton', 
      description: 'Complete order' 
    },
  ],
  elements: [...],
})
```

### Flutter Example

```dart
state.setScreenContext(
  '/onboarding',
  hint: 'Complete profile setup: name, then preferences, then photo.',
  flow: [
    SuggestedAction(action: 'fillIn', target: 'Onboarding.NameInput', description: 'Enter display name'),
    SuggestedAction(action: 'press', target: 'Onboarding.PreferencesButton', description: 'Open preferences'),
    SuggestedAction(action: 'custom', target: 'selectPreferences', value: '["sports","music"]'),
    SuggestedAction(action: 'press', target: 'Onboarding.CompleteButton', description: 'Finish setup'),
  ],
);
```

---

## Performance Tips

### Prefer Custom Actions Over UI Clicks

```
# Slow (clicks through 5 screens):
navigate("/settings")
press("ProfileTab")
press("EditButton")
fillIn("Name", "New Name")
press("SaveButton")

# Fast (direct operation):
send_command(custom, "updateProfile", '{"name": "New Name"}')
```

### Use waitFor Instead of Fixed Waits

```
# Bad: Fixed wait (might be too short or too long)
{ action: "wait", timeout: 5000 }

# Good: Wait for specific condition
{ action: "waitFor", condition: "element:LoadingSpinner", timeout: 100 }
{ action: "waitFor", condition: "noElement:LoadingSpinner", timeout: 10000 }
```

### Batch State Checks

```
# Instead of checking after every command:
send_command(...)
get_state()
send_command(...)
get_state()
send_command(...)
get_state()

# Check after logical groups:
send_command(fillIn, "Name", "Test")
send_command(fillIn, "Email", "test@test.com")
send_command(fillIn, "Phone", "5551234567")
get_state()  # Verify all fields filled

send_command(press, "Submit")
get_state()  # Verify submission result
```

## Testing Philosophy

### Test Behavior, Not Implementation

```
# Bad: Testing specific element IDs
"Press Button_12345_submit"

# Good: Testing user intent
"Submit the form and verify success message appears"
```

### Keep Tests Independent

```
# Bad: Test 2 depends on Test 1's state
Test 1: Creates a team
Test 2: Edits the team (assumes team exists)

# Good: Each test sets up its own state
Test 2: 
  custom("createTeam", "TestTeam")
  # Now edit it
```

### Test Error Paths Too

```
# Don't just test happy path:
fillIn("Email", "valid@email.com")
press("Submit")
# Success!

# Also test error paths:
fillIn("Email", "invalid-email")
press("Submit")
# Verify error message appears
```
