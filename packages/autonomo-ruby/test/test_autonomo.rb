#!/usr/bin/env ruby
# Test harness for autonomo-ruby
# Run: ruby test/test_autonomo.rb

require_relative '../lib/autonomo'

$passed = 0
$failed = 0

def test(name)
  yield
  puts "✅ #{name}"
  $passed += 1
rescue => e
  puts "❌ #{name}"
  puts "   #{e.message}"
  $failed += 1
end

def assert(condition, message = "Assertion failed")
  raise message unless condition
end

def assert_equal(expected, actual, message = nil)
  msg = message || "Expected #{expected.inspect}, got #{actual.inspect}"
  raise msg unless expected == actual
end

puts "\n🧪 autonomo-ruby Test Harness\n"

# Reset singletons
Autonomo::ElementRegistry.instance.clear

test "registry starts empty" do
  assert Autonomo::ElementRegistry.instance.list.empty?
end

test "register_tap_handler adds element" do
  tapped = false
  
  unregister = Autonomo.register_tap_handler("Test.Button") { tapped = true }
  
  assert Autonomo::ElementRegistry.instance.has?("Test.Button")
  assert Autonomo::ElementRegistry.instance.list.include?("Test.Button")
  
  # Invoke handler (takes value argument)
  handler = Autonomo::ElementRegistry.instance.get("Test.Button")
  handler.handler.call(nil)
  assert tapped, "Handler should have been called"
  
  unregister.call
  assert !Autonomo::ElementRegistry.instance.has?("Test.Button")
end

test "register_fill_handler works with value" do
  value = ""
  
  unregister = Autonomo.register_fill_handler(
    "Test.Input",
    get_value: -> { value }
  ) { |v| value = v }
  
  handler = Autonomo::ElementRegistry.instance.get("Test.Input")
  handler.handler.call("test value")
  assert_equal "test value", value
  assert_equal "test value", handler.get_value.call
  
  unregister.call
end

test "custom actions work" do
  unregister = Autonomo.register_custom_action("testAction") do |value|
    if value == "fail"
      Autonomo::ActionResult.fail("Intentional failure")
    else
      Autonomo::ActionResult.ok("Got: #{value}")
    end
  end
  
  result = Autonomo::CustomActionsRegistry.instance.execute("testAction", "hello")
  assert result.success, "Should succeed"
  assert result.message.include?("Got: hello")
  
  result = Autonomo::CustomActionsRegistry.instance.execute("testAction", "fail")
  assert !result.success, "Should fail"
  
  unregister.call
end

test "state manager tracks screen" do
  Autonomo::StateManager.instance.set_screen("login")
  assert_equal "login", Autonomo::StateManager.instance.get_screen
  
  st = Autonomo::StateManager.instance.get_state
  assert_equal "login", st.screen
end

test "state manager tracks user" do
  user = Autonomo::UserContext.new(id: "123", email: "test@example.com", role: "admin")
  Autonomo::StateManager.instance.set_user(user)
  
  st = Autonomo::StateManager.instance.get_state
  assert_equal "123", st.user.id
  assert_equal "test@example.com", st.user.email
end

test "state manager tracks errors" do
  Autonomo::StateManager.instance.clear_errors
  Autonomo::StateManager.instance.add_error("Test error")
  
  st = Autonomo::StateManager.instance.get_state
  assert st.errors.include?("Test error")
end

test "commands execute press" do
  pressed = false
  Autonomo.register_tap_handler("Cmd.Button") { pressed = true }
  
  result = Autonomo.execute_command("press", "Cmd.Button")
  assert result.success, "Command should succeed"
  assert pressed, "Button should be pressed"
  
  Autonomo::ElementRegistry.instance.unregister("Cmd.Button")
end

test "commands execute fill" do
  value = ""
  Autonomo.register_fill_handler("Cmd.Input") { |v| value = v }
  
  result = Autonomo.execute_command("fill", "Cmd.Input", "hello")
  assert result.success, "Command should succeed"
  assert_equal "hello", value
  
  Autonomo::ElementRegistry.instance.unregister("Cmd.Input")
end

test "commands return error for missing element" do
  result = Autonomo.execute_command("press", "Nonexistent.Button")
  assert !result.success, "Should fail"
  assert result.error.downcase.include?("not found")
end

puts "\n📊 Results: #{$passed} passed, #{$failed} failed\n"
exit($failed > 0 ? 1 : 0)
