"""
Generate Reference Points tool.

Creates a grid or scatter pattern of GeoJSON MultiPoint reference points
within a bounding box. First step of the E03 buffer zone analysis chain.
"""

from __future__ import annotations

import math
import time
from typing import Any

from debrief_calc.models import (
    ContextType,
    GeoJSONFeatureDict,
    SelectionContext,
    ToolCategoryEnum,
    ToolParameter,
)
from debrief_calc.registry import tool

# LCG PRNG constants (Numerical Recipes) — identical in Python and TypeScript
_LCG_MULTIPLIER = 1664525
_LCG_INCREMENT = 1013904223
_LCG_MODULUS = 2**32  # 4294967296


def _lcg_next(state: int) -> int:
    """Advance LCG state by one step."""
    return (_LCG_MULTIPLIER * state + _LCG_INCREMENT) % _LCG_MODULUS


def _extract_bounds_from_polygon(feature: GeoJSONFeatureDict) -> tuple[float, float, float, float]:
    """Extract bounding box [west, south, east, north] from a polygon feature."""
    geom = feature.get("geometry", {})
    coords = geom.get("coordinates", [[]])[0]  # outer ring
    if not coords:
        raise ValueError("Polygon feature has no coordinates")
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return min(lons), min(lats), max(lons), max(lats)


def _validate_bounds(
    bounds: tuple[float, float, float, float],
) -> tuple[float, float, float, float]:
    """Validate bounding box."""
    west, south, east, north = bounds

    if south >= north:
        raise ValueError(f"South ({south}) must be less than north ({north})")

    if west == east or south == north:
        raise ValueError("Bounding box must have positive area")

    return west, south, east, north


def _validate_positive_int(value: object, name: str) -> int:
    """Validate that a value is a positive integer."""
    if not isinstance(value, int) or value < 1:
        raise ValueError(f"{name.capitalize()} must be a positive integer")
    return value


def _normalise_lon(lon: float) -> float:
    """Normalise longitude to [-180, 180]."""
    if lon > 180:
        lon -= 360
    elif lon < -180:
        lon += 360
    return lon


def _build_multipoint_feature(
    feature_id: str,
    coordinates: list[list[float]],
    metadata: list[dict[str, Any]],
    name: str,
) -> GeoJSONFeatureDict:
    """Build a MultiPoint GeoJSON Feature with parallel pointMetadata."""
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": {
            "type": "MultiPoint",
            "coordinates": coordinates,
        },
        "properties": {
            "kind": "POINT",
            "locationType": "REFERENCE",
            "name": name,
            "style": {
                "shape": "square",
                "color": "#666666",
                "radius": 5,
            },
            "pointMetadata": metadata,
        },
    }


def _grid_dimensions(count: int) -> tuple[int, int]:
    """Compute grid dimensions (rows, cols) from a target count.

    Produces a near-square grid with rows * cols >= count.
    """
    cols = math.ceil(math.sqrt(count))
    rows = math.ceil(count / cols)
    return rows, cols


def _generate_grid(
    west: float, south: float, east: float, north: float, count: int
) -> GeoJSONFeatureDict:
    """Generate a grid of evenly spaced reference points."""
    rows, cols = _grid_dimensions(count)
    effective_east = east + 360 if west > east else east

    coordinates: list[list[float]] = []
    metadata: list[dict[str, Any]] = []

    for r in range(rows):
        lat = (south + north) / 2 if rows == 1 else south + r * (north - south) / (rows - 1)

        for c in range(cols):
            idx = r * cols + c
            if idx >= count:
                break

            lon = (
                (west + effective_east) / 2
                if cols == 1
                else west + c * (effective_east - west) / (cols - 1)
            )
            lon = _normalise_lon(lon)

            coordinates.append([lon, lat])
            metadata.append({"index": idx, "name": f"Ref {idx + 1}"})

    return _build_multipoint_feature(
        "ref-grid", coordinates, metadata, f"Reference Points (grid {count})"
    )


def _generate_scatter(
    west: float, south: float, east: float, north: float, count: int, seed: int | None
) -> GeoJSONFeatureDict:
    """Generate a scatter of random reference points using LCG PRNG."""
    effective_east = east + 360 if west > east else east

    state = seed if seed is not None else time.time_ns() % _LCG_MODULUS

    coordinates: list[list[float]] = []
    metadata: list[dict[str, Any]] = []

    for i in range(count):
        state = _lcg_next(state)
        lon_frac = state / _LCG_MODULUS
        state = _lcg_next(state)
        lat_frac = state / _LCG_MODULUS

        lon = west + lon_frac * (effective_east - west)
        lat = south + lat_frac * (north - south)
        lon = _normalise_lon(lon)

        coordinates.append([lon, lat])
        metadata.append({"index": i, "name": f"Ref {i + 1}"})

    return _build_multipoint_feature(
        "ref-scatter", coordinates, metadata, f"Reference Points (scatter {count})"
    )


@tool(
    name="generate-reference-points",
    description="Generates a grid or scatter pattern of reference points within a selected polygon.",
    input_kinds=["RECTANGLE", "POLY", "CIRCLE"],
    output_kind="reference/generated_points",
    context_type=ContextType.SINGLE,
    category=ToolCategoryEnum.calc,
    parameters=[
        ToolParameter(
            name="pattern",
            type="enum",
            description="Generation pattern",
            required=True,
            param_type="ReferencePointPattern",
        ),
        ToolParameter(
            name="count",
            type="number",
            description="Number of reference points to generate",
            default=20,
            choices=[1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000],
        ),
        ToolParameter(
            name="seed",
            type="number",
            description="Random seed (scatter only)",
        ),
    ],
)
def generate_reference_points(
    context: SelectionContext, params: dict[str, Any]
) -> list[GeoJSONFeatureDict]:
    """
    Generate a grid or scatter of reference points within a polygon's bounding box.

    Args:
        context: SelectionContext (SINGLE — one RECTANGLE or CIRCLE feature)
        params: Tool parameters including pattern, count, and optional seed

    Returns:
        List containing a single MultiPoint GeoJSON Feature
    """
    if not context.features:
        raise ValueError("Requires exactly one polygon feature")

    pattern = params.get("pattern")
    # Validate against schema-defined ReferencePointPattern enum
    from debrief_schemas.validation import resolve_enum_values

    valid_patterns = resolve_enum_values("ReferencePointPattern") or {"grid", "scatter"}
    if pattern not in valid_patterns:
        raise ValueError(f"Pattern must be one of: {', '.join(sorted(valid_patterns))}")

    count = int(params.get("count", 20))
    _validate_positive_int(count, "count")

    bounds = _extract_bounds_from_polygon(context.features[0])
    west, south, east, north = _validate_bounds(bounds)

    if pattern == "grid":
        feature = _generate_grid(west, south, east, north, count)
    else:
        seed = params.get("seed")
        feature = _generate_scatter(west, south, east, north, count, seed)

    return [feature]
