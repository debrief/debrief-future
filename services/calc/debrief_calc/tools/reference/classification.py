"""
Point-in-Zone Classifier tool.

Classifies reference points by buffer zone membership using ray-casting
point-in-polygon testing. Step 4 of the E03 buffer zone analysis chain.
"""

from __future__ import annotations

import copy
from typing import Any

from debrief_calc.models import ContextType, GeoJSONFeatureDict, SelectionContext, ToolCategoryEnum
from debrief_calc.registry import tool

# Default color for points outside all zones
_DEFAULT_COLOR = "#666666"
_DEFAULT_ZONE = "none"


def _point_in_polygon(px: float, py: float, ring: list[list[float]]) -> bool:
    """Ray-casting point-in-polygon test.

    Casts a horizontal ray to the right from (px, py) and counts edge crossings.
    Odd count = inside, even count = outside.
    """
    inside = False
    n = len(ring)
    j = n - 1

    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]

        if ((yi > py) != (yj > py)) and (px < (xj - xi) * (py - yi) / (yj - yi) + xi):
            inside = not inside

        j = i

    return inside


def _get_zone_color(zone_info: dict[str, Any]) -> str:
    """Extract color from zone metadata, preferring fill_color over color."""
    style = zone_info.get("style", {})
    return style.get("fill_color", style.get("color", _DEFAULT_COLOR))


@tool(
    name="point-in-zone-classifier",
    description=(
        "Classify reference points by detection zone membership. "
        "Tests each coordinate against concentric zone polygons (innermost first) "
        "and updates per-point metadata with zone name and color."
    ),
    input_kinds=["POINT", "ZONE"],
    output_kind="reference/classified_points",
    context_type=ContextType.MULTI,
    parameters=[],
    category=ToolCategoryEnum.calc,
)
def point_in_zone_classifier(
    context: SelectionContext, params: dict[str, Any]
) -> list[GeoJSONFeatureDict]:
    """
    Classify reference points by buffer zone membership.

    Args:
        context: SelectionContext (MULTI — one POINT/REFERENCE and one ZONE feature)
        params: Tool parameters (none required)

    Returns:
        List containing the classified MultiPoint GeoJSON Feature
    """
    # Find reference and zone features
    ref_feature: GeoJSONFeatureDict | None = None
    zone_feature: GeoJSONFeatureDict | None = None

    for feature in context.features:
        props = feature.get("properties", {})
        kind = props.get("kind")
        if kind == "POINT" and props.get("locationType") == "REFERENCE" and ref_feature is None:
            ref_feature = feature
        elif kind == "ZONE" and zone_feature is None:
            zone_feature = feature

    # Validate inputs
    if ref_feature is None:
        raise ValueError("No reference point feature found")
    if zone_feature is None:
        raise ValueError("No zone feature found")

    ref_geom = ref_feature.get("geometry", {})
    zone_geom = zone_feature.get("geometry", {})

    if ref_geom.get("type") != "MultiPoint":
        raise ValueError("Reference feature must have MultiPoint geometry")
    if zone_geom.get("type") != "MultiPolygon":
        raise ValueError("Zone feature must have MultiPolygon geometry")

    coordinates: list[list[float]] = ref_geom.get("coordinates", [])
    ref_props = ref_feature.get("properties", {})
    metadata: list[dict[str, Any]] = ref_props.get("pointMetadata", [])
    zone_polygons: list[list[list[list[float]]]] = zone_geom.get("coordinates", [])
    zone_info_list: list[dict[str, Any]] = zone_feature.get("properties", {}).get("zones", [])

    if len(metadata) != len(coordinates):
        raise ValueError("pointMetadata length must match coordinates length")

    # Handle empty coordinates
    if not coordinates:
        classified = copy.deepcopy(ref_feature)
        classified["properties"]["pointMetadata"] = []
        classified["properties"]["pointColors"] = []
        return [classified]

    # Classify each point
    point_colors: list[str] = []
    zone_counts: dict[str, int] = {}
    new_metadata: list[dict[str, Any]] = []

    for i, coord in enumerate(coordinates):
        px = coord[0]  # longitude
        py = coord[1]  # latitude

        assigned_zone = _DEFAULT_ZONE
        assigned_color = _DEFAULT_COLOR

        # Test zones innermost first (index 0 = highest likelihood)
        for z, polygon_rings in enumerate(zone_polygons):
            if z < len(zone_info_list):
                ring = polygon_rings[0]  # outer ring of this polygon
                if _point_in_polygon(px, py, ring):
                    assigned_zone = zone_info_list[z].get("name", f"zone-{z}")
                    assigned_color = _get_zone_color(zone_info_list[z])
                    break

        # Copy and update metadata entry (preserve existing fields)
        entry = dict(metadata[i]) if i < len(metadata) else {}
        entry["zone"] = assigned_zone
        entry["color"] = assigned_color
        new_metadata.append(entry)
        point_colors.append(assigned_color)

        # Track counts
        zone_counts[assigned_zone] = zone_counts.get(assigned_zone, 0) + 1

    # Build classified feature (deep copy of original with updated metadata)
    classified = copy.deepcopy(ref_feature)
    classified["properties"]["pointMetadata"] = new_metadata
    classified["properties"]["pointColors"] = point_colors

    # Assign a new unique ID so the classified result doesn't collide with the
    # original reference-points layer in the feature list / visibility toggle.
    base_id = ref_feature.get("id", "ref-points")
    classified["id"] = f"{base_id}-classified"
    original_name = classified["properties"].get("name", "Reference Points")
    classified["properties"]["name"] = f"{original_name} (classified)"

    return [classified]
