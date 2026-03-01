# Troubleshooting

## Quick Diagnosis

| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| "No bridges found" | App not connected | Check WebSocket connection |
| "Element not found" | Not registered | App must use `autonomoRegister` |
| "Command sent but nothing happened" | Async execution | Call `get_state` to see errors |
| "Wrong screen" | Navigation issue | Check route format |
| "Elements disappeared" | Component unmounted | Modal closed? Screen changed? |
| "Bridge connected but state empty" | Init not complete | Wait for app to fully load |

## Common Issues

### 1. "No bridges registered"

**Symptom**: `list_bridges` returns empty

**Causes & Solutions**:

```
1. App not running
   → Start your app (npm start, expo start, etc.)

2. Autonomo bridge not initialized
   → Add <AutonomoBridge /> to your app root

3. Wrong MCP server URL
   → Check AUTONOMO_URL matches MCP server

4. WebSocket connection failed
   → Check firewall, ports, CORS settings

5. MCP server not running
   → Start with: npx autonomo
```

### 2. "Element not found: XYZ"

**Symptom**: Command fails with element not found

**Debug Steps**:

```
Step 1: Get current state
autonomo_get_state(bridge="myapp")

Step 2: Check elements array
Look for your element ID in the response

Step 3: If missing, check app code
Search for: autonomoRegister, useAutonomoElement

Step 4: Verify element is mounted
- Is modal open?
- Is user on correct screen?
- Has conditional rendered?

Step 5: Check element ID spelling
IDs are case-sensitive!
```

**Common Fixes**:

```typescript
// Problem: testID without registration
<Button testID="submit" />  // ❌ Won't appear

// Solution: Add registration
const ref = useAutonomoElement('submit', 'tap', handleSubmit);
<Button ref={ref} testID="submit" />  // ✓ Will appear
```

### 3. "Command succeeded but nothing happened"

**Symptom**: `send_command` returns success but app didn't change

**Explanation**: Commands confirm *delivery*, not *completion*.

**Solution**: Always check state after:

```
# Wrong
send_command(press, "Submit")  // "Success!"
# Assume it worked... but did it?

# Right
send_command(press, "Submit")
get_state()  // Check for errors or expected changes
```

### 4. "Errors array not empty"

**Symptom**: `get_state` shows errors

**Action**: **STOP and fix before proceeding!**

```
Common error patterns:

1. API errors
   errors: ["Failed to fetch: 401 Unauthorized"]
   → Check auth token, login state

2. Validation errors  
   errors: ["Email is required"]
   → Fill required fields

3. Network errors
   errors: ["Network request failed"]
   → Check API server, internet connection

4. Permission errors
   errors: ["Not authorized to access this resource"]
   → Check user role, permissions
```

### 5. "renderErrors not empty"

**Symptom**: React/render errors in state

**This is critical!** Fix immediately:

```
Common render errors:

1. "Maximum update depth exceeded"
   → Infinite loop in useEffect/setState

2. "Too many re-renders"  
   → State update in render body

3. "Cannot read property of undefined"
   → Null check missing

4. "Invalid hook call"
   → Hook rules violation
```

### 6. "Bridge connected but state is stale"

**Symptom**: State doesn't update after commands

**Causes**:

```
1. Polling issue
   → Check WebSocket connection is live

2. App crashed silently
   → Check app console for errors

3. Bridge ID mismatch
   → Verify using correct bridge ID

4. Multiple instances
   → Close duplicate app instances
```

### 7. "Custom action not found"

**Symptom**: `customActions` array doesn't include expected action

**Solution**:

```typescript
// Ensure action is registered BEFORE connecting bridge
// Usually in app root:

function App() {
  useAutonomoCustomAction('devLogin', loginHandler);
  useAutonomoCustomAction('switchRole', roleHandler);
  
  return (
    <>
      <AutonomoBridge />
      <AppContent />
    </>
  );
}
```

### 8. "Navigation to screen failed"

**Symptom**: Navigate command doesn't change screen

**Common Issues**:

```
1. Wrong route format
   ✗ navigate to "home"
   ✓ navigate to "/home" or "/(tabs)/home"

2. Route doesn't exist
   → Check your router configuration

3. Auth guard blocking
   → User not logged in, can't access protected route

4. Navigation state stale
   → Try navigate to a known route first
```

## Debug Mode

### Enable Verbose Logging

In your app:
```typescript
connectAutonomo({
  url: 'ws://localhost:9876',
  debug: true  // Logs all state changes and commands
});
```

### Check MCP Server Logs

Run server with debug:
```bash
DEBUG=autonomo:* npx autonomo
```

### Network Inspection

For web apps, check browser DevTools:
- Network tab: WebSocket connections
- Console: Autonomo debug logs

## Reset Everything

When all else fails:

```
1. Stop the app completely

2. Stop MCP server

3. Clear app state:
   - Clear localStorage/AsyncStorage
   - Clear cookies/session
   - Kill app process

4. Start MCP server fresh:
   npx autonomo

5. Start app fresh

6. Verify clean state:
   autonomo_list_bridges()
   autonomo_get_state(bridge="all")
```

## Getting Help

If you're still stuck:

1. Check the [GitHub Issues](https://github.com/sebringj/autonomo/issues)
2. Include in bug reports:
   - App platform (React Native, Web, etc.)
   - Autonomo package versions
   - Minimal reproduction steps
   - State output from `get_state`
