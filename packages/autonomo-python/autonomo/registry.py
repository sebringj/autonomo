"""
Element Registry - Tracks interactive elements for AI control

Components register themselves when mounted, unregister when unmounted.
This provides a live map of what the AI can interact with.
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Optional, Dict, Any, List
import re


class ElementType(Enum):
    BUTTON = "button"
    INPUT = "input"
    TOGGLE = "toggle"
    SELECT = "select"
    LINK = "link"
    CUSTOM = "custom"


@dataclass
class ElementHandler:
    """Handler for an interactive element"""
    type: ElementType
    handler: Callable[[Optional[str]], None]
    disabled: bool = False
    get_value: Optional[Callable[[], str]] = None
    on_submit: Optional[Callable[[], None]] = None
    hint: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


@dataclass
class ElementInfo:
    """Information about a registered element"""
    id: str
    type: ElementType
    disabled: bool = False
    value: Optional[str] = None
    hint: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "id": self.id,
            "type": self.type.value,
        }
        if self.disabled:
            result["disabled"] = self.disabled
        if self.value is not None:
            result["value"] = self.value
        if self.hint is not None:
            result["hint"] = self.hint
        if self.meta is not None:
            result["meta"] = self.meta
        return result


class ElementRegistry:
    """Singleton registry for all interactive elements"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._elements: Dict[str, ElementHandler] = {}
            cls._instance._listeners: List[Callable[[], None]] = []
        return cls._instance
    
    def register(self, id: str, handler: ElementHandler) -> Callable[[], None]:
        """Register an interactive element. Returns unregister function."""
        self._elements[id] = handler
        self._notify_change()
        return lambda: self.unregister(id)
    
    def unregister(self, id: str) -> None:
        """Unregister an element"""
        if id in self._elements:
            del self._elements[id]
            self._notify_change()
    
    def get(self, id: str) -> Optional[ElementHandler]:
        """Get handler for an element"""
        return self._elements.get(id)
    
    def has(self, id: str) -> bool:
        """Check if element exists"""
        return id in self._elements
    
    def list(self) -> List[str]:
        """List all element IDs"""
        return list(self._elements.keys())
    
    def get_all(self) -> List[ElementInfo]:
        """Get detailed info for all elements"""
        result = []
        for id, handler in self._elements.items():
            value = handler.get_value() if handler.get_value else None
            result.append(ElementInfo(
                id=id,
                type=handler.type,
                disabled=handler.disabled,
                value=value,
                hint=handler.hint,
                meta=handler.meta,
            ))
        return result
    
    def find(self, pattern: str) -> List[ElementInfo]:
        """Find elements matching a regex pattern"""
        regex = re.compile(pattern)
        return [el for el in self.get_all() if regex.search(el.id)]
    
    def clear(self) -> None:
        """Clear all elements"""
        self._elements.clear()
        self._notify_change()
    
    @property
    def size(self) -> int:
        """Get count of registered elements"""
        return len(self._elements)
    
    def on_change(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Subscribe to registry changes"""
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)
    
    def _notify_change(self) -> None:
        for listener in self._listeners:
            listener()


# Singleton instance
registry = ElementRegistry()


def register_tap_handler(
    id: str,
    handler: Callable[[], None],
    *,
    disabled: bool = False,
    hint: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Callable[[], None]:
    """Register a tap handler for a component"""
    return registry.register(id, ElementHandler(
        type=ElementType.BUTTON,
        handler=lambda _: handler(),
        disabled=disabled,
        hint=hint,
        meta=meta,
    ))


def register_fill_handler(
    id: str,
    handler: Callable[[str], None],
    *,
    get_value: Optional[Callable[[], str]] = None,
    on_submit: Optional[Callable[[], None]] = None,
    disabled: bool = False,
    hint: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Callable[[], None]:
    """Register a fill handler for an input"""
    return registry.register(id, ElementHandler(
        type=ElementType.INPUT,
        handler=lambda v: handler(v or ""),
        get_value=get_value,
        on_submit=on_submit,
        disabled=disabled,
        hint=hint,
        meta=meta,
    ))


def register_toggle_handler(
    id: str,
    handler: Callable[[Optional[str]], None],
    *,
    get_value: Optional[Callable[[], str]] = None,
    disabled: bool = False,
    hint: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Callable[[], None]:
    """Register a toggle handler for a switch/checkbox"""
    return registry.register(id, ElementHandler(
        type=ElementType.TOGGLE,
        handler=handler,
        get_value=get_value,
        disabled=disabled,
        hint=hint,
        meta=meta,
    ))
