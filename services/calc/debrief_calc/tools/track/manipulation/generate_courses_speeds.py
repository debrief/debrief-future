"""Generate Courses and Speeds tool — derives course/speed from consecutive track positions."""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

from debrief_calc.models import ContextType, GeoJSONFeatureDict, SelectionContext, ToolCategoryEnum
from debrief_calc.registry import tool

EARTH_RADIUS_NM = 3440.065


def _haversine_distance(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate great-circle distance between two points in nautical miles."""
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return c * EARTH_RADIUS_NM


def _initial_bearing(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate initial bearing from point 1 to point 2 in degrees (0-360)."""
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360


def _parse_timestamp(iso_str: str) -> float:
    """Parse ISO8601 timestamp to seconds since epoch."""
    # Handle 'Z' suffix
    if iso_str.endswith("Z"):
        iso_str = iso_str[:-1] + "+00:00"
    dt = datetime.fromisoformat(iso_str)
    return dt.timestamp()


@tool(
    name="generate-courses-speeds",
    description=(
        "Derives course (bearing in degrees) and speed (knots) from consecutive "
        "track positions using Haversine distance and great-circle bearing formulas. "
        "Writes values into each position's course and speed fields, overriding any "
        "existing values."
    ),
    input_kinds=["TRACK"],
    output_kind="mutation/track/courses_speeds",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.calc,
    parameters=[],
)
def generate_courses_speeds(
    context: SelectionContext, params: dict[str, Any]
) -> list[GeoJSONFeatureDict]:
    """Generate course and speed values for each position in track features.

    Args:
        context: SelectionContext with one or more track features.
        params: Empty dict (no parameters).

    Returns:
        List of modified track features with course/speed populated.
    """
    modified: list[GeoJSONFeatureDict] = []

    for feature in context.features:
        props = feature.get("properties", {})
        if props.get("kind") != "TRACK":
            continue

        coords = feature.get("geometry", {}).get("coordinates", [])
        positions = props.get("positions", [])
        n = len(positions)

        # Single-position track: return unchanged
        if n <= 1:
            modified.append(feature)
            continue

        # Phase 1: compute course and speed for each consecutive pair
        for i in range(n - 1):
            lon1, lat1 = coords[i][0], coords[i][1]
            lon2, lat2 = coords[i + 1][0], coords[i + 1][1]

            distance_nm = _haversine_distance(lon1, lat1, lon2, lat2)
            bearing = _initial_bearing(lon1, lat1, lon2, lat2)

            time1 = _parse_timestamp(positions[i]["time"])
            time2 = _parse_timestamp(positions[i + 1]["time"])
            elapsed_seconds = time2 - time1

            if distance_nm == 0:
                positions[i]["course"] = 0
                positions[i]["speed"] = 0
            elif elapsed_seconds <= 0:
                positions[i]["course"] = round(bearing, 2)
                positions[i]["speed"] = 0
            else:
                elapsed_hours = elapsed_seconds / 3600
                positions[i]["course"] = round(bearing, 2)
                positions[i]["speed"] = round(distance_nm / elapsed_hours, 2)

        # Phase 2: last position carries forward
        positions[n - 1]["course"] = positions[n - 2]["course"]
        positions[n - 1]["speed"] = positions[n - 2]["speed"]

        modified.append(feature)

    if not modified:
        raise ValueError("No track features found in input")

    return modified
