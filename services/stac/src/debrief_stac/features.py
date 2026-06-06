"""
GeoJSON Feature operations for debrief-stac.

This module provides functions for adding and managing GeoJSON features
within plot FeatureCollection assets.
"""

import json
import logging
from collections.abc import Sequence
from pathlib import Path

from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import (
    ASSET_ROLE_DATA,
    MEDIA_TYPE_GEOJSON,
    BoundingBox,
    CatalogPath,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
)

logger = logging.getLogger(__name__)

# Null-geometry coercion note (#204 review 5-alt):
# The companion shim in services/io/debrief_io/parser.py converts null
# geometry to GeoJSONEmptyPoint at the REP-import boundary. We do NOT
# repeat that coercion here because the STAC catalog legitimately accepts
# null-geometry NarrativeEntry features (geometry is optional per schema)
# and coercing them to {type:"Point", coordinates:[]} would violate the
# NarrativeEntry schema's GeoJSONPoint range. Downstream consumers that
# need a non-null geometry (e.g., mapPanel) either narrow via the
# NarrativeEntry discriminator or apply the coercion at their own
# ingress boundary.


def add_features(
    catalog_path: CatalogPath,
    plot_id: str,
    features: Sequence[GeoJSONFeature],
) -> int:
    """Add GeoJSON features to a plot's FeatureCollection.

    If the plot doesn't have a FeatureCollection asset yet, one is created.
    Otherwise, features are appended to the existing collection.
    The plot's bbox is updated to encompass all features.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add features to
        features: List of GeoJSON Feature dictionaries

    Returns:
        Total number of features in the FeatureCollection after adding

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        ValueError: If features are invalid GeoJSON

    Example:
        >>> features = [{"type": "Feature", "geometry": {...}, "properties": {...}}]
        >>> count = add_features("/data/catalog", "my-plot", features)
        >>> print(f"Total features: {count}")
    """
    catalog_path = Path(catalog_path)

    # Validate features
    for feature in features:
        _validate_feature(feature)

    # Read current plot
    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id

    # Get or create FeatureCollection
    features_filename = "features.geojson"
    features_path = plot_dir / features_filename

    if features_path.exists():
        # Load existing
        with open(features_path) as f:
            fc: GeoJSONFeatureCollection = json.load(f)
    else:
        # Create new
        fc = {"type": "FeatureCollection", "features": []}

    # Append new features
    fc["features"].extend(features)

    # Write updated FeatureCollection
    with open(features_path, "w") as f:
        json.dump(fc, f, indent=2)

    # Update item assets
    item["assets"]["features"] = {
        "href": f"./{features_filename}",
        "type": MEDIA_TYPE_GEOJSON,
        "title": "GeoJSON Features",
        "roles": [ASSET_ROLE_DATA],
    }

    # Update bbox
    bbox = _calculate_bbox(fc["features"])
    if bbox:
        item["bbox"] = list(bbox)
        # Update geometry to bounding box polygon
        item["geometry"] = _bbox_to_polygon(bbox)

    # Save updated item
    _save_plot(catalog_path, plot_id, item)

    # Update Collection summaries
    from debrief_stac.catalog import _save_catalog, open_catalog
    from debrief_stac.collection import update_collection_summaries

    catalog_data = open_catalog(catalog_path)
    update_collection_summaries(catalog_data, item, "update", catalog_path=catalog_path)
    _save_catalog(catalog_path, catalog_data)

    return len(fc["features"])


def update_features(
    catalog_path: CatalogPath,
    plot_id: str,
    features: Sequence[GeoJSONFeature],
) -> int:
    """Update existing features in-place in a plot's FeatureCollection.

    Matches features by ID and replaces them. Features not found are ignored.
    Updates bbox after modifications.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        features: Updated GeoJSON Feature dicts (must have matching IDs)

    Returns:
        Number of features successfully updated

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        ValueError: If features are invalid GeoJSON
    """
    catalog_path = Path(catalog_path)

    for feature in features:
        _validate_feature(feature)

    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id
    features_path = plot_dir / "features.geojson"

    if not features_path.exists():
        return 0

    with open(features_path) as f:
        fc: GeoJSONFeatureCollection = json.load(f)

    # Build lookup of updates by ID
    updates = {}
    for feat in features:
        fid = feat.get("id") or feat.get("properties", {}).get("id")
        if fid:
            updates[fid] = feat

    updated_count = 0
    for i, existing in enumerate(fc["features"]):
        eid = existing.get("id") or existing.get("properties", {}).get("id")
        if eid in updates:
            fc["features"][i] = updates[eid]
            updated_count += 1

    with open(features_path, "w") as f:
        json.dump(fc, f, indent=2)

    bbox = _calculate_bbox(fc["features"])
    if bbox:
        item["bbox"] = list(bbox)
        item["geometry"] = _bbox_to_polygon(bbox)

    _save_plot(catalog_path, plot_id, item)

    # Update Collection summaries
    from debrief_stac.catalog import _save_catalog, open_catalog
    from debrief_stac.collection import update_collection_summaries

    catalog_data = open_catalog(catalog_path)
    update_collection_summaries(catalog_data, item, "update", catalog_path=catalog_path)
    _save_catalog(catalog_path, catalog_data)

    return updated_count


