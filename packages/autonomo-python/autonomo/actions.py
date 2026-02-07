"""
Custom Actions - Fast-path operations for complex interactions

Some operations (like OTP entry) require multiple steps that are
slow and flaky when done individually. Custom actions provide
atomic operations that handle these cases.
"""

from dataclasses import dataclass, field
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


@dataclass
class CustomActionMeta:
    """Metadata for a custom action - helps AI understand what it does"""
    description: Optional[str] = None
    args: Optional[Dict[str, str]] = None
    example: Optional[Dict[str, str]] = None


@dataclass
class CustomActionInfo:
    """Rich custom action info returned in state"""
    name: str
    description: Optional[str] = None
    args: Optional[Dict[str, str]] = None
    example: Optional[Dict[str, str]] = None

    def to_dict(self) -> Dict[str, Any]:
        result: Dict[str, Any] = {"name": self.name}
        if self.description is not None:
            result["description"] = self.description
        if self.args is not None:
            result["args"] = self.args
        if self.example is not None:
            result["example"] = self.example
        return result


@dataclass
class RegisteredAction:
    """Internal representation of a registered action"""
    handler: Callable[[Optional[str]], ActionResult]
    meta: Optional[CustomActionMeta] = None


CustomActionHandler = Callable[[Optional[str]], ActionResult]


class CustomActionsRegistry:
    """Singleton registry for custom actions"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._actions: Dict[str, RegisteredAction] = {}
            cls._instance._listeners: List[Callable[[], None]] = []
        return cls._instance
    
    def register(
        self, 
        name: str, 
        handler: CustomActionHandler,
        meta: Optional[CustomActionMeta] = None
    ) -> Callable[[], None]:
        """Register a custom action. Returns unregister function."""
        self._actions[name] = RegisteredAction(handler=handler, meta=meta)
        self._notify_change()
        return lambda: self.unregister(name)
    
    def unregister(self, name: str) -> None:
        """Unregister a custom action"""
        if name in self._actions:
            del self._actions[name]
            self._notify_change()
    
    def execute(self, name: str, value: Optional[str] = None) -> ActionResult:
        """Execute a custom action"""
        action = self._actions.get(name)
        if action is None:
            available = ", ".join(self.list()) if self._actions else "none"
            return ActionResult(
                success=False,
                error=f"Unknown custom action: {name}. Available: {available}",
            )
        try:
            return action.handler(value)
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
    
    def get_all(self) -> List[CustomActionInfo]:
        """Get rich info about all actions (for AI discoverability)"""
        result = []
        for name, action in self._actions.items():
            info = CustomActionInfo(
                name=name,
                description=action.meta.description if action.meta else None,
                args=action.meta.args if action.meta else None,
                example=action.meta.example if action.meta else None,
            )
            result.append(info)
        return result
    
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
    meta: Optional[CustomActionMeta] = None,
) -> Callable[[], None]:
    """Register a custom action"""
    return custom_actions.register(name, handler, meta)
