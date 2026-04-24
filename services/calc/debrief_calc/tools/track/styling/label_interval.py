"""Label Interval tool."""

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
    name="label-interval",
    description="Sets the time interval for displaying labels on track positions.",
    input_kinds=["TRACK"],
    output_kind="mutation/track/styled",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.style,
    parameters=[
        ToolParameter(
            name="interval",
            type="string",
            description="ISO 8601 duration (e.g., 'PT15M' for 15 minutes). Defaults to PT15M.",
            required=False,
            param_type="DurationPreset",
        ),
    ],
)
def label_interval(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Set the time interval for displaying labels on track positions.

    Args:
        context: SelectionContext with one or more track features
        params: Parameters dict with 'interval' (ISO 8601 duration, defaults to PT15M)

    Returns:
        List of modified track features with updated label interval
    """
    interval = params.get("interval") or "PT15M"

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        if props.get("kind") != "TRACK":
            continue

        # Store label_interval as a top-level track property so the
        # PositionSymbolsLayer renderer picks it up via props.label_interval.
        # Do NOT set show_label=True on default_position_style — the interval
        # mechanism in resolvePositionStyle() selectively enables labels only
        # at positions that match the interval.
        props["label_interval"] = interval

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
