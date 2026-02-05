"""
Test harness for autonomo-python
Run: python -m pytest tests/test_autonomo.py -v
Or:  python tests/test_autonomo.py
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from autonomo.registry import ElementRegistry, register_tap_handler, register_fill_handler
from autonomo.actions import CustomActionsRegistry, register_custom_action, ActionResult
from autonomo.state import StateManager, UserContext
from autonomo.commands import Commands, execute_command

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
ElementRegistry._elements.clear()
CustomActionsRegistry._actions.clear()

@test("registry starts empty")
def _():
    assert len(ElementRegistry.list()) == 0

@test("register_tap_handler adds element")
def _():
    tapped = {"value": False}
    
    def handler():
        tapped["value"] = True
    
    unregister = register_tap_handler("Test.Button", handler)
    
    assert ElementRegistry.has("Test.Button")
    assert "Test.Button" in ElementRegistry.list()
    
    # Invoke handler
    elem = ElementRegistry.get("Test.Button")
    elem["handler"]()
    assert tapped["value"] is True
    
    unregister()
    assert not ElementRegistry.has("Test.Button")

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
    
    elem = ElementRegistry.get("Test.Input")
    elem["handler"]("test value")
    assert value["current"] == "test value"
    assert elem["get_value"]() == "test value"
    
    unregister()

@test("custom actions work")
def _():
    def my_action(value):
        if value == "fail":
            return ActionResult.fail("Intentional failure")
        return ActionResult.ok(f"Got: {value}")
    
    unregister = register_custom_action("testAction", my_action)
    
    result = CustomActionsRegistry.execute("testAction", "hello")
    assert result.success is True
    assert "Got: hello" in result.message
    
    result = CustomActionsRegistry.execute("testAction", "fail")
    assert result.success is False
    
    unregister()

@test("state manager tracks screen")
def _():
    StateManager.set_screen("login")
    assert StateManager.get_screen() == "login"
    
    state = StateManager.get_state()
    assert state["screen"] == "login"

@test("state manager tracks user")
def _():
    user = UserContext(id="123", email="test@example.com", role="admin")
    StateManager.set_user(user)
    
    state = StateManager.get_state()
    assert state["user"]["id"] == "123"
    assert state["user"]["email"] == "test@example.com"

@test("state manager tracks errors")
def _():
    StateManager._errors.clear()
    StateManager.add_error("Test error")
    
    state = StateManager.get_state()
    assert "Test error" in state["errors"]

@test("commands execute press")
def _():
    pressed = {"value": False}
    register_tap_handler("Cmd.Button", lambda: pressed.__setitem__("value", True))
    
    result = execute_command("press", "Cmd.Button")
    assert result.success is True
    assert pressed["value"] is True
    
    ElementRegistry.unregister("Cmd.Button")

@test("commands execute fill")
def _():
    value = {"current": ""}
    register_fill_handler("Cmd.Input", lambda v: value.__setitem__("current", v))
    
    result = execute_command("fill", "Cmd.Input", "hello")
    assert result.success is True
    assert value["current"] == "hello"
    
    ElementRegistry.unregister("Cmd.Input")

@test("commands return error for missing element")
def _():
    result = execute_command("press", "Nonexistent.Button")
    assert result.success is False
    assert "not found" in result.error.lower()

print(f"\n📊 Results: {passed} passed, {failed} failed\n")
sys.exit(1 if failed > 0 else 0)
