"""
Range and bearing tool.

Calculates range and bearing between two tracks at corresponding time points.
"""

from __future__ import annotations

import math
from typing import Any
import uuid

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool


def _calculate_bearing(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the initial bearing from point 1 to point 2 in degrees.
    """
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)

    bearing = math.atan2(x, y)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360

    return bearing


def _calculate_range(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the great circle distance between two points in nautical miles.
    """
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))

    # Earth radius in nautical miles
    r = 3440.065

    return c * r


def _find_closest_point(target_time: float, coordinates: list[list[float]]) -> list[float]:
    """Find the point in coordinates closest to the target time."""
    if not coordinates:
        return [0, 0, 0, 0]

    # If no timestamps, return first point
    if len(coordinates[0]) < 4:
        return coordinates[0]

    closest = coordinates[0]
    closest_diff = abs(coordinates[0][3] - target_time)

    for coord in coordinates[1:]:
        diff = abs(coord[3] - target_time)
        if diff < closest_diff:
            closest = coord
            closest_diff = diff

    return closest


@tool(
    name="range-bearing",
    description="Calculate range and bearing between two tracks at their start, midpoint, and end",
    input_kinds=["track"],
    output_kind="range-bearing",
    context_type=ContextType.MULTI,
    parameters=[
        ToolParameter(
            name="sample_points",
            type="enum",
            description="Where to calculate range/bearing",
            choices=["endpoints", "midpoint", "all"],
            default="all"
        )
    ]
)
def range_bearing(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Calculate range and bearing between two tracks.

    Args:
        context: SelectionContext with exactly two track features
        params: Optional parameters (sample_points)

    Returns:
        List containing Features with range/bearing data as LineStrings
    """
    if len(context.features) < 2:
        return []

    track1 = context.features[0]
    track2 = context.features[1]

    coords1 = track1.get("geometry", {}).get("coordinates", [])
    coords2 = track2.get("geometry", {}).get("coordinates", [])

    if not coords1 or not coords2:
        return []

    results = []
    sample_points = params.get("sample_points", "all")

    # Calculate at start
    if sample_points in ("endpoints", "all"):
        start1 = coords1[0]
        start2 = coords2[0]
        range_nm = _calculate_range(start1[0], start1[1], start2[0], start2[1])
        bearing = _calculate_bearing(start1[0], start1[1], start2[0], start2[1])

        results.append({
            "type": "Feature",
            "id": f"rb-start-{uuid.uuid4().hex[:8]}",
            "properties": {
                "measurement_type": "start",
                "range_nm": round(range_nm, 2),
                "bearing_deg": round(bearing, 1),
                "from_track": track1.get("id", "track-1"),
                "to_track": track2.get("id", "track-2")
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[start1[0], start1[1]], [start2[0], start2[1]]]
            }
        })

    # Calculate at midpoint
    if sample_points in ("midpoint", "all"):
        mid_idx1 = len(coords1) // 2
        mid_idx2 = len(coords2) // 2
        mid1 = coords1[mid_idx1]
        mid2 = coords2[mid_idx2]
        range_nm = _calculate_range(mid1[0], mid1[1], mid2[0], mid2[1])
        bearing = _calculate_bearing(mid1[0], mid1[1], mid2[0], mid2[1])

        results.append({
            "type": "Feature",
            "id": f"rb-mid-{uuid.uuid4().hex[:8]}",
            "properties": {
                "measurement_type": "midpoint",
                "range_nm": round(range_nm, 2),
                "bearing_deg": round(bearing, 1),
                "from_track": track1.get("id", "track-1"),
                "to_track": track2.get("id", "track-2")
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[mid1[0], mid1[1]], [mid2[0], mid2[1]]]
            }
        })

    # Calculate at end
    if sample_points in ("endpoints", "all"):
        end1 = coords1[-1]
        end2 = coords2[-1]
        range_nm = _calculate_range(end1[0], end1[1], end2[0], end2[1])
        bearing = _calculate_bearing(end1[0], end1[1], end2[0], end2[1])

        results.append({
            "type": "Feature",
            "id": f"rb-end-{uuid.uuid4().hex[:8]}",
            "properties": {
                "measurement_type": "end",
                "range_nm": round(range_nm, 2),
                "bearing_deg": round(bearing, 1),
                "from_track": track1.get("id", "track-1"),
                "to_track": track2.get("id", "track-2")
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[end1[0], end1[1]], [end2[0], end2[1]]]
            }
        })

    return results
