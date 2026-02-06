# Autonomo.CSharp

C# integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

## Installation

> **TODO:** Package not yet published to NuGet. Install from source for now.

```bash
# Clone the repo and reference the project directly
git clone https://github.com/sebringj/autonomo.git
# Add project reference to packages/Autonomo.CSharp
```

## Quick Start

### 1. Register elements

```csharp
using Autonomo;

// Register a button
var unregister = Registry.RegisterTapHandler(
    "Login.Submit",
    () => HandleLogin(),
    hint: "Submits the login form"
);

// Register an input
var unregister = Registry.RegisterFillHandler(
    "Login.Email",
    value => SetEmail(value),
    getValue: () => _email
);

// Set current screen
State.SetScreen("login");
```

### 2. Start the bridge

```csharp
using Autonomo;

// Start in development
using var transport = Transport.CreateHttpTransport(new TransportConfig
{
    Port = 8080,
    OnStart = url => Console.WriteLine($"Autonomo ready at {url}")
});

// Your app runs here...
Console.ReadLine();
```

### 3. Connect your AI tool

Add to VS Code settings or claude_desktop_config.json:

```json
{
  "mcpServers": {
    "autonomo": {
      "command": "npx",
      "args": ["autonomo", "serve", "--url", "http://localhost:8080"]
    }
  }
}
```

## Custom Actions

For complex flows:

```csharp
using Autonomo;

var unregister = CustomActions.Register("enterOTP", value =>
{
    // Fill all OTP boxes
    for (int i = 0; i < value?.Length; i++)
    {
        _otpFields[i].Text = value[i].ToString();
    }
    return ActionResult.Ok("OTP entered");
});
```

## Framework Integration

### WPF

```csharp
public partial class MainWindow : Window
{
    private TransportInstance? _transport;

    public MainWindow()
    {
        InitializeComponent();
        State.SetScreen("main");
        
        // Register button
        Registry.RegisterTapHandler("Main.Submit", () => OnSubmit());
        
        // Start bridge in dev
        #if DEBUG
        _transport = Transport.CreateHttpTransport(new TransportConfig { Port = 8080 });
        #endif
    }

    protected override void OnClosed(EventArgs e)
    {
        _transport?.Dispose();
        base.OnClosed(e);
    }
}
```

### WinForms

```csharp
public class MainForm : Form
{
    private TransportInstance? _transport;

    public MainForm()
    {
        State.SetScreen("main");
        
        var button = new Button { Text = "Click Me" };
        button.Click += (s, e) => OnButtonClick();
        Controls.Add(button);
        
        Registry.RegisterTapHandler("Main.ClickMe", () => OnButtonClick());
        
        #if DEBUG
        _transport = Transport.CreateHttpTransport(new TransportConfig { Port = 8080 });
        #endif
    }

    protected override void OnFormClosed(FormClosedEventArgs e)
    {
        _transport?.Dispose();
        base.OnFormClosed(e);
    }
}
```

### ASP.NET

```csharp
// In Program.cs or controller
public class MyController : Controller
{
    public IActionResult Index()
    {
        State.SetScreen("home");
        return View();
    }
}
```

### MAUI

```csharp
public partial class MainPage : ContentPage
{
    public MainPage()
    {
        InitializeComponent();
        State.SetScreen("main");
        
        Registry.RegisterTapHandler("Main.Counter", () => OnCounterClicked());
    }
}

// In MauiProgram.cs
#if DEBUG
var transport = Transport.CreateHttpTransport(new TransportConfig { Port = 8080 });
#endif
```

## API Reference

### Registry

- `Registry.RegisterTapHandler(id, handler, ...)` - Register a tappable element
- `Registry.RegisterFillHandler(id, handler, ...)` - Register a fillable input
- `Registry.RegisterToggleHandler(id, handler, ...)` - Register a toggle

### State

- `State.SetScreen(name)` - Set current screen
- `State.SetUser(context)` - Set user context
- `State.MergeData(data)` - Add app-specific data
- `State.AddError(error)` - Log an error

### Commands

- `Commands.Execute(cmd, target, value)` - Execute a command programmatically

### Transport

- `Transport.CreateHttpTransport(config)` - Start HTTP server
- `Transport.HandleRequest(method, path, body)` - Handle request manually

## License

See [LICENSE.md](../../LICENSE.md) for license information.
