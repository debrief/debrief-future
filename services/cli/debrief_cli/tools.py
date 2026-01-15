"""
Tools command group for debrief-cli.

Provides commands for discovering and executing analysis tools.
"""

from __future__ import annotations

import json
import sys
from typing import Any

import click

from debrief_cli.main import Context, pass_context
from debrief_cli.output import format_tool_metadata


@click.group()
def tools():
    """Discover and run analysis tools."""
    pass


@tools.command("list")
@click.option(
    "--input", "input_file", type=click.Path(exists=True), help="Filter by input file kind"
)
@pass_context
def list_tools(ctx: Context, input_file: str | None):
    """
    List available analysis tools.

    Optionally filter by the kind of features in an input file.
    """
    formatter = ctx.get_formatter()

    try:
        # Import here to avoid circular imports and lazy loading
        from debrief_calc import registry

        # Get filter kind from input file if provided
        filter_kinds = None
        if input_file:
            with open(input_file) as f:
                data = json.load(f)
            filter_kinds = _extract_kinds(data)

        # Find matching tools
        tool_list = registry.find_tools(kinds=filter_kinds) if filter_kinds else registry.list_all()

        if ctx.json_mode:
            formatter.json_output(
                {"tools": [t.to_metadata() for t in tool_list], "count": len(tool_list)}
            )
        else:
            if not tool_list:
                formatter.info("No tools found matching criteria.")
            else:
                rows = []
                for tool in tool_list:
                    rows.append(
                        [
                            tool.name,
                            tool.context_type.value,
                            ", ".join(tool.input_kinds),
                            tool.description[:50] + "..."
                            if len(tool.description) > 50
                            else tool.description,
                        ]
                    )
                formatter.table(["Name", "Context", "Input Kinds", "Description"], rows)

        formatter.finish()

    except Exception as e:
        formatter.error(str(e), "LIST_FAILED")
        formatter.finish()
        sys.exit(4)


@tools.command("describe")
@click.argument("tool_name")
@pass_context
def describe_tool(ctx: Context, tool_name: str):
    """
    Show detailed information about a tool.

    TOOL_NAME is the name of the tool to describe.
    """
    formatter = ctx.get_formatter()

    try:
        from debrief_calc import registry

        metadata = registry.describe(tool_name)

        if ctx.json_mode:
            formatter.json_output(metadata)
        else:
            print(format_tool_metadata(metadata, verbose=True))

        formatter.finish()

    except Exception as e:
        formatter.error(str(e), "TOOL_NOT_FOUND")
        formatter.finish()
        sys.exit(4)


@tools.command("run")
@click.argument("tool_name")
@click.option(
    "--input", "input_file", type=click.Path(exists=True), required=True, help="Input GeoJSON file"
)
@click.option(
    "--param",
    "-p",
    "params",
    multiple=True,
    type=(str, str),
    help="Tool parameter as key value pair",
)
@pass_context
def run_tool(ctx: Context, tool_name: str, input_file: str, params: tuple):
    """
    Execute an analysis tool on input data.

    TOOL_NAME is the name of the tool to run.

    Results are output to stdout as GeoJSON.
    """
    formatter = ctx.get_formatter()

    try:
        from debrief_calc import registry, run
        from debrief_calc.models import ContextType, SelectionContext

        # Load input file
        with open(input_file) as f:
            data = json.load(f)

        # Convert to features list
        if data.get("type") == "FeatureCollection":
            features = data["features"]
        elif data.get("type") == "Feature":
            features = [data]
        else:
            formatter.error("Input must be a GeoJSON Feature or FeatureCollection", "INVALID_INPUT")
            formatter.finish()
            sys.exit(2)

        # Get tool to determine context type
        tool = registry.get_tool(tool_name)

        # Build context based on tool requirements
        if tool.context_type == ContextType.SINGLE:
            if len(features) != 1:
                formatter.error(
                    f"Tool '{tool_name}' requires exactly 1 feature, got {len(features)}",
                    "INVALID_CONTEXT",
                )
                formatter.finish()
                sys.exit(2)
            context = SelectionContext(type=ContextType.SINGLE, features=features)
        elif tool.context_type == ContextType.MULTI:
            if len(features) < 2:
                formatter.error(
                    f"Tool '{tool_name}' requires 2+ features, got {len(features)}",
                    "INVALID_CONTEXT",
                )
                formatter.finish()
                sys.exit(2)
            context = SelectionContext(type=ContextType.MULTI, features=features)
        elif tool.context_type == ContextType.REGION:
            # For region context, extract bounds from geometry
            bounds = _extract_bounds(features)
            context = SelectionContext(type=ContextType.REGION, bounds=bounds)
        else:
            context = SelectionContext(type=ContextType.NONE)

        # Convert params to dict
        params_dict = dict(params) if params else {}

        # Execute tool
        result = run(tool_name, context, params_dict)

        if result.success:
            # Output as GeoJSON FeatureCollection
            output = {"type": "FeatureCollection", "features": result.features}
            print(json.dumps(output, indent=2))
        else:
            formatter.error(result.error.message, result.error.code)
            formatter.finish()
            sys.exit(4)

    except Exception as e:
        formatter.error(str(e), "EXECUTION_FAILED")
        formatter.finish()
        sys.exit(4)


def _extract_kinds(data: dict[str, Any]) -> set[str]:
    """Extract unique kinds from GeoJSON data."""
    kinds = set()

    if data.get("type") == "FeatureCollection":
        for feature in data.get("features", []):
            kind = feature.get("properties", {}).get("kind")
            if kind:
                kinds.add(kind)
    elif data.get("type") == "Feature":
        kind = data.get("properties", {}).get("kind")
        if kind:
            kinds.add(kind)

    return kinds


def _extract_bounds(features: list[dict[str, Any]]) -> list[float]:
    """Extract bounding box from features."""
    min_x = float("inf")
    min_y = float("inf")
    max_x = float("-inf")
    max_y = float("-inf")

    for feature in features:
        geom = feature.get("geometry", {})
        coords = _flatten_coordinates(geom.get("coordinates", []))
        for coord in coords:
            if len(coord) >= 2:
                min_x = min(min_x, coord[0])
                min_y = min(min_y, coord[1])
                max_x = max(max_x, coord[0])
                max_y = max(max_y, coord[1])

    if min_x == float("inf"):
        return [-180, -90, 180, 90]  # Default global bounds

    return [min_x, min_y, max_x, max_y]


def _flatten_coordinates(coords: Any) -> list[list[float]]:
    """Recursively flatten nested coordinate arrays."""
    if not coords:
        return []

    if isinstance(coords[0], (int, float)):
        return [coords]

    result = []
    for item in coords:
        result.extend(_flatten_coordinates(item))
    return result
