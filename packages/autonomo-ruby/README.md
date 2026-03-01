# autonomo

> ⚠️ **Testing/Source Package** - This package is currently used from source and is not published as a standalone RubyGems package.

Ruby integration for [Autonomo](https://github.com/sebringj/autonomo) - AI-powered application testing.

WebSocket is the primary integration path. HTTP transport helpers are legacy/optional.

## Installation

Add to your Gemfile:

```ruby
gem 'autonomo', git: 'https://github.com/sebringj/autonomo.git', glob: 'packages/autonomo-ruby/*.gemspec'
```

Then run:

```bash
bundle install
```

## Quick Start

### 1. Register elements

```ruby
require 'autonomo'

# Register a button
unregister = Autonomo.register_tap_handler('Login.Submit', hint: 'Submits the login form') do
  handle_login
end

# Register an input
unregister = Autonomo.register_fill_handler(
  'Login.Email',
  get_value: -> { @email }
) do |value|
  @email = value
end

# Set current screen
Autonomo.state.set_screen('login')
```

### 2. Connect to MCP WebSocket server

```ruby
require 'autonomo'

# No in-app HTTP server required.
# Register handlers and run with MCP server configured on AUTONOMO_PORT.
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

```ruby
require 'autonomo'

unregister = Autonomo.register_custom_action('enterOTP') do |value|
  # Fill all OTP boxes
  value.chars.each_with_index do |char, i|
    @otp_fields[i] = char
  end
  Autonomo::ActionResult.ok('OTP entered')
end
```

## Framework Integration

### Rails

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  before_action :set_autonomo_screen

  private

  def set_autonomo_screen
    Autonomo.state.set_screen(controller_path)
  end
end

# config/initializers/autonomo.rb (development only)
if Rails.env.development?
  Thread.new do
    Autonomo.create_http_transport(
      Autonomo::TransportConfig.new(port: 8080)
    )
  end
end
```

### Sinatra

```ruby
require 'sinatra'
require 'autonomo'

# Start bridge
Autonomo.create_http_transport(Autonomo::TransportConfig.new(port: 8080))

get '/' do
  Autonomo.state.set_screen('home')
  erb :index
end

post '/login' do
  Autonomo.state.set_screen('login')
  # ...
end
```

### Hanami

```ruby
# config/initializers/autonomo.rb
require 'autonomo'

if Hanami.env?(:development)
  Autonomo.create_http_transport(
    Autonomo::TransportConfig.new(port: 8080)
  )
end
```

### Plain Ruby (CLI/Scripts)

```ruby
require 'autonomo'

Autonomo.state.set_screen('main')

# Register commands as elements
Autonomo.register_tap_handler('Command.Help') { show_help }
Autonomo.register_tap_handler('Command.Exit') { exit(0) }

# Register input
Autonomo.register_fill_handler('Input.Query') do |value|
  process_query(value)
end

# Start bridge
transport = Autonomo.create_http_transport(
  Autonomo::TransportConfig.new(port: 8080)
)

# Main loop
loop do
  # Your CLI logic
end
```

## API Reference

### Registry

- `Autonomo.register_tap_handler(id, **opts, &handler)` - Register a tappable element
- `Autonomo.register_fill_handler(id, **opts, &handler)` - Register a fillable input
- `Autonomo.register_toggle_handler(id, **opts, &handler)` - Register a toggle
- `Autonomo.registry` - Access the registry directly

### State

- `Autonomo.state.set_screen(name)` - Set current screen
- `Autonomo.state.set_user(context)` - Set user context
- `Autonomo.state.merge_data(data)` - Add app-specific data
- `Autonomo.state.add_error(error)` - Log an error
- `Autonomo.state.get_state` - Get current state snapshot

### Commands

- `Autonomo.execute_command(cmd, target, value)` - Execute a command programmatically
- `Autonomo.set_navigation_handler(&handler)` - Set navigation callback

### Transport

- `Autonomo.create_http_transport(config)` - Legacy optional HTTP server helper
- `Autonomo.handle_request(method, path, body)` - Handle request manually

## License

See [LICENSE.md](../../LICENSE.md) for license information.
