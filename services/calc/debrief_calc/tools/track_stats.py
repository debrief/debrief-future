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
import uuid
from typing import Any

from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    SelectionContext,
    ToolCategoryEnum,
    ToolParameter,
)
from debrief_calc.registry import tool
from debrief_schemas import OutputKindEnum


def _haversine_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """
    Calculate the great circle distance between two points in nautical miles.
    """
    # Convert to radians
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))

    # Earth radius in nautical miles
    r = 3440.065

    return c * r


# Conversion factors from nautical miles
_NM_TO_KM = 1.852
_NM_TO_MI = 1.15078


def _convert_distance(distance_nm: float, unit: str) -> float:
    """Convert a distance from nautical miles to the requested unit."""
    if unit == "km":
        return distance_nm * _NM_TO_KM
    if unit == "mi":
        return distance_nm * _NM_TO_MI
    return distance_nm  # "nm" or default


def _convert_speed(speed_kts: float, unit: str) -> float:
    """Convert a speed from knots (nm/h) to the requested unit's per-hour equivalent."""
    if unit == "km":
        return speed_kts * _NM_TO_KM
    if unit == "mi":
        return speed_kts * _NM_TO_MI
    return speed_kts  # knots


def _speed_label(unit: str) -> str:
    """Return the speed unit label for the given distance unit."""
    if unit == "km":
        return "km/h"
    if unit == "mi":
        return "mph"
    return "kts"


def _distance_key(unit: str) -> str:
    """Return the statistics key for distance in the given unit."""
    return f"distance_{unit}"


def _speed_key(unit: str) -> str:
    """Return the statistics key for speed in the given unit."""
    labels = {"nm": "kts", "km": "kmh", "mi": "mph"}
    return f"average_speed_{labels.get(unit, 'kts')}"


def _calculate_track_stats(
    coordinates: list[list[float]], distance_unit: str = "nm"
) -> dict[str, Any]:
    """Calculate statistics from track coordinates."""
    if not coordinates:
        return {
            "point_count": 0,
            "duration_hours": 0,
            _distance_key(distance_unit): 0,
            _speed_key(distance_unit): 0,
        }

    point_count = len(coordinates)

    # Calculate total distance in nautical miles
    total_distance_nm = 0.0
    for i in range(1, len(coordinates)):
        prev = coordinates[i - 1]
        curr = coordinates[i]
        # Coordinates are [lon, lat, elevation?, time?]
        total_distance_nm += _haversine_distance(prev[0], prev[1], curr[0], curr[1])

    # Calculate duration if timestamps available (4th element)
    duration_hours = 0.0
    if len(coordinates[0]) >= 4 and len(coordinates[-1]) >= 4:
        start_time = coordinates[0][3]  # timestamp in ms
        end_time = coordinates[-1][3]
        duration_hours = (end_time - start_time) / (1000 * 60 * 60)

    # Calculate average speed in nm/h (knots)
    average_speed_kts = 0.0
    if duration_hours > 0:
        average_speed_kts = total_distance_nm / duration_hours

    # Convert to requested unit
    distance = _convert_distance(total_distance_nm, distance_unit)
    speed = _convert_speed(average_speed_kts, distance_unit)

    return {
        "point_count": point_count,
        "duration_hours": round(duration_hours, 2),
        _distance_key(distance_unit): round(distance, 2),
        _speed_key(distance_unit): round(speed, 2),
    }


@tool(
    name="track-stats",
    description="Calculate statistics for a single track including point count, duration, distance, and average speed",
    input_kinds=["TRACK"],
    output_kind=OutputKindEnum.trackSOLIDUSstatistics,
    context_type=ContextType.SINGLE,
    category=ToolCategoryEnum.calc,
    parameters=[
        ToolParameter(
            name="distance_unit",
            type="enum",
            description="Unit for distance measurements",
            choices=["nm", "km", "mi"],
            default="nm",
        )
    ],
)
def track_stats(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Calculate statistics for a single track.

    Args:
        context: SelectionContext with exactly one track feature (TRACK kind)
        params: Optional parameters (distance_unit)

    Returns:
        List containing one Feature with track statistics
    """
    distance_unit = params.get("distance_unit", "nm")
    if distance_unit not in ("nm", "km", "mi"):
        raise ValueError(f"distance_unit must be one of: nm, km, mi (got '{distance_unit}')")

    feature: GeoJSONFeatureDict = context.features[0]
    geometry: dict[str, Any] = feature.get("geometry", {})
    coordinates: list[list[float]] = geometry.get("coordinates", [])

    stats = _calculate_track_stats(coordinates, distance_unit)

    # Get the track's bounding box for the result geometry
    if coordinates:
        lons = [c[0] for c in coordinates]
        lats = [c[1] for c in coordinates]
        centroid = [sum(lons) / len(lons), sum(lats) / len(lats)]
    else:
        centroid = [0, 0]

    result_feature: GeoJSONFeatureDict = {
        "type": "Feature",
        "id": f"stats-{uuid.uuid4().hex[:8]}",
        "properties": {
            "source_track": feature.get("id", "unknown"),
            "source_name": feature.get("properties", {}).get("name", "unknown"),
            "statistics": stats,
        },
        "geometry": {"type": "Point", "coordinates": centroid},
    }

    return [result_feature]
