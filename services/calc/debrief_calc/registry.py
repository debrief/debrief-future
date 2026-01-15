"""
Tool registry for debrief-calc.

Provides:
- ToolRegistry: Singleton registry of available analysis tools
- @tool decorator: Convenient way to register tools with metadata

Usage:
    from debrief_calc import registry, tool, ContextType

    @tool(
        name="track-stats",
        description="Calculate track statistics",
        input_kinds=["track"],
        output_kind="analysis-result",
        context_type=ContextType.SINGLE
    )
    def track_stats(context, params):
        # Implementation
        pass

    # Query available tools
    tools = registry.find_tools(context_type=ContextType.SINGLE, kinds={"track"})
"""

from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import TYPE_CHECKING, Any

from debrief_calc.exceptions import ToolNotFoundError
from debrief_calc.models import ContextType, SelectionContext, Tool, ToolParameter

if TYPE_CHECKING:
    pass


class ToolRegistry:
    """
    Singleton registry of available analysis tools.

    Tools are registered either explicitly via register() or
    implicitly via the @tool decorator. The registry supports
    querying by context type and feature kinds.
    """

    def __init__(self):
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """
        Register a tool in the registry.

        Args:
            tool: The Tool instance to register

        Raises:
            ValueError: If a tool with the same name already exists
        """
        if tool.name in self._tools:
            raise ValueError(f"Tool '{tool.name}' is already registered")
        self._tools[tool.name] = tool

    def get_tool(self, name: str) -> Tool:
        """
        Retrieve a tool by name.

        Args:
            name: The tool's unique identifier

        Returns:
            The Tool instance

        Raises:
            ToolNotFoundError: If no tool with the given name exists
        """
        if name not in self._tools:
            raise ToolNotFoundError(name)
        return self._tools[name]

    def find_tools(
        self,
        context_type: ContextType | None = None,
        kinds: set[str] | None = None
    ) -> list[Tool]:
        """
        Find tools matching the given criteria.

        Filters the registry by context type and/or feature kinds.
        If both filters are provided, tools must match both.

        Args:
            context_type: Filter by required context type
            kinds: Filter by accepted input kinds (tool must accept at least one)

        Returns:
            List of matching tools, sorted alphabetically by name
        """
        results = []

        for tool in self._tools.values():
            # Filter by context type if specified
            if context_type is not None and tool.context_type != context_type:
                continue

            # Filter by kinds if specified - tool must accept at least one of the provided kinds
            if kinds is not None and not any(tool.accepts_kind(k) for k in kinds):
                continue

            results.append(tool)

        # Sort alphabetically by name
        return sorted(results, key=lambda t: t.name)

    def find_tools_for_context(self, context: SelectionContext) -> list[Tool]:
        """
        Find tools applicable to a given selection context.

        Convenience method that extracts context type and kinds from
        a SelectionContext object.

        Args:
            context: The user's current selection

        Returns:
            List of applicable tools
        """
        kinds = context.get_kinds() if context.features else None
        return self.find_tools(context_type=context.type, kinds=kinds)

    def list_all(self) -> list[Tool]:
        """
        Return all registered tools.

        Returns:
            List of all tools, sorted alphabetically by name
        """
        return sorted(self._tools.values(), key=lambda t: t.name)

    def describe(self, name: str) -> dict[str, Any]:
        """
        Get complete metadata for a tool.

        Args:
            name: The tool's unique identifier

        Returns:
            Dictionary with complete tool metadata

        Raises:
            ToolNotFoundError: If no tool with the given name exists
        """
        tool = self.get_tool(name)
        return tool.to_metadata()

    def clear(self) -> None:
        """
        Clear all registered tools.

        Primarily for testing purposes.
        """
        self._tools.clear()

    def __len__(self) -> int:
        """Return the number of registered tools."""
        return len(self._tools)

    def __contains__(self, name: str) -> bool:
        """Check if a tool is registered."""
        return name in self._tools


# Global registry instance
registry = ToolRegistry()


def tool(
    name: str,
    description: str,
    input_kinds: list[str],
    output_kind: str,
    context_type: ContextType,
    version: str = "1.0.0",
    parameters: list[ToolParameter] | None = None
) -> Callable:
    """
    Decorator to register a function as a tool.

    The decorated function should accept two arguments:
    - context: SelectionContext with the user's selection
    - params: dict of parameter values

    And return a list of GeoJSON Feature dictionaries.

    Example:
        @tool(
            name="track-stats",
            description="Calculate statistics for a single track",
            input_kinds=["track"],
            output_kind="track-statistics",
            context_type=ContextType.SINGLE
        )
        def track_stats(context: SelectionContext, params: dict) -> list[dict]:
            feature = context.features[0]
            # Calculate stats...
            return [result_feature]

    Args:
        name: Unique identifier (kebab-case)
        description: Human-readable description
        input_kinds: Feature kinds this tool accepts
        output_kind: Kind of features produced
        context_type: Required selection context
        version: Semantic version (default: "1.0.0")
        parameters: Optional list of configurable parameters

    Returns:
        Decorator function that registers the tool
    """
    def decorator(func: Callable) -> Callable:
        # Create the Tool instance
        tool_instance = Tool(
            name=name,
            description=description,
            version=version,
            input_kinds=input_kinds,
            output_kind=output_kind,
            context_type=context_type,
            parameters=parameters or [],
            handler=func
        )

        # Register in the global registry
        registry.register(tool_instance)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        # Attach tool metadata to the wrapper
        wrapper.tool = tool_instance

        return wrapper

    return decorator
