"""
MCP server for debrief-calc.

Exposes debrief-calc tools via the Model Context Protocol.
This is a thin wrapper that delegates to the pure Python library.

Per Constitution IV.3: Services have zero MCP dependency for domain logic.
"""

from __future__ import annotations

import json

# MCP SDK import is optional
try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import TextContent, Tool

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


def create_server() -> Server:
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
        """List all available debrief-calc tools with Debrief annotations."""
        from debrief_calc import registry

        tools = []
        for tool in registry.list_all():
            # Get MCP definition with Debrief annotations from tool model
            mcp_def = tool.to_mcp_tool()

            # Add bounds to inputSchema for region context tools
            input_schema = mcp_def["inputSchema"]
            if "bounds" not in input_schema["properties"]:
                input_schema["properties"]["bounds"] = {
                    "type": "array",
                    "description": "Geographic bounds [minx, miny, maxx, maxy] for region context",
                    "items": {"type": "number"},
                    "minItems": 4,
                    "maxItems": 4,
                }

            # Create MCP Tool with annotations
            # Note: MCP SDK Tool class may or may not support annotations parameter
            # If it doesn't, this will raise TypeError and we'll need to use a fallback
            try:
                mcp_tool = Tool(
                    name=f"calc_{tool.name.replace('-', '_')}",
                    description=mcp_def["description"],
                    inputSchema=input_schema,
                    annotations=mcp_def["annotations"],
                )
            except TypeError:
                # Fallback: MCP SDK Tool doesn't support annotations parameter
                # Embed annotations in inputSchema as a non-schema property
                input_schema["debrief:annotations"] = mcp_def["annotations"]
                mcp_tool = Tool(
                    name=f"calc_{tool.name.replace('-', '_')}",
                    description=mcp_def["description"],
                    inputSchema=input_schema,
                )

            tools.append(mcp_tool)

        return tools

    @server.call_tool()
    async def call_tool(name: str, arguments: dict) -> list[TextContent]:
        """Execute a debrief-calc tool via MCP."""
        from debrief_calc import registry as reg
        from debrief_calc import run
        from debrief_calc.models import ContextType, SelectionContext
        from debrief_calc.result_builder import (
            build_addition,
            build_artifact,
            build_error,
            build_mutation,
            build_response,
        )

        # Convert MCP tool name back to calc tool name
        tool_name = name.replace("calc_", "").replace("_", "-")

        try:
            tool = reg.get_tool(tool_name)
        except Exception as e:
            error = build_error(
                message=str(e),
                category="resource_not_found",
                affected_feature_ids=[],
            )
            return [
                TextContent(
                    type="text",
                    text=json.dumps({"error": error}),
                )
            ]

        # Build context from arguments
        features = arguments.get("features", [])
        bounds = arguments.get("bounds")
        params = arguments.get("params", {})

        # Extract source IDs
        source_ids = []
        for f in features:
            props = f.get("properties", {}) or {}
            fid = f.get("id") or props.get("id")
            if fid:
                source_ids.append(str(fid))

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
                # Check if output is a dataset artifact (domain/specific pattern starting with dataset/)
                if tool.output_kind.startswith("dataset/"):
                    import json as _json

                    series_data = result.features[0] if result.features else {}
                    data_bytes = _json.dumps(series_data, indent=2).encode("utf-8")
                    # Extract specific type for filename (e.g., "range_bearing_series" from "dataset/range_bearing_series")
                    specific_type = tool.output_kind.split("/")[-1]
                    href = f"{specific_type}-{'-'.join(source_ids[:2])}.json"
                    content_item = build_artifact(
                        data=data_bytes,
                        mime_type="application/json",
                        result_subtype=tool.output_kind,
                        source_feature_ids=source_ids,
                        label=f"{tool_name} results",
                        href=href,
                    )
                    response = build_response([content_item])
                elif tool.output_kind.startswith("mutation/"):
                    # Mutation tools: strip "mutation/" prefix for subtype
                    subtype = tool.output_kind[len("mutation/") :]
                    content_items = build_mutation(
                        features=result.features or [],
                        result_subtype=subtype,
                        source_feature_ids=source_ids,
                        label=f"{tool_name} results",
                    )
                    response = build_response(content_items)
                else:
                    content_items = build_addition(
                        features=result.features or [],
                        result_subtype=tool.output_kind,
                        source_feature_ids=source_ids,
                        label=f"{tool_name} results",
                    )
                    response = build_response(content_items)
                response["duration_ms"] = result.duration_ms
                return [
                    TextContent(
                        type="text",
                        text=json.dumps(response),
                    )
                ]
            else:
                error = build_error(
                    message=result.error.message if result.error else "Unknown error",
                    category="invalid_input",
                    affected_feature_ids=source_ids,
                )
                return [
                    TextContent(
                        type="text",
                        text=json.dumps({"error": error, "duration_ms": result.duration_ms}),
                    )
                ]

        except Exception as e:
            error = build_error(
                message=str(e),
                category="algorithm_failure",
                affected_feature_ids=source_ids,
            )
            return [
                TextContent(
                    type="text",
                    text=json.dumps({"error": error}),
                )
            ]

    return server


async def serve():
    """Run the MCP server on stdio."""
    if not HAS_MCP:
        raise ImportError("MCP SDK not installed. Install with: pip install mcp")

    server = create_server()
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


def main():
    """Entry point for MCP server."""
    import asyncio

    asyncio.run(serve())


if __name__ == "__main__":
    main()
