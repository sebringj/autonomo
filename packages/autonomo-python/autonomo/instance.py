"""
Instance - Unique identity for this app instance

Each window/tab/simulator gets a unique instance ID that persists
for the lifetime of that instance. This allows the MCP server to
distinguish between multiple instances of the same app.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Literal
import time
import uuid


Platform = Literal["web", "mobile", "desktop"]


@dataclass
class InstanceConfig:
    """Configuration for initializing an app instance"""
    name: str
    platform: Platform
    instance_id: Optional[str] = None
    version: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None


@dataclass
class InstanceInfo:
    """Information about this app instance"""
    instance_id: str
    name: str
    bridge_id: str
    platform: Platform
    version: Optional[str] = None
    created_at: int = field(default_factory=lambda: int(time.time() * 1000))
    meta: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "instanceId": self.instance_id,
            "name": self.name,
            "bridgeId": self.bridge_id,
            "platform": self.platform,
            "createdAt": self.created_at,
        }
        if self.version is not None:
            result["version"] = self.version
        if self.meta is not None:
            result["meta"] = self.meta
        return result


class InstanceManager:
    """Singleton instance manager"""
    
    _instance: Optional["InstanceManager"] = None
    _current: Optional[InstanceInfo] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @staticmethod
    def _generate_instance_id() -> str:
        """Generate a short unique ID"""
        return uuid.uuid4().hex[:8]
    
    def init_instance(self, config: InstanceConfig) -> InstanceInfo:
        """
        Initialize this app instance.
        
        Call once at app startup. Each process gets a unique instance ID.
        
        Example:
            instance_manager.init_instance(InstanceConfig(
                name="my-app",
                platform="web"
            ))
        """
        instance_id = config.instance_id or self._generate_instance_id()
        self._current = InstanceInfo(
            instance_id=instance_id,
            name=config.name,
            bridge_id=f"{config.name}-{instance_id}",
            platform=config.platform,
            version=config.version,
            meta=config.meta,
        )
        print(f"[Autonomo] Instance initialized: {self._current.bridge_id}")
        return self._current
    
    def get_instance(self) -> Optional[InstanceInfo]:
        """Get the current instance info"""
        return self._current
    
    def require_instance(self) -> InstanceInfo:
        """Get the current instance info or raise"""
        if self._current is None:
            raise RuntimeError("Autonomo instance not initialized. Call init_instance() first.")
        return self._current
    
    def get_bridge_id(self) -> Optional[str]:
        """Get just the bridge ID"""
        return self._current.bridge_id if self._current else None
    
    def reset_instance(self) -> None:
        """Reset the instance (mainly for testing)"""
        self._current = None


# Global instance manager singleton
instance_manager = InstanceManager()


# Convenience functions
def init_instance(config: InstanceConfig) -> InstanceInfo:
    """Initialize this app instance"""
    return instance_manager.init_instance(config)


def get_instance() -> Optional[InstanceInfo]:
    """Get the current instance info"""
    return instance_manager.get_instance()


def require_instance() -> InstanceInfo:
    """Get the current instance info or raise"""
    return instance_manager.require_instance()


def get_bridge_id() -> Optional[str]:
    """Get just the bridge ID"""
    return instance_manager.get_bridge_id()


def reset_instance() -> None:
    """Reset the instance (mainly for testing)"""
    instance_manager.reset_instance()
