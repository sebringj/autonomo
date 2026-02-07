# Testing Scenarios

## Common Patterns

### 1. Login Flow (with Custom Action)

**Recommended approach using custom action:**

```
# Fast, reliable login
autonomo_send_command(
  bridge="myapp",
  action="custom",
  target="devLogin",
  value="5551234567"
)

autonomo_get_state(bridge="myapp")
# Verify: screen should be dashboard, user should be set
```

**If you must test the UI flow:**

```
autonomo_run_scenario(
  bridge="myapp",
  scenario=[
    { action: "navigate", target: "/login" },
    { action: "waitFor", condition: "element:Login.PhoneInput" },
    { action: "fillIn", target: "Login.PhoneInput", value: "5551234567" },
    { action: "press", target: "Login.SubmitButton" },
    { action: "waitFor", condition: "screen:/otp" },
    { action: "fillIn", target: "OTP.CodeInput", value: "111111" },
    { action: "press", target: "OTP.VerifyButton" },
    { action: "waitFor", condition: "screen:/dashboard" }
  ]
)
```

### 2. Form Submission

```
autonomo_run_scenario(
  bridge="myapp",
  scenario=[
    # Navigate to form
    { action: "navigate", target: "/create-team" },
    { action: "waitFor", condition: "element:TeamForm.NameInput" },
    
    # Fill form fields
    { action: "fillIn", target: "TeamForm.NameInput", value: "Eagles" },
    { action: "fillIn", target: "TeamForm.AgeGroup", value: "U12" },
    { action: "fillIn", target: "TeamForm.Color", value: "#FF0000" },
    
    # Submit
    { action: "press", target: "TeamForm.CreateButton" },
    
    # Verify success
    { action: "waitFor", condition: "screen:/teams" },
    { action: "waitFor", condition: "element:Team.Eagles" }
  ]
)
```

### 3. Modal Interaction

```
# Open modal
autonomo_send_command(bridge="myapp", action="press", target="Dashboard.CreateButton")

# Wait for modal to appear
autonomo_wait_for(bridge="myapp", condition="element:Modal.CreateTeam.Title")

# Interact with modal
autonomo_send_command(bridge="myapp", action="fillIn", target="Modal.CreateTeam.NameInput", value="Lions")
autonomo_send_command(bridge="myapp", action="press", target="Modal.CreateTeam.SaveButton")

# Wait for modal to close (element disappears)
autonomo_wait_for(bridge="myapp", condition="noElement:Modal.CreateTeam.Title", timeout=3000)
```

### 4. List/Table Operations

```
# Navigate to list
autonomo_send_command(bridge="myapp", action="navigate", target="/teams")

# Wait for list to load
autonomo_wait_for(bridge="myapp", condition="element:TeamList.Item.0")

# Click first item
autonomo_send_command(bridge="myapp", action="press", target="TeamList.Item.0")

# Wait for detail view
autonomo_wait_for(bridge="myapp", condition="screen:/team/")

# Verify content
autonomo_get_state(bridge="myapp")
# Check data or elements for expected values
```

### 5. Error Handling Test

```
# Submit invalid form to trigger error
autonomo_send_command(bridge="myapp", action="press", target="Form.SubmitButton")

# Get state and check for errors
autonomo_get_state(bridge="myapp")
# Response should include: errors: ["Name is required"]

# Or wait for error element
autonomo_wait_for(bridge="myapp", condition="element:Form.NameError")
```

### 6. Multi-User Chat

```
autonomo_cross_bridge_scenario(
  scenario=[
    # Both users log in
    { bridge: "alice", action: "custom", target: "devLogin", value: "5551111111" },
    { bridge: "bob", action: "custom", target: "devLogin", value: "5552222222" },
    
    # Both navigate to same chat
    { bridge: "alice", action: "navigate", target: "/chat/room-1" },
    { bridge: "bob", action: "navigate", target: "/chat/room-1" },
    { bridge: "alice", action: "waitFor", condition: "element:Chat.Input" },
    { bridge: "bob", action: "waitFor", condition: "element:Chat.Input" },
    
    # Alice sends message
    { bridge: "alice", action: "fillIn", target: "Chat.Input", value: "Hey Bob!" },
    { bridge: "alice", action: "press", target: "Chat.SendButton" },
    
    # Bob should receive it
    { bridge: "bob", action: "wait", timeout: 2000 },  # Allow sync time
    { bridge: "bob", action: "waitFor", condition: "element:Chat.Message.HeyBob" },
    
    # Bob replies
    { bridge: "bob", action: "fillIn", target: "Chat.Input", value: "Hi Alice!" },
    { bridge: "bob", action: "press", target: "Chat.SendButton" },
    
    # Alice should receive it
    { bridge: "alice", action: "wait", timeout: 2000 },
    { bridge: "alice", action: "waitFor", condition: "element:Chat.Message.HiAlice" }
  ]
)
```

