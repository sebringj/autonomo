"""
Commands - Process control commands from the AI

Handles the standard command set: navigate, press, fill, wait, custom
"""

from dataclasses import dataclass
from typing import Callable, Optional, Dict, Any
import asyncio
import time

from .registry import registry, ElementType
from .actions import custom_actions
from .state import state, AppState


@dataclass
class CommandResult:
    """Result of a command execution"""
    success: bool
    state: AppState
    message: Optional[str] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "success": self.success,
            "state": self.state.to_dict(),
        }
        if self.message is not None:
            result["message"] = self.message
        if self.error is not None:
            result["error"] = self.error
        return result


NavigationHandler = Callable[[str], None]
_navigation_handler: Optional[NavigationHandler] = None


def set_navigation_handler(handler: NavigationHandler) -> None:
    """Set the navigation handler"""
    global _navigation_handler
    _navigation_handler = handler


def navigate(screen: str) -> CommandResult:
    """Navigate to a screen"""
    try:
        if _navigation_handler is None:
            return CommandResult(
                success=False,
                error="No navigation handler registered",
                state=state.get_state(),
            )
        _navigation_handler(screen)
        time.sleep(0.1)
        return CommandResult(
            success=True,
            message=f"Navigated to {screen}",
            state=state.get_state(),
        )
    except Exception as err:
        return CommandResult(
            success=False,
            error=str(err),
            state=state.get_state(),
        )


def press(element_id: str) -> CommandResult:
    """Press/tap an element"""
    handler = registry.get(element_id)
    if handler is None:
        return CommandResult(
            success=False,
            error=f"Element not found: {element_id}. Available: {', '.join(registry.list())}",
            state=state.get_state(),
        )
    if handler.disabled:
        return CommandResult(
            success=False,
            error=f"Element is disabled: {element_id}",
            state=state.get_state(),
        )
    try:
        handler.handler(None)
        time.sleep(0.1)
        return CommandResult(
            success=True,
            message=f"Pressed {element_id}",
            state=state.get_state(),
        )
    except Exception as err:
        return CommandResult(
            success=False,
            error=str(err),
            state=state.get_state(),
        )


def fill(element_id: str, value: str) -> CommandResult:
    """Fill text into an input element"""
    handler = registry.get(element_id)
    if handler is None:
        return CommandResult(
            success=False,
            error=f"Element not found: {element_id}. Available: {', '.join(registry.list())}",
            state=state.get_state(),
        )
    if handler.type != ElementType.INPUT:
        return CommandResult(
            success=False,
            error=f"Element {element_id} is not an input (type: {handler.type.value})",
            state=state.get_state(),
        )
    if handler.disabled:
        return CommandResult(
            success=False,
            error=f"Element is disabled: {element_id}",
            state=state.get_state(),
        )
    try:
        handler.handler(value)
        time.sleep(0.05)
        return CommandResult(
            success=True,
            message=f'Filled {element_id} with "{value}"',
            state=state.get_state(),
        )
    except Exception as err:
        return CommandResult(
            success=False,
            error=str(err),
            state=state.get_state(),
        )


def submit(element_id: str) -> CommandResult:
    """Submit an input (press enter)"""
    handler = registry.get(element_id)
    if handler is None:
        return CommandResult(
            success=False,
            error=f"Element not found: {element_id}",
            state=state.get_state(),
        )
    if handler.on_submit is None:
        return CommandResult(
            success=False,
            error=f"Element {element_id} does not support submit",
            state=state.get_state(),
        )
    try:
        handler.on_submit()
        time.sleep(0.1)
        return CommandResult(
            success=True,
            message=f"Submitted {element_id}",
            state=state.get_state(),
        )
    except Exception as err:
        return CommandResult(
            success=False,
            error=str(err),
            state=state.get_state(),
        )


def custom(action_name: str, value: Optional[str] = None) -> CommandResult:
    """Execute a custom action"""
    result = custom_actions.execute(action_name, value)
    return CommandResult(
        success=result.success,
        message=result.message,
        error=result.error,
        state=state.get_state(),
    )


def wait(ms: int) -> CommandResult:
    """Wait for a duration"""
    time.sleep(ms / 1000)
    return CommandResult(
        success=True,
        message=f"Waited {ms}ms",
        state=state.get_state(),
    )


def get_state() -> CommandResult:
    """Get current state without any action"""
    return CommandResult(
        success=True,
        state=state.get_state(),
    )


def execute_command(
    command: str,
    target: Optional[str] = None,
    value: Optional[str] = None,
) -> CommandResult:
    """Execute a command by type"""
    cmd = command.lower()
    
    if cmd == "navigate":
        if target is None:
            return CommandResult(
                success=False,
                error="Navigate requires a target screen",
                state=state.get_state(),
            )
        return navigate(target)
    
    if cmd in ("press", "tap", "click"):
        if target is None:
            return CommandResult(
                success=False,
                error="Press requires a target element ID",
                state=state.get_state(),
            )
        return press(target)
    
    if cmd in ("fill", "type"):
        if target is None:
            return CommandResult(
                success=False,
                error="Fill requires a target element ID",
                state=state.get_state(),
            )
        return fill(target, value or "")
    
    if cmd == "submit":
        if target is None:
            return CommandResult(
                success=False,
                error="Submit requires a target element ID",
                state=state.get_state(),
            )
        return submit(target)
    
    if cmd == "custom":
        if target is None:
            return CommandResult(
                success=False,
                error="Custom requires an action name",
                state=state.get_state(),
            )
        return custom(target, value)
    
    if cmd == "wait":
        return wait(int(target or "1000"))
    
    if cmd in ("state", "snapshot"):
        return get_state()
    
    return CommandResult(
        success=False,
        error=f"Unknown command: {command}",
        state=state.get_state(),
    )
