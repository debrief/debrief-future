"""Apply Symbol Style tool."""

from __future__ import annotations

from typing import Any

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool

VALID_SYMBOLS = ("circle", "square", "diamond", "triangle", "cross")

NAMED_COLORS = [
    "red", "blue", "green", "orange", "purple", "brown",
    "pink", "cyan", "yellow", "magenta", "navy", "olive",
]


@tool(
    name="apply-symbol-style",
    description="Applies a symbol style to position markers on track features.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/styled",
    context_type=ContextType.MULTI,
    parameters=[
        ToolParameter(
            name="symbol",
            type="enum",
            description="Marker shape (default: square)",
            required=False,
            choices=list(VALID_SYMBOLS),
            default="square",
        ),
        ToolParameter(
            name="radius",
            type="number",
            description="Marker radius in pixels",
            choices=[1, 2, 3, 4, 5, 6],
            default=4,
        ),
        ToolParameter(
            name="fill_color",
            type="enum",
            description="Fill color for markers",
            choices=NAMED_COLORS,
        ),
    ],
)
def apply_symbol_style(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Apply a symbol style to position markers on track features.

    Args:
        context: SelectionContext with one or more track features
        params: Parameters dict with 'symbol' (required), 'radius' (optional), 'fill_color' (optional)

    Returns:
        List of modified track features with updated symbol style
    """
    symbol = params.get("symbol") or "square"
    if symbol not in VALID_SYMBOLS:
        raise ValueError(f"symbol must be one of: {', '.join(VALID_SYMBOLS)}")

    radius = params.get("radius", 4)
    if radius is not None and radius <= 0:
        raise ValueError("radius must be positive")

    fill_color = params.get("fill_color")

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        if props.get("kind") != "TRACK":
            continue

        style = props.setdefault("style", {})
        point = style.setdefault(
            "point",
            {
                "shape": "circle",
                "radius": 4,
                "fill": True,
                "fill_color": "#3388ff",
                "fill_opacity": 0.8,
                "stroke": True,
                "color": "#ffffff",
                "weight": 1,
                "opacity": 1.0,
            },
        )

        point["shape"] = symbol
        if radius is not None:
            point["radius"] = radius

        if fill_color is not None:
            point["fill_color"] = fill_color
        elif point.get("fill_color") is None:
            # Default to line color if available
            line = style.get("line", {})
            if line.get("color"):
                point["fill_color"] = line["color"]

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
