"""
Test harness for autonomo-python
Run: python -m pytest tests/test_autonomo.py -v
Or:  python tests/test_autonomo.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from autonomo.registry import registry, register_tap_handler, register_fill_handler
from autonomo.actions import custom_actions, register_custom_action, ActionResult
from autonomo.state import state, UserContext
from autonomo.commands import execute_command

passed = 0
failed = 0

def test(name: str):
    def decorator(fn):
        global passed, failed
        try:
            fn()
            print(f"✅ {name}")
            passed += 1
        except AssertionError as e:
            print(f"❌ {name}")
            print(f"   {e}")
            failed += 1
        except Exception as e:
            print(f"❌ {name}")
            print(f"   {type(e).__name__}: {e}")
            failed += 1
    return decorator

print("\n🧪 autonomo-python Test Harness\n")

# Reset singletons
registry.clear()

@test("registry starts empty")
def _():
    assert len(registry.list()) == 0

@test("register_tap_handler adds element")
def _():
    tapped = {"value": False}
    
    def handler():
        tapped["value"] = True
    
    unregister = register_tap_handler("Test.Button", handler)
    
    assert registry.has("Test.Button")
    assert "Test.Button" in registry.list()
    
    # Invoke handler (takes Optional[str])
    elem = registry.get("Test.Button")
    elem.handler(None)
    assert tapped["value"] is True
    
    unregister()
    assert not registry.has("Test.Button")

@test("register_fill_handler works with value")
def _():
    value = {"current": ""}
    
    def handler(v):
        value["current"] = v
    
    unregister = register_fill_handler(
        "Test.Input",
        handler,
        get_value=lambda: value["current"]
    )
    
    elem = registry.get("Test.Input")
    elem.handler("test value")
    assert value["current"] == "test value"
    assert elem.get_value() == "test value"
    
    unregister()

@test("custom actions work")
def _():
    def my_action(value):
        if value == "fail":
            return ActionResult(success=False, error="Intentional failure")
        return ActionResult(success=True, message=f"Got: {value}")
    
    unregister = register_custom_action("testAction", my_action)
    
    result = custom_actions.execute("testAction", "hello")
    assert result.success is True
    assert "Got: hello" in result.message
    
    result = custom_actions.execute("testAction", "fail")
    assert result.success is False
    
    unregister()

@test("state manager tracks screen")
def _():
    state.set_screen("login")
    assert state.get_screen() == "login"
    
    snapshot = state.get_state()
    assert snapshot.screen == "login"

@test("state manager tracks user")
def _():
    user = UserContext(id="123", email="test@example.com", role="admin")
    state.set_user(user)
    
    snapshot = state.get_state()
    assert snapshot.user.id == "123"
    assert snapshot.user.email == "test@example.com"

@test("state manager tracks errors")
def _():
    state.clear_errors()
    state.add_error("Test error")
    
    snapshot = state.get_state()
    assert "Test error" in snapshot.errors

@test("commands execute press")
def _():
    pressed = {"value": False}
    register_tap_handler("Cmd.Button", lambda: pressed.__setitem__("value", True))
    
    result = execute_command("press", "Cmd.Button")
    assert result.success is True
    assert pressed["value"] is True
    
    registry.unregister("Cmd.Button")

@test("commands execute fill")
def _():
    value = {"current": ""}
    register_fill_handler("Cmd.Input", lambda v: value.__setitem__("current", v))
    
    result = execute_command("fill", "Cmd.Input", "hello")
    assert result.success is True
    assert value["current"] == "hello"
    
    registry.unregister("Cmd.Input")

@test("commands return error for missing element")
def _():
    result = execute_command("press", "Nonexistent.Button")
    assert result.success is False
    assert "not found" in result.error.lower()

@test("custom actions with metadata")
def _():
    from autonomo.actions import CustomActionMeta
    
    meta = CustomActionMeta(
        description="Greets the user",
        args={"name": "Name to greet"},
        example={"name": "World"}
    )
    
    unregister = register_custom_action(
        "greetAction",
        lambda value: ActionResult(success=True, message=f"Hello, {value}!"),
        meta=meta
    )
    
    # Verify action works
    result = custom_actions.execute("greetAction", "World")
    assert result.success is True
    assert "Hello, World!" in result.message
    
    # Verify get_all returns rich info
    all_actions = custom_actions.get_all()
    assert len(all_actions) >= 1
    
    greet_info = next((a for a in all_actions if a.name == "greetAction"), None)
    assert greet_info is not None
    assert greet_info.description == "Greets the user"
    assert greet_info.args == {"name": "Name to greet"}
    assert greet_info.example == {"name": "World"}
    
    unregister()

print(f"\n📊 Results: {passed} passed, {failed} failed\n")
sys.exit(1 if failed > 0 else 0)
