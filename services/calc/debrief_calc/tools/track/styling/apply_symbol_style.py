"""Apply Symbol Style tool."""

from __future__ import annotations

from typing import Any

from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    SelectionContext,
    ToolCategoryEnum,
    ToolParameter,
)
from debrief_calc.registry import tool


@tool(
    name="apply-symbol-style",
    description="Applies a symbol style to position markers on track features.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/styled",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.style,
    parameters=[
        ToolParameter(
            name="symbol",
            type="enum",
            description="Marker shape (default: square)",
            required=False,
            default="square",
            param_type="MarkerSymbol",
        ),
        ToolParameter(
            name="radius",
            type="number",
            description="Marker radius in pixels",
            default=4,
        ),
        ToolParameter(
            name="fill_color",
            type="string",
            description="Fill color for markers (CSS color string)",
        ),
    ],
)
def apply_symbol_style(
    context: SelectionContext, params: dict[str, Any]
) -> list[GeoJSONFeatureDict]:
    """
    Apply a symbol style to position markers on track features.

    Args:
        context: SelectionContext with one or more track features
        params: Parameters dict with 'symbol' (required), 'radius' (optional), 'fill_color' (optional)

    Returns:
        List of modified track features with updated symbol style
    """
    symbol = params.get("symbol") or "square"
    # Validate against schema-defined MarkerSymbol enum
    from debrief_schemas.validation import resolve_enum_values

    valid_symbols = resolve_enum_values("MarkerSymbol") or {
        "circle",
        "square",
        "triangle",
        "diamond",
        "cross",
    }
    if symbol not in valid_symbols:
        raise ValueError(f"symbol must be one of: {', '.join(sorted(valid_symbols))}")

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

        # Update default_position_style so the PositionSymbolsLayer renderer
        # uses the chosen symbol shape.  Only change the shape — do NOT set
        # show_symbol=True, as that would make ALL positions visible instead
        # of respecting the existing interval/override visibility cascade.
        dps = props.setdefault("default_position_style", {})
        dps["symbol"] = symbol

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
