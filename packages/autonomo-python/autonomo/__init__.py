# Autonomo Python - AI-powered application testing

from .registry import (
    ElementType,
    ElementHandler,
    ElementInfo,
    registry,
    register_tap_handler,
    register_fill_handler,
    register_toggle_handler,
)
from .actions import (
    ActionResult,
    custom_actions,
    register_custom_action,
)
from .state import (
    UserContext,
    NetworkRequest,
    AppState,
    state,
)
from .instance import (
    Platform,
    InstanceConfig,
    InstanceInfo,
    instance_manager,
    init_instance,
    get_instance,
    require_instance,
    get_bridge_id,
    reset_instance,
)
from .commands import (
    CommandResult,
    set_navigation_handler,
    navigate,
    press,
    fill,
    submit,
    custom,
    wait,
    get_state,
    execute_command,
)
from .transport import (
    TransportConfig,
    create_http_transport,
    handle_request,
)

__version__ = "0.1.0"
__all__ = [
    # Registry
    "ElementType",
    "ElementHandler",
    "ElementInfo",
    "registry",
    "register_tap_handler",
    "register_fill_handler",
    "register_toggle_handler",
    # Actions
    "ActionResult",
    "custom_actions",
    "register_custom_action",
    # State
    "UserContext",
    "NetworkRequest",
    "AppState",
    "state",
    # Instance
    "Platform",
    "InstanceConfig",
    "InstanceInfo",
    "instance_manager",
    "init_instance",
    "get_instance",
    "require_instance",
    "get_bridge_id",
    "reset_instance",
    # Commands
    "CommandResult",
    "set_navigation_handler",
    "navigate",
    "press",
    "fill",
    "submit",
    "custom",
    "wait",
    "get_state",
    "execute_command",
    # Transport
    "TransportConfig",
    "create_http_transport",
    "handle_request",
]
