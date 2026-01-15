"""
debrief-calc: Context-sensitive analysis tools for Debrief maritime tactical analysis.

This package provides:
- Tool registry for discovering available analysis tools
- Tool execution engine with provenance tracking
- Built-in representative tools (track-stats, range-bearing, area-summary)
- MCP wrapper for remote tool access (optional)
"""

from debrief_calc.exceptions import (
    DebriefCalcError,
    ExecutionError,
    InvalidContextError,
    KindMismatchError,
    ToolNotFoundError,
    ValidationError,
)
from debrief_calc.executor import run
from debrief_calc.models import (
    ContextType,
    Provenance,
    SelectionContext,
    SourceRef,
    Tool,
    ToolError,
    ToolParameter,
    ToolResult,
)
from debrief_calc.registry import registry, tool

# Import tools to register them with the registry
from debrief_calc import tools as _tools  # noqa: F401

__version__ = "0.1.0"

__all__ = [
    # Models
    "ContextType",
    "SelectionContext",
    "Tool",
    "ToolParameter",
    "ToolResult",
    "ToolError",
    "Provenance",
    "SourceRef",
    # Exceptions
    "DebriefCalcError",
    "ToolNotFoundError",
    "InvalidContextError",
    "KindMismatchError",
    "ValidationError",
    "ExecutionError",
    # Registry
    "registry",
    "tool",
    # Executor
    "run",
]
