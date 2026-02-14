# autonomo_flutter

> ⚠️ **Testing/Source Package** - This package is currently used from source and is not published as a standalone package.

Flutter integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

WebSocket is the primary integration path. HTTP transport helpers are legacy/optional.

## Installation

```yaml
dependencies:
  autonomo_flutter: ^0.1.0
```

## Quick Start

### 1. Wrap your screens

```dart
import 'package:autonomo_flutter/autonomo_flutter.dart';

class HomeScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AutonomoScreen(
      name: 'home',
      child: Scaffold(
        // ... your content
      ),
    );
  }
}
```

### 2. Use Autonomo widgets

```dart
// Button that AI can tap
AutonomoButton(
  id: 'Login.Submit',
  onPressed: () => _handleLogin(),
  child: Text('Log In'),
)

// Text field that AI can fill
AutonomoTextField(
  id: 'Login.Email',
  labelText: 'Email',
  onChanged: (value) => _email = value,
)
```

### 3. Or register manually

```dart
class MyWidget extends StatefulWidget {
  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  void Function()? _unregister;

  @override
  void initState() {
    super.initState();
    _unregister = registerTapHandler(
      'Custom.Button',
      () async => _doSomething(),
      hint: 'Triggers the custom action',
    );
  }

  @override
  void dispose() {
    _unregister?.call();
    super.dispose();
  }
}
```

### 4. Connect to MCP WebSocket server

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // No in-app HTTP server required.
  // Register handlers and run with MCP server configured on AUTONOMO_PORT.
  
  runApp(MyApp());
}
```

### 5. Connect your AI tool

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "autonomo": {
      "command": "npx",
      "args": ["-y", "github:sebringj/autonomo/packages/@autonomo/mcp-server"],
      "env": {
        "AUTONOMO_PORT": "9876"
      }
    }
  }
}
```

## Custom Actions

For complex flows like OTP entry:

```dart
AutonomoCustomAction(
  name: 'enterOTP',
  handler: ([value]) async {
    // Fill all OTP boxes with the code
    for (int i = 0; i < 6; i++) {
      _otpControllers[i].text = value?[i] ?? '';
    }
    return ActionResult(success: true, message: 'OTP entered');
  },
  child: OTPInputWidget(),
)
```

## API Reference

### Widgets

- `AutonomoScreen` - Sets the current screen name
- `AutonomoButton` - Button with automatic registration
- `AutonomoTextField` - Text field with automatic registration
- `AutonomoCustomAction` - Registers a custom action

### Functions

- `registerTapHandler(id, handler)` - Register a tappable element
- `registerFillHandler(id, handler)` - Register a fillable input
- `registerToggleHandler(id, handler)` - Register a toggle
- `registerCustomAction(name, handler)` - Register a custom action
- `setNavigationHandler(handler)` - Set app navigation handler

### State Management

- `state.setScreen(name)` - Set current screen
- `state.setUser(context)` - Set user context
- `state.mergeData(data)` - Add app-specific data
- `state.addError(error)` - Log an error

## License

See [LICENSE.md](../../LICENSE.md) for license information.
