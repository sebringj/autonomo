"""
State Manager - Tracks and reports application state

Collects state from multiple sources into a unified snapshot
that the AI can use to understand the application.
"""

from dataclasses import dataclass, field
from typing import Callable, Optional, Dict, Any, List
import time

from .registry import registry, ElementInfo
from .actions import custom_actions


@dataclass
class UserContext:
    """User context information"""
    id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result = {}
        if self.id is not None:
            result["id"] = self.id
        if self.email is not None:
            result["email"] = self.email
        if self.role is not None:
            result["role"] = self.role
        result.update(self.extra)
        return result


@dataclass
class NetworkRequest:
    """Network request information"""
    method: str
    url: str
    status: Optional[int] = None
    duration: Optional[int] = None
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "method": self.method,
            "url": self.url,
        }
        if self.status is not None:
            result["status"] = self.status
        if self.duration is not None:
            result["duration"] = self.duration
        if self.error is not None:
            result["error"] = self.error
        return result


@dataclass
class AppState:
    """Complete application state snapshot"""
    screen: str
    timestamp: int
    user: Optional[UserContext]
    elements: List[ElementInfo]
    custom_actions: List[str]
    data: Optional[Dict[str, Any]]
    errors: List[str]
    logs: List[str]
    render_errors: List[str]
    network: Optional[List[NetworkRequest]]

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "screen": self.screen,
            "timestamp": self.timestamp,
            "elements": [e.to_dict() for e in self.elements],
            "customActions": self.custom_actions,
            "errors": self.errors,
            "logs": self.logs,
            "renderErrors": self.render_errors,
        }
        if self.user is not None:
            result["user"] = self.user.to_dict()
        if self.data is not None:
            result["data"] = self.data
        if self.network is not None:
            result["network"] = [n.to_dict() for n in self.network]
        return result


class StateManager:
    """Singleton state manager"""
    
    _instance = None
    
    MAX_ERRORS = 50
    MAX_LOGS = 100
    MAX_NETWORK = 50
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._screen = "unknown"
            cls._instance._user: Optional[UserContext] = None
            cls._instance._data: Dict[str, Any] = {}
            cls._instance._errors: List[str] = []
            cls._instance._logs: List[str] = []
            cls._instance._render_errors: List[str] = []
            cls._instance._network: List[NetworkRequest] = []
            cls._instance._listeners: List[Callable[[AppState], None]] = []
            
            # Forward registry/action changes
            registry.on_change(lambda: cls._instance.notify_change())
            custom_actions.on_change(lambda: cls._instance.notify_change())
        return cls._instance
    
    def set_screen(self, screen: str) -> None:
        """Set current screen/route"""
        self._screen = screen
        self.notify_change()
    
    def get_screen(self) -> str:
        """Get current screen"""
        return self._screen
    
    def set_user(self, user: Optional[UserContext]) -> None:
        """Set user context"""
        self._user = user
        self.notify_change()
    
    def set_data(self, data: Dict[str, Any]) -> None:
        """Set application data"""
        self._data = data
        self.notify_change()
    
    def merge_data(self, data: Dict[str, Any]) -> None:
        """Merge data into existing"""
        self._data.update(data)
        self.notify_change()
    
    def add_error(self, error: str) -> None:
        """Add an error"""
        self._errors.append(error)
        if len(self._errors) > self.MAX_ERRORS:
            self._errors = self._errors[-self.MAX_ERRORS:]
        self.notify_change()
    
    def add_log(self, log: str) -> None:
        """Add a log entry"""
        self._logs.append(log)
        if len(self._logs) > self.MAX_LOGS:
            self._logs = self._logs[-self.MAX_LOGS:]
    
    def add_render_error(self, error: str) -> None:
        """Add a render error"""
        self._render_errors.append(error)
        if len(self._render_errors) > self.MAX_ERRORS:
            self._render_errors = self._render_errors[-self.MAX_ERRORS:]
        self.notify_change()
    
    def add_network_request(self, request: NetworkRequest) -> None:
        """Add a network request"""
        self._network.append(request)
        if len(self._network) > self.MAX_NETWORK:
            self._network = self._network[-self.MAX_NETWORK:]
    
    def clear_errors(self) -> None:
        """Clear errors"""
        self._errors.clear()
        self._render_errors.clear()
        self.notify_change()
    
    def clear_logs(self) -> None:
        """Clear logs"""
        self._logs.clear()
    
    def clear_network(self) -> None:
        """Clear network history"""
        self._network.clear()
    
    def get_state(self) -> AppState:
        """Get current state snapshot"""
        return AppState(
            screen=self._screen,
            timestamp=int(time.time() * 1000),
            user=self._user,
            elements=registry.get_all(),
            custom_actions=custom_actions.list(),
            data=self._data if self._data else None,
            errors=list(self._errors),
            logs=list(self._logs),
            render_errors=list(self._render_errors),
            network=list(self._network) if self._network else None,
        )
    
    def on_change(self, listener: Callable[["AppState"], None]) -> Callable[[], None]:
        """Subscribe to state changes"""
        self._listeners.append(listener)
        return lambda: self._listeners.remove(listener)
    
    def notify_change(self) -> None:
        """Trigger a state update notification"""
        state = self.get_state()
        for listener in self._listeners:
            listener(state)


# Singleton instance
state = StateManager()
