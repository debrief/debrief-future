"""
Track statistics tool.

Calculates statistics for a single track including:
- Number of positions
- Duration
- Total distance
- Average speed
"""

from __future__ import annotations

import math
from typing import Any
import uuid

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool


def _haversine_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the great circle distance between two points in nautical miles.
    """
    # Convert to radians
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Earth radius in nautical miles
    r = 3440.065

    return c * r


def _calculate_track_stats(coordinates: list[list[float]]) -> dict[str, Any]:
    """Calculate statistics from track coordinates."""
    if not coordinates:
        return {
            "point_count": 0,
            "duration_hours": 0,
            "distance_nm": 0,
            "average_speed_kts": 0
        }

    point_count = len(coordinates)

    # Calculate total distance
    total_distance = 0.0
    for i in range(1, len(coordinates)):
        prev = coordinates[i-1]
        curr = coordinates[i]
        # Coordinates are [lon, lat, elevation?, time?]
        total_distance += _haversine_distance(prev[0], prev[1], curr[0], curr[1])

    # Calculate duration if timestamps available (4th element)
    duration_hours = 0.0
    if len(coordinates[0]) >= 4 and len(coordinates[-1]) >= 4:
        start_time = coordinates[0][3]  # timestamp in ms
        end_time = coordinates[-1][3]
        duration_hours = (end_time - start_time) / (1000 * 60 * 60)

    # Calculate average speed
    average_speed = 0.0
    if duration_hours > 0:
        average_speed = total_distance / duration_hours

    return {
        "point_count": point_count,
        "duration_hours": round(duration_hours, 2),
        "distance_nm": round(total_distance, 2),
        "average_speed_kts": round(average_speed, 2)
    }


@tool(
    name="track-stats",
    description="Calculate statistics for a single track including point count, duration, distance, and average speed",
    input_kinds=["track"],
    output_kind="track-statistics",
    context_type=ContextType.SINGLE,
    parameters=[
        ToolParameter(
            name="distance_unit",
            type="enum",
            description="Unit for distance measurements",
            choices=["nm", "km", "mi"],
            default="nm"
        )
    ]
)
def track_stats(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Calculate statistics for a single track.

    Args:
        context: SelectionContext with exactly one track feature
        params: Optional parameters (distance_unit)

    Returns:
        List containing one Feature with track statistics
    """
    feature = context.features[0]
    geometry = feature.get("geometry", {})
    coordinates = geometry.get("coordinates", [])

    stats = _calculate_track_stats(coordinates)

    # Get the track's bounding box for the result geometry
    if coordinates:
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        centroid = [sum(lons) / len(lons), sum(lats) / len(lats)]
    else:
        centroid = [0, 0]

    result_feature = {
        "type": "Feature",
        "id": f"stats-{uuid.uuid4().hex[:8]}",
        "properties": {
            "source_track": feature.get("id", "unknown"),
            "source_name": feature.get("properties", {}).get("name", "unknown"),
            "statistics": stats
        },
        "geometry": {
            "type": "Point",
            "coordinates": centroid
        }
    }

    return [result_feature]
