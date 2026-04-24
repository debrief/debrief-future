"""Move Shape tool — translate annotation features by bearing and distance."""

from __future__ import annotations

import math
from typing import Any

from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    SelectionContext,
    ToolCategoryEnum,
    ToolParameter,
)
from debrief_calc.registry import tool

EARTH_RADIUS_KM = 6371.0

ANNOTATION_KINDS = {"CIRCLE", "RECTANGLE", "LINE", "TEXT", "VECTOR"}


def translate_point(
    lat_deg: float, lon_deg: float, bearing_deg: float, distance_km: float
) -> tuple[float, float]:
    """
    Compute destination point given start, bearing, and distance on a sphere.

    Uses the Vincenty destination formula (spherical approximation).

    Args:
        lat_deg: Start latitude in degrees.
        lon_deg: Start longitude in degrees.
        bearing_deg: Compass bearing in degrees (0=North, 90=East).
        distance_km: Distance in kilometres.

    Returns:
        Tuple of (latitude, longitude) in degrees.
    """
    lat1 = math.radians(lat_deg)
    lon1 = math.radians(lon_deg)
    brng = math.radians(bearing_deg)
    d = distance_km / EARTH_RADIUS_KM

    sin_lat1 = math.sin(lat1)
    cos_lat1 = math.cos(lat1)
    sin_d = math.sin(d)
    cos_d = math.cos(d)

    lat2 = math.asin(sin_lat1 * cos_d + cos_lat1 * sin_d * math.cos(brng))
    lon2 = lon1 + math.atan2(
        math.sin(brng) * sin_d * cos_lat1,
        cos_d - sin_lat1 * math.sin(lat2),
    )

    # Normalise longitude to [-180, 180]
    lon2_deg = math.degrees(lon2)
    lon2_deg = ((lon2_deg + 180) % 360) - 180

    return (math.degrees(lat2), lon2_deg)


def _translate_coordinate(
    coord: list[float], bearing_deg: float, distance_km: float
) -> list[float]:
    """Translate a single [lon, lat] coordinate and return [lon, lat]."""
    lon, lat = coord[0], coord[1]
    new_lat, new_lon = translate_point(lat, lon, bearing_deg, distance_km)
    return [new_lon, new_lat]


def _translate_coords_list(
    coords: list[list[float]], bearing_deg: float, distance_km: float
) -> list[list[float]]:
    """Translate a list of [lon, lat] coordinates."""
    return [_translate_coordinate(c, bearing_deg, distance_km) for c in coords]


@tool(
    name="move-shape",
    description=(
        "Translates annotation shapes by a given compass bearing and distance. "
        "Shifts all coordinates using great-circle math. "
        "Supports CIRCLE, RECTANGLE, LINE, TEXT, and VECTOR annotations."
    ),
    input_kinds=["CIRCLE", "RECTANGLE", "LINE", "TEXT", "VECTOR"],
    output_kind="mutation/shape/translated",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.calc,
    parameters=[
        ToolParameter(
            name="direction",
            type="number",
            description="Compass bearing in degrees (0=North, 90=East, 180=South, 270=West)",
            required=False,
            default=90,
        ),
        ToolParameter(
            name="distance_km",
            type="number",
            description="Translation distance in kilometres",
            required=False,
            default=5,
        ),
    ],
)
def move_shape(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Translate annotation shapes by compass bearing and distance.

    Args:
        context: SelectionContext with one or more annotation features.
        params: Parameters dict with 'direction' (degrees, default 90)
                and 'distance_km' (km, default 5).

    Returns:
        List of modified features with translated coordinates.
    """
    direction = float(params.get("direction", 90))
    distance_km = float(params.get("distance_km", 5))

    # Normalise direction to [0, 360)
    direction = direction % 360

    # Zero distance is a no-op — return features unchanged
    if distance_km == 0:
        return [
            f for f in context.features if f.get("properties", {}).get("kind") in ANNOTATION_KINDS
        ]

    if distance_km < 0:
        raise ValueError("distance_km must be >= 0")

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        kind = props.get("kind")

        if kind not in ANNOTATION_KINDS:
            continue

        geometry = feature.get("geometry", {})
        coords = geometry.get("coordinates")

        if kind == "CIRCLE":
            # Polygon geometry: translate all vertices in all rings
            new_coords = [_translate_coords_list(ring, direction, distance_km) for ring in coords]
            geometry["coordinates"] = new_coords
            # Update center property
            if "center" in props:
                center = props["center"]
                new_center = _translate_coordinate(center, direction, distance_km)
                props["center"] = new_center

        elif kind == "RECTANGLE":
            # Polygon geometry: translate all vertices in all rings
            new_coords = [_translate_coords_list(ring, direction, distance_km) for ring in coords]
            geometry["coordinates"] = new_coords

        elif kind == "LINE":
            # LineString geometry: translate all coordinates
            geometry["coordinates"] = _translate_coords_list(coords, direction, distance_km)

        elif kind == "TEXT":
            # Point geometry: translate single coordinate
            new_coord = _translate_coordinate(coords, direction, distance_km)
            geometry["coordinates"] = new_coord

        elif kind == "VECTOR":
            # LineString geometry: translate all coordinates
            geometry["coordinates"] = _translate_coords_list(coords, direction, distance_km)
            # Update origin property, preserve range and bearing
            if "origin" in props:
                origin = props["origin"]
                new_origin = _translate_coordinate(origin, direction, distance_km)
                props["origin"] = new_origin

        modified.append(feature)

    if not modified:
        raise ValueError("No annotation features found in input")

    return modified
