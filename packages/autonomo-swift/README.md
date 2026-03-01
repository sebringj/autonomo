# Autonomo Swift

> ⚠️ **Testing/Source Package** - This package is currently used from source and is not published as a standalone package.

Swift integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

WebSocket is the primary integration path. HTTP transport helpers are legacy/optional.

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/sebringj/autonomo.git", from: "0.1.0")
]
```

Or in Xcode: File → Add Packages → Enter the repository URL.

## Quick Start

### 1. Register elements

```swift
import Autonomo

// Register a button
let unregister = registerTapHandler("Login.Submit", hint: "Submits the login form") {
    handleLogin()
}

// Register an input
let unregister = registerFillHandler(
    "Login.Email",
    getValue: { email }
) { value in
    email = value
}

// Set current screen
state.setScreen("login")

// Clean up when view disappears
unregister()
```

### 2. Connect to MCP WebSocket server

```swift
import Autonomo

// No in-app HTTP server required.
// Start your app with Autonomo handlers registered,
// and run the MCP server configured with AUTONOMO_PORT (default 9876).
```

### 3. Connect your AI tool

Add to `.vscode/mcp.json`:

```json
{
    "servers": {
        "autonomo": {
            "command": "npx",
            "args": ["-y", "autonomo"],
            "env": {
                "AUTONOMO_PORT": "9876"
            }
    }
  }
}
```

## Custom Actions

For complex flows:

```swift
import Autonomo

let unregister = registerCustomAction("enterOTP") { value in
    guard let value = value, value.count == 6 else {
        return .fail("OTP must be 6 digits")
    }
    
    // Fill all OTP boxes
    for (index, char) in value.enumerated() {
        otpFields[index].text = String(char)
    }
    
    return .ok("OTP entered")
}
```

## Framework Integration

### SwiftUI

```swift
import SwiftUI
import Autonomo

struct LoginView: View {
    @State private var email = ""
    
    var body: some View {
        VStack {
            TextField("Email", text: $email)
            Button("Login") { handleLogin() }
        }
        .onAppear {
            state.setScreen("login")
            
            registerTapHandler("Login.Submit") { handleLogin() }
            registerFillHandler("Login.Email", getValue: { email }) { email = $0 }
        }
        .onDisappear {
            ElementRegistry.shared.clear()
        }
    }
}

// In App.swift
@main
struct MyApp: App {
    init() {
        #if DEBUG
        _ = createHttpTransport(TransportConfig(port: 8080))
        #endif
    }
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

### UIKit

```swift
import UIKit
import Autonomo

class LoginViewController: UIViewController {
    @IBOutlet weak var emailField: UITextField!
    @IBOutlet weak var submitButton: UIButton!
    
    private var unregisterHandlers: [() -> Void] = []
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        state.setScreen("login")
        
        unregisterHandlers.append(
            registerTapHandler("Login.Submit") { [weak self] in
                self?.handleLogin()
            }
        )
        
        unregisterHandlers.append(
            registerFillHandler(
                "Login.Email",
                getValue: { [weak self] in self?.emailField.text ?? "" }
            ) { [weak self] value in
                self?.emailField.text = value
            }
        )
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        unregisterHandlers.forEach { $0() }
        unregisterHandlers.removeAll()
    }
    
    @IBAction func loginTapped(_ sender: Any) {
        handleLogin()
    }
}
```

### AppKit (macOS)

```swift
import AppKit
import Autonomo

class MainWindowController: NSWindowController {
    override func windowDidLoad() {
        super.windowDidLoad()
        state.setScreen("main")
        
        registerTapHandler("Main.Preferences") { [weak self] in
            self?.showPreferences()
        }
    }
}

// In AppDelegate
@main
class AppDelegate: NSObject, NSApplicationDelegate {
    var transport: TransportInstance?
    
    func applicationDidFinishLaunching(_ notification: Notification) {
        #if DEBUG
        transport = createHttpTransport(TransportConfig(port: 8080))
        #endif
    }
    
    func applicationWillTerminate(_ notification: Notification) {
        transport?.stop()
    }
}
```

## API Reference

### Registry

- `registerTapHandler(_:disabled:hint:meta:handler:)` - Register a tappable element
- `registerFillHandler(_:getValue:onSubmit:disabled:hint:meta:handler:)` - Register an input
- `registerToggleHandler(_:getValue:disabled:hint:meta:handler:)` - Register a toggle
- `ElementRegistry.shared` - Access the registry directly

### State

- `state.setScreen(_:)` - Set current screen
- `state.setUser(_:)` - Set user context
- `state.mergeData(_:)` - Add app-specific data
- `state.addError(_:)` - Log an error
- `state.getState()` - Get current state snapshot

### Commands

- `executeCommand(_:target:value:)` - Execute a command programmatically
- `setNavigationHandler(_:)` - Set navigation callback

### Transport

- `createHttpTransport(_:)` - Legacy optional HTTP server helper
- `Transport.handleRequest(method:path:body:)` - Handle request manually

## Requirements

- iOS 15.0+ / macOS 12.0+ / tvOS 15.0+ / watchOS 8.0+
- Swift 5.9+

## License

See [LICENSE.md](../../LICENSE.md) for license information.
