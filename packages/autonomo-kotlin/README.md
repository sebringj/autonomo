# Autonomo Kotlin

> ⚠️ **Testing/Source Package** - This package is currently used from source and is not published as a standalone package.

Kotlin/JVM integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

WebSocket is the primary integration path. HTTP transport helpers are legacy/optional.

## Installation

> **TODO:** Package not yet published. Requires JitPack setup. Install from source for now.

### From Source

```bash
git clone https://github.com/sebringj/autonomo.git
# Add the packages/autonomo-kotlin module to your project
```

### Future (once on JitPack)

```kotlin
// build.gradle.kts
repositories {
    maven { url = uri("https://jitpack.io") }
}

dependencies {
    implementation("com.github.sebringj.autonomo:autonomo-kotlin:0.1.0")
}
```

### Maven

```xml
<dependency>
    <groupId>com.autonomo</groupId>
    <artifactId>autonomo</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Quick Start

### 1. Register elements

```kotlin
import com.autonomo.*

// Register a button
val unregister = registerTapHandler("Login.Submit", hint = "Submits the login form") {
    handleLogin()
}

// Register an input
val unregister = registerFillHandler(
    "Login.Email",
    getValue = { email }
) { value ->
    email = value
}

// Set current screen
state.setScreen("login")

// Clean up when done
unregister()
```

### 2. Connect to MCP WebSocket server

```kotlin
import com.autonomo.*

// No in-app HTTP server required.
// Register handlers and run with MCP server configured on AUTONOMO_PORT.
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

```kotlin
import com.autonomo.*

val unregister = registerCustomAction("enterOTP") { value ->
    if (value == null || value.length != 6) {
        return@registerCustomAction ActionResult.fail("OTP must be 6 digits")
    }
    
    // Fill all OTP boxes
    value.forEachIndexed { index, char ->
        otpFields[index].text = char.toString()
    }
    
    ActionResult.ok("OTP entered")
}
```

## Framework Integration

### Jetpack Compose

```kotlin
import androidx.compose.runtime.*
import com.autonomo.*

@Composable
fun LoginScreen() {
    var email by remember { mutableStateOf("") }
    
    DisposableEffect(Unit) {
        state.setScreen("login")
        
        val unregisterButton = registerTapHandler("Login.Submit") {
            handleLogin()
        }
        
        val unregisterInput = registerFillHandler(
            "Login.Email",
            getValue = { email }
        ) { value ->
            email = value
        }
        
        onDispose {
            unregisterButton()
            unregisterInput()
        }
    }
    
    Column {
        TextField(
            value = email,
            onValueChange = { email = it },
            label = { Text("Email") }
        )
        Button(onClick = { handleLogin() }) {
            Text("Login")
        }
    }
}

// In Application class
class MyApplication : Application() {
    private var transport: TransportInstance? = null
    
    override fun onCreate() {
        super.onCreate()
        if (BuildConfig.DEBUG) {
            transport = createHttpTransport(TransportConfig(port = 8080))
        }
    }
    
    override fun onTerminate() {
        transport?.stop()
        super.onTerminate()
    }
}
```

### Android Views

```kotlin
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.autonomo.*

class LoginActivity : AppCompatActivity() {
    private val unregisterHandlers = mutableListOf<() -> Unit>()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_login)
        
        state.setScreen("login")
        
        val submitButton = findViewById<Button>(R.id.submitButton)
        val emailField = findViewById<EditText>(R.id.emailField)
        
        unregisterHandlers += registerTapHandler("Login.Submit") {
            handleLogin()
        }
        
        unregisterHandlers += registerFillHandler(
            "Login.Email",
            getValue = { emailField.text.toString() }
        ) { value ->
            emailField.setText(value)
        }
    }
    
    override fun onDestroy() {
        unregisterHandlers.forEach { it() }
        super.onDestroy()
    }
}
```

### Ktor Server

```kotlin
import io.ktor.server.application.*
import io.ktor.server.routing.*
import com.autonomo.*

fun Application.module() {
    // Start Autonomo bridge
    val transport = createHttpTransport(TransportConfig(port = 8081))
    
    // Register routes as elements
    routing {
        post("/api/users") {
            // ...
        }
    }
    registerTapHandler("POST /api/users") { /* tracked */ }
    
    environment.monitor.subscribe(ApplicationStopped) {
        transport.stop()
    }
}
```

### Spring Boot

```kotlin
import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.stereotype.Controller
import com.autonomo.*
import javax.annotation.PostConstruct
import javax.annotation.PreDestroy

@SpringBootApplication
class Application {
    private var transport: TransportInstance? = null
    
    @PostConstruct
    fun init() {
        transport = createHttpTransport(TransportConfig(port = 8081))
    }
    
    @PreDestroy
    fun cleanup() {
        transport?.stop()
    }
}

@Controller
class HomeController {
    @GetMapping("/")
    fun home(): String {
        state.setScreen("home")
        return "home"
    }
}
```

## API Reference

### Registry

- `registerTapHandler(id, disabled, hint, meta, handler)` - Register a tappable element
- `registerFillHandler(id, getValue, onSubmit, disabled, hint, meta, handler)` - Register an input
- `registerToggleHandler(id, getValue, disabled, hint, meta, handler)` - Register a toggle
- `ElementRegistry` - Access the registry directly

### State

- `state.setScreen(name)` - Set current screen
- `state.setUser(context)` - Set user context
- `state.mergeData(data)` - Add app-specific data
- `state.addError(error)` - Log an error
- `state.getState()` - Get current state snapshot

### Commands

- `executeCommand(command, target, value)` - Execute a command programmatically
- `setNavigationHandler(handler)` - Set navigation callback

### Transport

- `createHttpTransport(config)` - Legacy optional HTTP server helper
- `Transport.handleRequest(method, path, body)` - Handle request manually

## Requirements

- JDK 17+
- Kotlin 1.9+

## License

See [LICENSE.md](../../LICENSE.md) for license information.
