"""
MCP server for debrief-calc.

Exposes debrief-calc tools via the Model Context Protocol.
This is a thin wrapper that delegates to the pure Python library.

Per Constitution IV.3: Services have zero MCP dependency for domain logic.
"""

from __future__ import annotations

import json
from typing import Any

# MCP SDK import is optional
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    Server = None
    Tool = None
    TextContent = None


# Error codes per contracts/mcp-tools.md
ERROR_TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
ERROR_INVALID_CONTEXT = "INVALID_CONTEXT"
ERROR_KIND_MISMATCH = "KIND_MISMATCH"
ERROR_EXECUTION_FAILED = "EXECUTION_FAILED"


def create_server() -> "Server":
    """
    Create and configure the MCP server with debrief-calc tools.

    Returns:
        Configured MCP Server instance

    Raises:
        ImportError: If MCP SDK is not installed
    """
    if not HAS_MCP:
        raise ImportError("MCP SDK not installed. Install with: pip install mcp")

    server = Server("debrief-calc")

    @server.list_tools()
    async def list_tools() -> list[Tool]:
        """List all available debrief-calc tools."""
        from debrief_calc import registry
        from debrief_calc.tools import track_stats, range_bearing, area_summary  # Register tools

        tools = []
        for tool in registry.list_all():
            tools.append(Tool(
                name=f"calc_{tool.name.replace('-', '_')}",
                description=tool.description,
                inputSchema={
                    "type": "object",
                    "properties": {
                        "features": {
                            "type": "array",
                            "description": "GeoJSON features to analyze",
                            "items": {"type": "object"}
                        },
                        "bounds": {
                            "type": "array",
                            "description": "Geographic bounds [minx, miny, maxx, maxy] for region context",
                            "items": {"type": "number"},
                            "minItems": 4,
                            "maxItems": 4
                        },
                        "params": {
                            "type": "object",
                            "description": "Tool-specific parameters",
                            "additionalProperties": True
                        }
                    }
                }
            ))

        return tools

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a debrief-calc tool via MCP."""
        from debrief_calc import registry, run
        from debrief_calc.models import ContextType, SelectionContext
        from debrief_calc.tools import track_stats, range_bearing, area_summary  # Register tools

        # Convert MCP tool name back to calc tool name
        tool_name = name.replace("calc_", "").replace("_", "-")

        try:
            tool = registry.get_tool(tool_name)
        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": {
                        "code": ERROR_TOOL_NOT_FOUND,
                        "message": str(e)
                    }
                })
            )]

        # Build context from arguments
        features = arguments.get("features", [])
        bounds = arguments.get("bounds")
        params = arguments.get("params", {})

        try:
            if tool.context_type == ContextType.SINGLE:
                if len(features) != 1:
                    raise ValueError(f"Tool requires exactly 1 feature, got {len(features)}")
                context = SelectionContext(type=ContextType.SINGLE, features=features)
            elif tool.context_type == ContextType.MULTI:
                if len(features) < 2:
                    raise ValueError(f"Tool requires 2+ features, got {len(features)}")
                context = SelectionContext(type=ContextType.MULTI, features=features)
            elif tool.context_type == ContextType.REGION:
                if not bounds:
                    raise ValueError("Tool requires bounds for region context")
                context = SelectionContext(type=ContextType.REGION, bounds=bounds)
            else:
                context = SelectionContext(type=ContextType.NONE)

            # Execute tool
            result = run(tool_name, context, params)

            if result.success:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": True,
                        "features": result.features,
                        "duration_ms": result.duration_ms
                    })
                )]
            else:
                return [TextContent(
                    type="text",
                    text=json.dumps({
                        "success": False,
                        "error": {
                            "code": result.error.code,
                            "message": result.error.message,
                            "details": result.error.details
                        }
                    })
                )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=json.dumps({
                    "success": False,
                    "error": {
                        "code": ERROR_EXECUTION_FAILED,
                        "message": str(e)
                    }
                })
            )]

    return server


async def serve():
    """Run the MCP server on stdio."""
    if not HAS_MCP:
        raise ImportError("MCP SDK not installed. Install with: pip install mcp")

    server = create_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )


def main():
    """Entry point for MCP server."""
    import asyncio
    asyncio.run(serve())


if __name__ == "__main__":
    main()
