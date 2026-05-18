"""
Area summary tool.

Summarises features within a geographic region. Accepts either:

- An explicit bounding box via ``context.bounds`` (REGION-style context), or
- A list of selected features whose coordinates are unioned into a bbox
  (MULTI-style context).

The TypeScript counterpart at
``apps/web-shell/src/tools/region/analysis/areaSummary.ts`` accepts the same
two inputs: ``params.bounds`` (mirrors ``context.bounds``) and the selected
features. Both implementations return ``[]`` when neither path yields a valid
bbox. See #107 (F-2.6) for the alignment record.
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


def _point_in_bbox(lon: float, lat: float, bbox: list[float]) -> bool:
    """Check if a point is within a bounding box [minx, miny, maxx, maxy]."""
    minx, miny, maxx, maxy = bbox
    return minx <= lon <= maxx and miny <= lat <= maxy


def _calculate_bbox_area_sq_nm(bbox: list[float]) -> float:
    """
    Calculate approximate area of a bounding box in square nautical miles.
    Uses a simple rectangular approximation.
    """
    minx, miny, maxx, maxy = bbox
    width_deg = maxx - minx
    height_deg = maxy - miny
    avg_lat = (miny + maxy) / 2
    height_nm = height_deg * 60
    width_nm = width_deg * 60 * math.cos(math.radians(avg_lat))
    return width_nm * height_nm


def _flatten_coords(coords: list) -> list[list[float]]:  # type: ignore[type-arg]
    """Recursively extract all [lon, lat] positions from GeoJSON coordinates."""
    if not isinstance(coords, list):
        return []
    if len(coords) > 0 and isinstance(coords[0], (int, float)):
        return [coords]
    result: list[list[float]] = []
    for item in coords:
        result.extend(_flatten_coords(item))
    return result


def _bounds_from_features(features: list[GeoJSONFeatureDict]) -> list[float] | None:
    """Extract bounding box from feature coordinates (matching TS approach)."""
    min_lon = float("inf")
    min_lat = float("inf")
    max_lon = float("-inf")
    max_lat = float("-inf")

    for f in features:
        geom = f.get("geometry")
        if not geom or "coordinates" not in geom:
            continue
        for pos in _flatten_coords(geom["coordinates"]):
            if len(pos) >= 2:
                lon, lat = pos[0], pos[1]
                if lon < min_lon:
                    min_lon = lon
                if lon > max_lon:
                    max_lon = lon
                if lat < min_lat:
                    min_lat = lat
                if lat > max_lat:
                    max_lat = lat

    if not math.isfinite(min_lon):
        return None
    return [min_lon, min_lat, max_lon, max_lat]


@tool(
    name="area-summary",
    description="Summarize the geographic extent and properties of selected features or a region",
    # Canonical FeatureKindEnum values that yield a meaningful bbox.
    # Kept in sync with apps/web-shell/src/tools/region/analysis/areaSummary.ts (#107).
    input_kinds=["TRACK", "POINT", "RECTANGLE", "CIRCLE", "ZONE", "POLY"],
    output_kind=OutputKindEnum.regionSOLIDUSstatistics,
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.calc,
    parameters=[
        ToolParameter(
            name="include_centroid",
            type="boolean",
            description="Include centroid point in output",
            default=True,
        )
    ],
)
def area_summary(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Summarize a geographic region.

    Accepts both explicit bounds (REGION context) and feature coordinates
    (MULTI context), aligning Python and TypeScript implementations (#107).

    Args:
        context: SelectionContext with bounds or features
        params: Optional parameters (include_centroid)

    Returns:
        List containing one Feature with area summary statistics
    """
    include_centroid = params.get("include_centroid", True)

    # Try explicit bounds first (REGION context), fall back to feature coordinates
    bounds = context.bounds
    if not bounds or len(bounds) != 4:
        bounds = _bounds_from_features(context.features)
    if not bounds or len(bounds) != 4:
        return []

    minx, miny, maxx, maxy = bounds

    # Calculate area
    area_sq_nm = _calculate_bbox_area_sq_nm(bounds)

    # Calculate dimensions
    import math

    avg_lat = (miny + maxy) / 2
    width_nm = (maxx - minx) * 60 * math.cos(math.radians(avg_lat))
    height_nm = (maxy - miny) * 60

    statistics: dict[str, Any] = {
        "area_sq_nm": round(area_sq_nm, 2),
        "width_nm": round(width_nm, 2),
        "height_nm": round(height_nm, 2),
    }

    if include_centroid:
        centroid_lon = (minx + maxx) / 2
        centroid_lat = (miny + maxy) / 2
        statistics["centroid"] = [round(centroid_lon, 4), round(centroid_lat, 4)]

    result_feature = {
        "type": "Feature",
        "id": f"area-{uuid.uuid4().hex[:8]}",
        "properties": {
            "statistics": statistics,
            "bounds": bounds,
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[[minx, miny], [maxx, miny], [maxx, maxy], [minx, maxy], [minx, miny]]],
        },
    }

    return [result_feature]
