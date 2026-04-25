"""Enlarge Shape tool — scale annotation features by a multiplicative factor."""

from __future__ import annotations

from typing import Any

from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    SelectionContext,
    ToolCategoryEnum,
    ToolParameter,
)
from debrief_calc.registry import tool

ANNOTATION_KINDS = {"CIRCLE", "RECTANGLE", "LINE", "TEXT", "VECTOR"}


def compute_centroid(geometry: GeoJSONFeatureDict) -> list[float]:
    """
    Compute arithmetic mean of vertices as the geometric centroid.

    For Polygon: uses exterior ring, excluding closing vertex.
    For LineString: uses all coordinates.
    For Point: returns the coordinate itself.

    Args:
        geometry: GeoJSON geometry dict with 'type' and 'coordinates'.

    Returns:
        [longitude, latitude] centroid coordinate.
    """
    geo_type = geometry.get("type")
    coords = geometry.get("coordinates")

    if coords is None:
        return [0.0, 0.0]

    if geo_type == "Point":
        return list(coords)

    if geo_type == "Polygon":
        ring = coords[0]
        # Exclude closing vertex if first == last
        vertices = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
    elif geo_type == "LineString":
        vertices = coords
    else:
        vertices = coords

    n = len(vertices)
    if n == 0:
        return [0.0, 0.0]

    sum_lon = sum(v[0] for v in vertices)
    sum_lat = sum(v[1] for v in vertices)
    return [sum_lon / n, sum_lat / n]


def scale_coordinate(coord: list[float], origin: list[float], scale_factor: float) -> list[float]:
    """
    Scale a single [lon, lat] coordinate relative to an origin.

    Args:
        coord: [longitude, latitude] to scale.
        origin: [longitude, latitude] scaling origin.
        scale_factor: Multiplicative scaling factor.

    Returns:
        Scaled [longitude, latitude].
    """
    new_lon = origin[0] + (coord[0] - origin[0]) * scale_factor
    new_lat = origin[1] + (coord[1] - origin[1]) * scale_factor

    # Clamp latitude to [-90, 90]
    new_lat = max(-90.0, min(90.0, new_lat))

    # Normalise longitude to [-180, 180]
    new_lon = ((new_lon + 180) % 360) - 180

    return [new_lon, new_lat]


def _scale_coords_list(
    coords: list[list[float]], origin: list[float], scale_factor: float
) -> list[list[float]]:
    """Scale a list of [lon, lat] coordinates relative to an origin."""
    return [scale_coordinate(c, origin, scale_factor) for c in coords]


@tool(
    name="enlarge-shape",
    description=(
        "Scales annotation shapes by a multiplicative factor relative to an origin point. "
        "Uses linear interpolation of geographic coordinate differences. "
        "Supports CIRCLE, RECTANGLE, LINE, TEXT, and VECTOR annotations."
    ),
    input_kinds=["CIRCLE", "RECTANGLE", "LINE", "TEXT", "VECTOR"],
    output_kind="mutation/shape/scaled",
    context_type=ContextType.MULTI,
    category=ToolCategoryEnum.calc,
    parameters=[
        ToolParameter(
            name="scale_factor",
            type="number",
            description="Multiplicative scaling factor (>1 enlarges, <1 shrinks, 1 is no-op)",
            required=False,
            default=3.0,
            choices=[0.25, 0.5, 1.5, 2.0, 3.0, 5.0],
        ),
        ToolParameter(
            name="origin",
            type="string",
            description=(
                "Scaling origin as [longitude, latitude] JSON array. "
                "Default: geometric centroid of each shape."
            ),
            required=False,
            default=None,
        ),
    ],
)
def enlarge_shape(context: SelectionContext, params: dict[str, Any]) -> list[GeoJSONFeatureDict]:
    """
    Scale annotation shapes by a multiplicative factor relative to an origin.

    Args:
        context: SelectionContext with one or more annotation features.
        params: Parameters dict with 'scale_factor' (default 3.0)
                and optional 'origin' ([lon, lat] or None for centroid).

    Returns:
        List of modified features with scaled coordinates.
    """
    scale_factor = float(params.get("scale_factor", 3.0))

    # Parse origin — may be a list or a JSON string
    raw_origin = params.get("origin")
    if isinstance(raw_origin, str):
        import json

        origin = json.loads(raw_origin)
    elif isinstance(raw_origin, list):
        origin = raw_origin
    else:
        origin = None

    if scale_factor < 0:
        raise ValueError("scale_factor must be >= 0")

    modified = []
    for feature in context.features:
        props = feature.get("properties", {})
        kind = props.get("kind")

        if kind not in ANNOTATION_KINDS:
            continue

        geometry = feature.get("geometry", {})

        # Determine scaling origin
        scaling_origin = origin if origin is not None else compute_centroid(geometry)

        # Scale factor of 1.0 is a no-op — return feature unchanged
        if scale_factor == 1.0:
            modified.append(feature)
            continue

        coords = geometry.get("coordinates")

        if kind in ("CIRCLE", "RECTANGLE"):
            # Polygon geometry: scale all rings
            geometry["coordinates"] = [
                _scale_coords_list(ring, scaling_origin, scale_factor) for ring in coords
            ]
            if kind == "CIRCLE" and "center" in props:
                props["center"] = scale_coordinate(props["center"], scaling_origin, scale_factor)

        elif kind == "LINE":
            # LineString geometry: scale all coordinates
            geometry["coordinates"] = _scale_coords_list(coords, scaling_origin, scale_factor)

        elif kind == "TEXT":
            # Point geometry: scale single coordinate
            geometry["coordinates"] = scale_coordinate(coords, scaling_origin, scale_factor)

        elif kind == "VECTOR":
            # LineString geometry: scale all coordinates
            geometry["coordinates"] = _scale_coords_list(coords, scaling_origin, scale_factor)
            # Update origin property; preserve range and bearing
            if "origin" in props:
                props["origin"] = scale_coordinate(props["origin"], scaling_origin, scale_factor)

        modified.append(feature)

    if not modified:
        raise ValueError("No annotation features found in input")

    return modified
