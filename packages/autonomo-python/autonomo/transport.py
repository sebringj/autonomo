"""
Transport - HTTP server for AI communication

Provides a simple HTTP API that the MCP server can call.
This runs inside the application being tested.
"""

from dataclasses import dataclass
from typing import Callable, Optional, Dict, Any
import json
import os
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

from .commands import execute_command
from .state import state


def is_dev_mode() -> bool:
    """
    Check if running in development mode.
    
    Returns True if any of:
    - AUTONOMO_DEV env var is set to 'true' or '1'
    - FLASK_DEBUG or FLASK_ENV=development
    - DJANGO_DEBUG is set
    - DEBUG env var is 'true' or '1'
    """
    # Explicit Autonomo flag
    autonomo_dev = os.environ.get("AUTONOMO_DEV", "").lower()
    if autonomo_dev in ("true", "1"):
        return True
    
    # Flask
    if os.environ.get("FLASK_DEBUG") or os.environ.get("FLASK_ENV") == "development":
        return True
    
    # Django
    if os.environ.get("DJANGO_DEBUG"):
        return True
    
    # Generic DEBUG
    debug = os.environ.get("DEBUG", "").lower()
    if debug in ("true", "1"):
        return True
    
    # If none set, assume development (safer for local testing)
    # Set AUTONOMO_DEV=false explicitly to disable in production
    return os.environ.get("AUTONOMO_DEV", "").lower() != "false"


@dataclass
class TransportConfig:
    """Configuration for the Autonomo transport"""
    port: int = 8080
    host: str = "127.0.0.1"
    cors: bool = True
    dev_only: bool = True
    on_start: Optional[Callable[[str], None]] = None
    on_command: Optional[Callable[[str, Optional[str], Optional[str]], None]] = None


class TransportInstance:
    """Running transport instance"""
    
    def __init__(self, url: str, server: HTTPServer, thread: threading.Thread):
        self.url = url
        self._server = server
        self._thread = thread
    
    def stop(self) -> None:
        """Stop the server"""
        self._server.shutdown()
        self._thread.join()


def handle_request(
    method: str,
    path: str,
    body: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Handle an incoming HTTP request"""
    import time
    
    # Health check
    if method == "GET" and path == "/health":
        return {
            "status": 200,
            "body": {
                "status": "ok",
                "timestamp": int(time.time() * 1000),
            },
        }
    
    # Get current state
    if method == "GET" and path == "/state":
        return {
            "status": 200,
            "body": state.get_state().to_dict(),
        }
    
    # Execute command
    if method == "POST" and path == "/command":
        if body is None:
            return {
                "status": 400,
                "body": {"error": "Missing request body"},
            }
        
        command = body.get("command")
        target = body.get("target")
        value = body.get("value")
        
        if command is None:
            return {
                "status": 400,
                "body": {"error": "Missing command field"},
            }
        
        result = execute_command(command, target, value)
        return {
            "status": 200 if result.success else 400,
            "body": result.to_dict(),
        }
    
    # Not found
    return {
        "status": 404,
        "body": {"error": "Not found"},
    }


def create_http_transport(config: TransportConfig) -> Optional[TransportInstance]:
    """
    Create and start HTTP transport.
    
    Returns None if dev_only=True and not in development mode.
    """
    # Skip in production if dev_only is enabled
    if config.dev_only and not is_dev_mode():
        return None
    
    class RequestHandler(BaseHTTPRequestHandler):
        def _set_cors_headers(self):
            if config.cors:
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
        
        def do_OPTIONS(self):
            self.send_response(200)
            self._set_cors_headers()
            self.end_headers()
        
        def do_GET(self):
            result = handle_request("GET", self.path)
            self.send_response(result["status"])
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result["body"]).encode())
        
        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            body = None
            if content_length > 0:
                body = json.loads(self.rfile.read(content_length).decode())
            
            result = handle_request("POST", self.path, body)
            self.send_response(result["status"])
            self.send_header("Content-Type", "application/json")
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result["body"]).encode())
        
        def log_message(self, format, *args):
            pass  # Suppress logging
    
    server = HTTPServer((config.host, config.port), RequestHandler)
    url = f"http://{config.host}:{config.port}"
    
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    
    if config.on_start:
        config.on_start(url)
    
    return TransportInstance(url, server, thread)
