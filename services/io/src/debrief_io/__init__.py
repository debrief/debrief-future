"""Debrief file parsing service.

This package provides file format handlers for parsing legacy Debrief file formats
into validated GeoJSON features conforming to Stage 0 schemas.

Example:
    >>> from debrief_io import parse
    >>> result = parse("/path/to/track.rep")
    >>> print(f"Parsed {len(result.features)} features")
"""

__version__ = "0.1.0"

# Public API exports
from debrief_io.exceptions import ParseError, UnsupportedFormatError, ValidationError

# Register built-in handlers
from debrief_io.handlers.rep import REPHandler
from debrief_io.models import HandlerInfo, ParseResult, ParseWarning
from debrief_io.parser import parse, parse_rep
from debrief_io.registry import (
    get_handler,
    list_handlers,
    register_handler,
    unregister_handler,
)

register_handler(".rep", REPHandler)

__all__ = [
    "__version__",
    # Parser
    "parse",
    "parse_rep",
    # Registry
    "register_handler",
    "unregister_handler",
    "get_handler",
    "list_handlers",
    # Models
    "ParseResult",
    "ParseWarning",
    "HandlerInfo",
    # Exceptions
    "ParseError",
    "UnsupportedFormatError",
    "ValidationError",
]