### 7. Role-Based Access

```
# Test that admin can access admin panel
autonomo_send_command(bridge="myapp", action="custom", target="loginAs", value="admin@test.com")
autonomo_send_command(bridge="myapp", action="navigate", target="/admin")
autonomo_get_state(bridge="myapp")
# Should show admin panel elements

# Test that regular user cannot
autonomo_send_command(bridge="myapp", action="custom", target="loginAs", value="user@test.com")
autonomo_send_command(bridge="myapp", action="navigate", target="/admin")
autonomo_get_state(bridge="myapp")
# Should show access denied or redirect
```

### 8. Search and Filter

```
# Navigate to searchable list
autonomo_send_command(bridge="myapp", action="navigate", target="/products")
autonomo_wait_for(bridge="myapp", condition="element:Search.Input")

# Enter search query
autonomo_send_command(bridge="myapp", action="fillIn", target="Search.Input", value="laptop")
autonomo_send_command(bridge="myapp", action="submit", target="Search.Input")

# Wait for results
autonomo_wait_for(bridge="myapp", condition="element:SearchResults.Item.0")

# Verify results are filtered
autonomo_get_state(bridge="myapp")
# Check that results contain "laptop"
```

### 9. Pagination

```
# Load first page
autonomo_send_command(bridge="myapp", action="navigate", target="/items")
autonomo_wait_for(bridge="myapp", condition="element:ItemList.Item.0")

# Get first page state
autonomo_get_state(bridge="myapp")
# Note: elements show items 0-9

# Go to next page
autonomo_send_command(bridge="myapp", action="press", target="Pagination.NextButton")
autonomo_wait_for(bridge="myapp", condition="element:ItemList.Item.10")

# Verify page changed
autonomo_get_state(bridge="myapp")
# Note: elements now show items 10-19
```

### 10. Full CRUD Flow

```
autonomo_run_scenario(
  bridge="myapp",
  scenario=[
    # CREATE
    { action: "navigate", target: "/items/new" },
    { action: "fillIn", target: "ItemForm.Name", value: "Test Item" },
    { action: "press", target: "ItemForm.SaveButton" },
    { action: "waitFor", condition: "screen:/items/" },
    
    # READ (verify in list)
    { action: "navigate", target: "/items" },
    { action: "waitFor", condition: "element:ItemList.TestItem" },
    
    # UPDATE
    { action: "press", target: "ItemList.TestItem.EditButton" },
    { action: "waitFor", condition: "element:ItemForm.Name" },
    { action: "fillIn", target: "ItemForm.Name", value: "Updated Item" },
    { action: "press", target: "ItemForm.SaveButton" },
    { action: "waitFor", condition: "element:ItemList.UpdatedItem" },
    
    # DELETE
    { action: "press", target: "ItemList.UpdatedItem.DeleteButton" },
    { action: "waitFor", condition: "element:ConfirmDialog.YesButton" },
    { action: "press", target: "ConfirmDialog.YesButton" },
    { action: "wait", timeout: 1000 },
    # Verify item is gone - would need custom logic
  ]
)
```

## Scenario Building Tips

### 1. Start with get_state
Always know your starting point:
```
autonomo_get_state(bridge="myapp")
# Then build scenario from current state
```

### 2. Use waitFor Liberally
Don't assume instant transitions:
```
{ action: "press", target: "SubmitButton" },
{ action: "waitFor", condition: "screen:/success" },  # Always wait!
```

### 3. Break Complex Flows into Steps
Debug easier by running step-by-step:
```
# Instead of one big scenario, do:
send_command(step1)
get_state()  # Check
send_command(step2)
get_state()  # Check
# Then combine into scenario
```

### 4. Include Error Checks
Verify error states too:
```
{ action: "press", target: "SubmitEmptyForm" },
{ action: "waitFor", condition: "element:Form.ValidationError" }
```

### 5. Reset Between Tests
Clean state = reliable tests:
```
{ action: "custom", target: "resetTestState" },
{ action: "custom", target: "logout" },
{ action: "navigate", target: "/" }
```
