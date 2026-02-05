"""
Custom Actions - Fast-path operations for complex interactions

Some operations (like OTP entry) require multiple steps that are
slow and flaky when done individually. Custom actions provide
atomic operations that handle these cases.
"""

from dataclasses import dataclass
from typing import Callable, Optional, Dict, Any, List


@dataclass
class ActionResult:
    """Result of a custom action"""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    data: Optional[Any] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {"success": self.success}
        if self.message is not None:
            result["message"] = self.message
        if self.error is not None:
            result["error"] = self.error
        if self.data is not None:
            result["data"] = self.data
        return result


CustomActionHandler = Callable[[Optional[str]], ActionResult]


class CustomActionsRegistry:
    """Singleton registry for custom actions"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._actions: Dict[str, CustomActionHandler] = {}
            cls._instance._listeners: List[Callable[[], None]] = []
        return cls._instance
    
    def register(self, name: str, handler: CustomActionHandler) -> Callable[[], None]:
        """Register a custom action. Returns unregister function."""
        self._actions[name] = handler
        self._notify_change()
        return lambda: self.unregister(name)
    
    def unregister(self, name: str) -> None:
        """Unregister a custom action"""
        if name in self._actions:
            del self._actions[name]
            self._notify_change()
    
    def execute(self, name: str, value: Optional[str] = None) -> ActionResult:
        """Execute a custom action"""
        handler = self._actions.get(name)
        if handler is None:
            return ActionResult(
                success=False,
                error=f"Unknown custom action: {name}",
            )
        try:
            return handler(value)
        except Exception as err:
            return ActionResult(
                success=False,
                error=str(err),
            )
    
    def has(self, name: str) -> bool:
        """Check if action exists"""
        return name in self._actions
    
    def list(self) -> List[str]:
        """List all action names"""
        return list(self._actions.keys())
    
    def on_change(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Subscribe to changes"""
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)
    
    def _notify_change(self) -> None:
        for listener in self._listeners:
            listener()


# Singleton instance
custom_actions = CustomActionsRegistry()


def register_custom_action(
    name: str,
    handler: CustomActionHandler,
) -> Callable[[], None]:
    """Register a custom action"""
    return custom_actions.register(name, handler)
