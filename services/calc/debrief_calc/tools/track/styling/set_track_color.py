"""Set Track Color tool."""

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
    name="set-track-color",
    description="Sets the display color for track features. Modifies the line color property of each track's style.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/styled",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.style,
    parameters=[
        ToolParameter(
            name="color",
            type="string",
            description="CSS color value to apply",
            required=True,
            param_type="NamedColor",
        ),
    ],
)
def set_track_color(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Set the display color for track features.

    Args:
        context: SelectionContext with one or more track features
        params: Parameters dict with 'color' (required)

    Returns:
        List of modified track features with updated line color
    """
    color = params.get("color")
    if not color:
        raise ValueError("color parameter is required")

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        if props.get("kind") != "TRACK":
            continue

        # Initialize style hierarchy with defaults
        style = props.setdefault("style", {})
        line = style.setdefault(
            "line",
            {
                "stroke": True,
                "color": "#3388ff",
                "weight": 3,
                "opacity": 1.0,
            },
        )
        line["color"] = color

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
