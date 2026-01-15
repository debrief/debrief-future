"""
Area summary tool.

Summarizes features within a geographic region (bounding box or polygon).
"""

from __future__ import annotations

from typing import Any
import uuid

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool


def _point_in_bbox(lon: float, lat: float, bbox: list[float]) -> bool:
    """Check if a point is within a bounding box [minx, miny, maxx, maxy]."""
    minx, miny, maxx, maxy = bbox
    return minx <= lon <= maxx and miny <= lat <= maxy


def _calculate_bbox_area_sq_nm(bbox: list[float]) -> float:
    """
    Calculate approximate area of a bounding box in square nautical miles.
    Uses a simple rectangular approximation.
    """
    import math

    minx, miny, maxx, maxy = bbox

    # Width in degrees
    width_deg = maxx - minx
    # Height in degrees
    height_deg = maxy - miny

    # Average latitude for longitude correction
    avg_lat = (miny + maxy) / 2

    # Convert to nautical miles
    # 1 degree latitude = ~60 nm
    # 1 degree longitude = ~60 nm * cos(latitude)
    height_nm = height_deg * 60
    width_nm = width_deg * 60 * math.cos(math.radians(avg_lat))

    return width_nm * height_nm


@tool(
    name="area-summary",
    description="Summarize the geographic extent and properties of a selected region",
    input_kinds=["zone", "region", "polygon"],
    output_kind="area-statistics",
    context_type=ContextType.REGION,
    parameters=[
        ToolParameter(
            name="include_centroid",
            type="boolean",
            description="Include centroid point in output",
            default=True
        )
    ]
)
def area_summary(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Summarize a geographic region.

    Args:
        context: SelectionContext with bounds [minx, miny, maxx, maxy]
        params: Optional parameters (include_centroid)

    Returns:
        List containing one Feature with area summary statistics
    """
    bounds = context.bounds
    if not bounds or len(bounds) != 4:
        return []

    minx, miny, maxx, maxy = bounds

    # Calculate area
    area_sq_nm = _calculate_bbox_area_sq_nm(bounds)

    # Calculate centroid
    centroid_lon = (minx + maxx) / 2
    centroid_lat = (miny + maxy) / 2

    # Calculate dimensions
    import math
    avg_lat = (miny + maxy) / 2
    width_nm = (maxx - minx) * 60 * math.cos(math.radians(avg_lat))
    height_nm = (maxy - miny) * 60

    result_feature = {
        "type": "Feature",
        "id": f"area-{uuid.uuid4().hex[:8]}",
        "properties": {
            "statistics": {
                "area_sq_nm": round(area_sq_nm, 2),
                "width_nm": round(width_nm, 2),
                "height_nm": round(height_nm, 2),
                "centroid": [round(centroid_lon, 4), round(centroid_lat, 4)]
            },
            "bounds": bounds
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [minx, miny],
                [maxx, miny],
                [maxx, maxy],
                [minx, maxy],
                [minx, miny]
            ]]
        }
    }

    return [result_feature]
