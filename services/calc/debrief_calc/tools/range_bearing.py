"""
Range and bearing tool.

Calculates range and bearing time-series between two features.
"""

from __future__ import annotations

import math
import uuid
from typing import Any

from debrief_calc.models import ContextType, GeoJSONFeatureDict, SelectionContext, ToolCategoryEnum
from debrief_calc.registry import tool
from debrief_schemas import OutputKindEnum


def _calculate_bearing(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate initial bearing from point 1 to point 2 in degrees."""
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    x = math.sin(dlon) * math.cos(lat2)
    y = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    bearing = math.degrees(math.atan2(x, y))
    return (bearing + 360) % 360


def _calculate_range(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Calculate great circle distance between two points in nautical miles."""
    lon1, lat1, lon2, lat2 = map(math.radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return c * 3440.065  # Earth radius in nm


def _extract_coords(feature: GeoJSONFeatureDict) -> list[list[float]]:
    """Extract coordinate list from a feature geometry."""
    geom = feature.get("geometry", {})
    gtype = geom.get("type", "")
    coords = geom.get("coordinates", [])
    if gtype == "Point":
        return [coords] if coords else []
    if gtype == "LineString":
        return coords
    if gtype == "Polygon":
        return coords[0] if coords else []
    return coords


def _extract_times(feature: GeoJSONFeatureDict) -> list[str] | None:
    """Extract ISO 8601 timestamps from properties.positions[].time."""
    props = feature.get("properties", {}) or {}
    positions = props.get("positions")
    if isinstance(positions, list) and len(positions) > 0:
        return [p["time"] for p in positions if isinstance(p, dict) and "time" in p]
    return None


def _is_track(feature: GeoJSONFeatureDict) -> bool:
    """Check if feature is a track (LineString with positions)."""
    geom = feature.get("geometry", {})
    return geom.get("type") == "LineString" and _extract_times(feature) is not None


def _is_point(feature: GeoJSONFeatureDict) -> bool:
    geom = feature.get("geometry", {})
    return geom.get("type") == "Point"


def _is_polygon(feature: GeoJSONFeatureDict) -> bool:
    geom = feature.get("geometry", {})
    return geom.get("type") == "Polygon"


def _closest_point_on_segment(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> tuple[float, float]:
    """Project point (px,py) onto segment (ax,ay)-(bx,by), clamped."""
    dx = bx - ax
    dy = by - ay
    len_sq = dx * dx + dy * dy
    if len_sq == 0:
        return ax, ay
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / len_sq))
    return ax + t * dx, ay + t * dy


def _closest_point_on_polygon(
    lon: float, lat: float, ring_coords: list[list[float]]
) -> tuple[float, float]:
    """Find closest point on polygon exterior ring to (lon, lat)."""
    best_dist = float("inf")
    best_pt = (ring_coords[0][0], ring_coords[0][1])
    for i in range(len(ring_coords) - 1):
        ax, ay = ring_coords[i][0], ring_coords[i][1]
        bx, by = ring_coords[i + 1][0], ring_coords[i + 1][1]
        cx, cy = _closest_point_on_segment(lon, lat, ax, ay, bx, by)
        d = (cx - lon) ** 2 + (cy - lat) ** 2
        if d < best_dist:
            best_dist = d
            best_pt = (cx, cy)
    return best_pt


def _feature_name(feature: GeoJSONFeatureDict, fallback: str) -> str:
    props = feature.get("properties", {}) or {}
    return props.get("name") or props.get("label") or props.get("id", fallback)


@tool(
    name="range-bearing",
    description="Calculate range and bearing time-series between two features (tracks, points, polygons)",
    input_kinds=["TRACK", "SHAPE"],
    output_kind=OutputKindEnum.datasetSOLIDUSrange_bearing_series,
    context_type=ContextType.MULTI,
    parameters=[],
    category=ToolCategoryEnum.calc,
)
def range_bearing(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Calculate range and bearing time-series between two features.

    Returns list of dicts: [{time, range_nm, bearing_deg}, ...]
    Packed into a single wrapper dict with metadata for the result builder.
    """
    if len(context.features) < 2:
        return []

    feat1 = context.features[0]
    feat2 = context.features[1]

    coords1 = _extract_coords(feat1)
    coords2 = _extract_coords(feat2)

    if not coords1 or not coords2:
        return []

    name1 = _feature_name(feat1, "feature-1")
    name2 = _feature_name(feat2, "feature-2")

    series: list[dict[str, Any]] = []

    # Determine feature types
    track1 = _is_track(feat1)
    track2 = _is_track(feat2)

    if track1 and track2:
        # Track + Track: zip by index
        times1 = _extract_times(feat1) or []
        times2 = _extract_times(feat2) or []
        n = min(len(times1), len(coords1), len(times2), len(coords2))
        for i in range(n):
            c1, c2 = coords1[i], coords2[i]
            series.append(
                {
                    "time": times1[i],
                    "range_nm": round(_calculate_range(c1[0], c1[1], c2[0], c2[1]), 2),
                    "bearing_deg": round(_calculate_bearing(c1[0], c1[1], c2[0], c2[1]), 1),
                }
            )

    elif track1 or track2:
        # One track, one fixed feature
        track_feat = feat1 if track1 else feat2
        other_feat = feat2 if track1 else feat1
        track_coords = _extract_coords(track_feat)
        track_times = _extract_times(track_feat) or []
        other_coords = _extract_coords(other_feat)

        is_poly = _is_polygon(other_feat)

        n = min(len(track_times), len(track_coords))
        for i in range(n):
            tc = track_coords[i]
            if is_poly:
                ox, oy = _closest_point_on_polygon(tc[0], tc[1], other_coords)
            else:
                # Point: use first coord
                ox, oy = other_coords[0][0], other_coords[0][1]

            # Direction: always from feat1 to feat2
            if track1:
                r = _calculate_range(tc[0], tc[1], ox, oy)
                b = _calculate_bearing(tc[0], tc[1], ox, oy)
            else:
                r = _calculate_range(ox, oy, tc[0], tc[1])
                b = _calculate_bearing(ox, oy, tc[0], tc[1])

            series.append(
                {
                    "time": track_times[i],
                    "range_nm": round(r, 2),
                    "bearing_deg": round(b, 1),
                }
            )

    if not series:
        return []

    # Build DatasetEnvelope series matching TS format
    series_name = f"{name1} → {name2}"
    range_data = [{"time": e["time"], "value": e["range_nm"]} for e in series]
    bearing_data = [{"time": e["time"], "value": e["bearing_deg"]} for e in series]

    range_dataset = {
        "type": "range_bearing_series",
        "title": f"Range: {name1} → {name2}",
        "metadata": {
            "xAxis": {"label": "Time", "type": "temporal"},
            "yAxis": {"label": "Range", "type": "quantitative", "units": "nm"},
        },
        "series": [{"name": series_name, "data": range_data}],
    }
    bearing_dataset = {
        "type": "range_bearing_series",
        "title": f"Bearing: {name1} → {name2}",
        "metadata": {
            "xAxis": {"label": "Time", "type": "temporal"},
            "yAxis": {"label": "Bearing", "type": "quantitative", "units": "°"},
        },
        "series": [{"name": series_name, "data": bearing_data}],
    }

    # Return as valid GeoJSON Feature wrapping datasets (#104 — F-2.5)
    return [
        {
            "type": "Feature",
            "id": f"rb-{uuid.uuid4().hex[:8]}",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {
                "name": f"Range & Bearing: {name1} → {name2}",
                "from_feature": name1,
                "to_feature": name2,
                "__datasets": [range_dataset, bearing_dataset],
            },
        }
    ]