def delete_features(
    catalog_path: CatalogPath,
    plot_id: str,
    feature_ids: list[str],
) -> int:
    """Remove features from a plot's FeatureCollection by ID.

    Removes features with matching IDs. IDs not found are ignored.
    Updates bbox after removals.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        feature_ids: IDs of features to remove

    Returns:
        Number of features actually removed

    Raises:
        PlotNotFoundError: If the plot doesn't exist
    """
    catalog_path = Path(catalog_path)

    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id
    features_path = plot_dir / "features.geojson"

    if not features_path.exists():
        return 0

    with open(features_path) as f:
        fc: GeoJSONFeatureCollection = json.load(f)

    ids_to_remove = set(feature_ids)
    original_count = len(fc["features"])
    fc["features"] = [
        f
        for f in fc["features"]
        if (f.get("id") or f.get("properties", {}).get("id")) not in ids_to_remove
    ]
    removed_count = original_count - len(fc["features"])

    with open(features_path, "w") as f:
        json.dump(fc, f, indent=2)

    bbox = _calculate_bbox(fc["features"])
    if bbox:
        item["bbox"] = list(bbox)
        item["geometry"] = _bbox_to_polygon(bbox)
    else:
        # STAC 1.1 Item Schema forbids null bbox; omit the key entirely when
        # there are no spatial features.
        item.pop("bbox", None)
        item["geometry"] = None

    _save_plot(catalog_path, plot_id, item)

    # Rebuild Collection summaries (deletions require full recomputation)
    from debrief_stac.catalog import _save_catalog, open_catalog
    from debrief_stac.collection import rebuild_collection_summaries

    catalog_data = open_catalog(catalog_path)
    if catalog_data.get("type") == "Collection":
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

    return removed_count


def _validate_feature(feature: GeoJSONFeature) -> None:
    """Validate a GeoJSON feature has required fields.

    Performs structural validation (required fields) and schema validation
    against debrief-schemas Pydantic models (blocking — Constitution XIV.4).

    Args:
        feature: Feature dictionary to validate

    Raises:
        ValueError: If feature is missing required structural fields
        SchemaValidationError: If feature fails schema validation
    """
    if not isinstance(feature, dict):
        raise ValueError("Feature must be a dictionary")

    if feature.get("type") != "Feature":
        raise ValueError(f"Feature type must be 'Feature', got: {feature.get('type')}")

    if "geometry" not in feature:
        raise ValueError("Feature must have a 'geometry' field")

    if "properties" not in feature:
        raise ValueError("Feature must have a 'properties' field")

    # Schema validation — blocking (Constitution XIV.4)
    try:
        from debrief_schemas.validation import validate_feature
    except ImportError:
        pass
    else:
        validate_feature(feature, "catalog_write")


def _calculate_bbox(features: Sequence[GeoJSONFeature]) -> BoundingBox | None:
    """Calculate bounding box encompassing all features.

    Args:
        features: List of GeoJSON features

    Returns:
        Bounding box as (minLon, minLat, maxLon, maxLat) or None if no valid geometries
    """
    min_lon = float("inf")
    min_lat = float("inf")
    max_lon = float("-inf")
    max_lat = float("-inf")

    has_coords = False

    for feature in features:
        geometry = feature.get("geometry")
        if not geometry:
            continue

        coords = _extract_coordinates(geometry)
        for lon, lat in coords:
            has_coords = True
            min_lon = min(min_lon, lon)
            min_lat = min(min_lat, lat)
            max_lon = max(max_lon, lon)
            max_lat = max(max_lat, lat)

    if not has_coords:
        return None

    return (min_lon, min_lat, max_lon, max_lat)


def _extract_coordinates(geometry: dict) -> list[tuple[float, float]]:
    """Extract all coordinate pairs from a GeoJSON geometry.

    Args:
        geometry: GeoJSON geometry object

    Returns:
        List of (lon, lat) tuples
    """
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates", [])

    if geom_type == "Point":
        if len(coords) >= 2:
            return [(coords[0], coords[1])]
        return []

    elif geom_type == "LineString":
        return [(c[0], c[1]) for c in coords]

    elif geom_type == "Polygon":
        # Polygon coords are arrays of linear rings
        result = []
        for ring in coords:
            result.extend((c[0], c[1]) for c in ring)
        return result

    elif geom_type == "MultiPoint":
        return [(c[0], c[1]) for c in coords]

    elif geom_type == "MultiLineString":
        result = []
        for line in coords:
            result.extend((c[0], c[1]) for c in line)
        return result

    elif geom_type == "MultiPolygon":
        result = []
        for polygon in coords:
            for ring in polygon:
                result.extend((c[0], c[1]) for c in ring)
        return result

    return []


def _bbox_to_polygon(bbox: BoundingBox) -> dict:
    """Convert bounding box to GeoJSON Polygon geometry.

    Args:
        bbox: Bounding box as (minLon, minLat, maxLon, maxLat)

    Returns:
        GeoJSON Polygon geometry
    """
    min_lon, min_lat, max_lon, max_lat = bbox

    return {
        "type": "Polygon",
        "coordinates": [
            [
                [min_lon, min_lat],
                [max_lon, min_lat],
                [max_lon, max_lat],
                [min_lon, max_lat],
                [min_lon, min_lat],  # Close the ring
            ]
        ],
    }
