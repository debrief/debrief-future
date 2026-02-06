"""Symbol Interval tool."""

from __future__ import annotations

from typing import Any

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool


@tool(
    name="symbol-interval",
    description="Sets the time interval for displaying position symbols on track features.",
    input_kinds=["track"],
    output_kind="mutation/track/styled",
    context_type=ContextType.MULTI,
    parameters=[
        ToolParameter(
            name="interval",
            type="string",
            description="ISO 8601 duration (e.g., 'PT5M' for 5 minutes)",
            required=True,
        ),
    ],
)
def symbol_interval(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Set the time interval for displaying position symbols on track features.

    Args:
        context: SelectionContext with one or more track features
        params: Parameters dict with 'interval' (required, ISO 8601 duration)

    Returns:
        List of modified track features with updated symbol interval
    """
    interval = params.get("interval")
    if not interval:
        raise ValueError("interval parameter is required")

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        if props.get("kind") != "TRACK":
            continue

        dps = props.setdefault(
            "default_position_style",
            {
                "show_symbol": True,
                "symbol": "circle",
                "show_label": False,
            },
        )
        dps["show_symbol"] = True
        dps["symbol_interval"] = interval

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
