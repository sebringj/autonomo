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
