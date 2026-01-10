"""Handler registry for file format handlers.

The registry provides a central location for managing file format handlers.
Handlers are registered by file extension and automatically selected
when parsing files.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from debrief_io.models import HandlerInfo

if TYPE_CHECKING:
    from debrief_io.handlers.base import BaseHandler

# Global handler registry
_handlers: dict[str, type[BaseHandler]] = {}


def register_handler(extension: str, handler_class: type[BaseHandler]) -> None:
    """Register a handler for a file extension.

    Args:
        extension: File extension including dot (e.g., ".rep")
        handler_class: Handler class (not instance)

    Raises:
        ValueError: If extension format is invalid

    Example:
        >>> from debrief_io.handlers.rep import REPHandler
        >>> register_handler(".rep", REPHandler)
    """
    if not extension.startswith("."):
        raise ValueError(f"Extension must start with '.': {extension}")

    _handlers[extension.lower()] = handler_class


def get_handler(path: Path | str) -> BaseHandler | None:
    """Get handler instance for a file based on extension.

    Args:
        path: File path to get handler for

    Returns:
        Handler instance if registered, None otherwise
    """
    if isinstance(path, str):
        path = Path(path)

    ext = path.suffix.lower()
    handler_class = _handlers.get(ext)
    return handler_class() if handler_class else None


def list_handlers() -> list[HandlerInfo]:
    """List all registered handlers.

    Returns:
        List of HandlerInfo objects with handler metadata

    Example:
        >>> handlers = list_handlers()
        >>> for h in handlers:
        ...     print(f"{h.extension}: {h.name}")
        .rep: Debrief REP Format
    """
    result = []
    for ext, handler_class in _handlers.items():
        handler = handler_class()
        result.append(
            HandlerInfo(
                extension=ext,
                name=handler.name,
                description=handler.description,
                version=handler.version,
            )
        )
    return result


def unregister_handler(extension: str) -> bool:
    """Remove a registered handler.

    Args:
        extension: Extension to unregister

    Returns:
        True if handler was removed, False if not found
    """
    ext = extension.lower()
    if ext in _handlers:
        del _handlers[ext]
        return True
    return False


def get_supported_extensions() -> list[str]:
    """Get list of supported file extensions.

    Returns:
        List of registered extensions (lowercase, with dots)
    """
    return list(_handlers.keys())


def clear_registry() -> None:
    """Clear all registered handlers.

    Primarily useful for testing.
    """
    _handlers.clear()
