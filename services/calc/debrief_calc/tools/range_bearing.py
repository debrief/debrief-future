"""
Range and bearing tool.

Calculates range and bearing between two tracks at corresponding time points.
"""

from __future__ import annotations

import math
import uuid
from typing import Any

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
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
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


def _is_temporal(feature: dict[str, Any]) -> bool:
    """Check if a feature has temporal data (times in properties or timestamps in coordinates)."""
    props = feature.get("properties", {}) or {}
    times = props.get("times")
    if isinstance(times, list) and len(times) > 0:
        return True
    # Check for timestamp in coordinates (4th element: [lon, lat, alt, time])
    coords = feature.get("geometry", {}).get("coordinates", [])
    if isinstance(coords, list) and len(coords) > 0:
        first = coords[0]
        if isinstance(first, list) and len(first) >= 4:
            return True
    return False


def _extract_coords(feature: dict[str, Any]) -> list[list[float]]:
    """Extract coordinate list from a feature geometry."""
    geom = feature.get("geometry", {})
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])
    if gtype == "Point":
        return [coords] if coords else []
    if gtype in ("LineString",):
        return coords
    if gtype == "Polygon":
        # Use exterior ring
        return coords[0] if coords else []
    return coords


def _closest_points_between(
    coords_a: list[list[float]], coords_b: list[list[float]]
) -> tuple[list[float], list[float]]:
    """Find the pair of points (one from each set) with minimum distance."""
    best_a, best_b = coords_a[0], coords_b[0]
    best_dist = float("inf")
    for a in coords_a:
        for b in coords_b:
            d = _calculate_range(a[0], a[1], b[0], b[1])
            if d < best_dist:
                best_dist = d
                best_a, best_b = a, b
    return best_a, best_b


@tool(
    name="range-bearing",
    description="Calculate range and bearing between two features (tracks, shapes, or mixed)",
    input_kinds=["track", "shape"],
    output_kind="range-bearing",
    context_type=ContextType.MULTI,
    parameters=[
        ToolParameter(
            name="sample_points",
            type="enum",
            description="Where to calculate range/bearing",
            choices=["endpoints", "midpoint", "all"],
            default="all",
        )
    ],
)
def range_bearing(context: SelectionContext, params: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Calculate range and bearing between two features.

    Supports track-track (temporal sampling at start/mid/end) and
    mixed temporal/non-temporal (closest point, returns midpoint).

    Args:
        context: SelectionContext with exactly two features
        params: Optional parameters (sample_points)

    Returns:
        List containing Features with range/bearing data
    """
    if len(context.features) < 2:
        return []

    feat1 = context.features[0]
    feat2 = context.features[1]

    coords1 = _extract_coords(feat1)
    coords2 = _extract_coords(feat2)

    if not coords1 or not coords2:
        return []

    both_temporal = _is_temporal(feat1) and _is_temporal(feat2)

    # Mixed temporal/non-temporal: return single midpoint between closest points
    if not both_temporal:
        pt1, pt2 = _closest_points_between(coords1, coords2)
        range_nm = _calculate_range(pt1[0], pt1[1], pt2[0], pt2[1])
        bearing = _calculate_bearing(pt1[0], pt1[1], pt2[0], pt2[1])
        mid_lon = (pt1[0] + pt2[0]) / 2
        mid_lat = (pt1[1] + pt2[1]) / 2

        props1 = feat1.get("properties", {}) or {}
        props2 = feat2.get("properties", {}) or {}
        name1 = props1.get("name") or props1.get("label") or props1.get("id", "feature-1")
        name2 = props2.get("name") or props2.get("label") or props2.get("id", "feature-2")

        return [
            {
                "type": "Feature",
                "id": f"rb-closest-{uuid.uuid4().hex[:8]}",
                "properties": {
                    "measurement_type": "closest",
                    "range_nm": round(range_nm, 2),
                    "bearing_deg": round(bearing, 1),
                    "label": f"{round(range_nm, 2)} nm",
                    "from_feature": name1,
                    "to_feature": name2,
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(mid_lon, 6), round(mid_lat, 6)],
                },
            }
        ]

    # Both temporal: sample at start, midpoint, end
    results = []
    sample_points = params.get("sample_points", "all")

    props1 = feat1.get("properties", {}) or {}
    props2 = feat2.get("properties", {}) or {}
    name1 = props1.get("name") or props1.get("id", "track-1")
    name2 = props2.get("name") or props2.get("id", "track-2")

    if sample_points in ("endpoints", "all"):
        start1 = coords1[0]
        start2 = coords2[0]
        range_nm = _calculate_range(start1[0], start1[1], start2[0], start2[1])
        bearing = _calculate_bearing(start1[0], start1[1], start2[0], start2[1])

        results.append(
            {
                "type": "Feature",
                "id": f"rb-start-{uuid.uuid4().hex[:8]}",
                "properties": {
                    "measurement_type": "start",
                    "range_nm": round(range_nm, 2),
                    "bearing_deg": round(bearing, 1),
                    "from_track": name1,
                    "to_track": name2,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[start1[0], start1[1]], [start2[0], start2[1]]],
                },
            }
        )

    if sample_points in ("midpoint", "all"):
        mid_idx1 = len(coords1) // 2
        mid_idx2 = len(coords2) // 2
        mid1 = coords1[mid_idx1]
        mid2 = coords2[mid_idx2]
        range_nm = _calculate_range(mid1[0], mid1[1], mid2[0], mid2[1])
        bearing = _calculate_bearing(mid1[0], mid1[1], mid2[0], mid2[1])

        results.append(
            {
                "type": "Feature",
                "id": f"rb-mid-{uuid.uuid4().hex[:8]}",
                "properties": {
                    "measurement_type": "midpoint",
                    "range_nm": round(range_nm, 2),
                    "bearing_deg": round(bearing, 1),
                    "from_track": name1,
                    "to_track": name2,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[mid1[0], mid1[1]], [mid2[0], mid2[1]]],
                },
            }
        )

    if sample_points in ("endpoints", "all"):
        end1 = coords1[-1]
        end2 = coords2[-1]
        range_nm = _calculate_range(end1[0], end1[1], end2[0], end2[1])
        bearing = _calculate_bearing(end1[0], end1[1], end2[0], end2[1])

        results.append(
            {
                "type": "Feature",
                "id": f"rb-end-{uuid.uuid4().hex[:8]}",
                "properties": {
                    "measurement_type": "end",
                    "range_nm": round(range_nm, 2),
                    "bearing_deg": round(bearing, 1),
                    "from_track": name1,
                    "to_track": name2,
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[end1[0], end1[1]], [end2[0], end2[1]]],
                },
            }
        )

    return results
