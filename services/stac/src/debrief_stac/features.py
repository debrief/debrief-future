"""
GeoJSON Feature operations for debrief-stac.

This module provides functions for adding and managing GeoJSON features
within plot FeatureCollection assets.
"""

import json
from pathlib import Path
from typing import Sequence

from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import (
    ASSET_ROLE_DATA,
    MEDIA_TYPE_GEOJSON,
    BoundingBox,
    CatalogPath,
    GeoJSONFeature,
    GeoJSONFeatureCollection,
)


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
        fc = {
            "type": "FeatureCollection",
            "features": []
        }

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
        "roles": [ASSET_ROLE_DATA]
    }

    # Update bbox
    bbox = _calculate_bbox(fc["features"])
    if bbox:
        item["bbox"] = list(bbox)
        # Update geometry to bounding box polygon
        item["geometry"] = _bbox_to_polygon(bbox)

    # Save updated item
    _save_plot(catalog_path, plot_id, item)

    return len(fc["features"])


def _validate_feature(feature: GeoJSONFeature) -> None:
    """Validate a GeoJSON feature has required fields.

    Args:
        feature: Feature dictionary to validate

    Raises:
        ValueError: If feature is missing required fields
    """
    if not isinstance(feature, dict):
        raise ValueError("Feature must be a dictionary")

    if feature.get("type") != "Feature":
        raise ValueError(f"Feature type must be 'Feature', got: {feature.get('type')}")

    if "geometry" not in feature:
        raise ValueError("Feature must have a 'geometry' field")

    if "properties" not in feature:
        raise ValueError("Feature must have a 'properties' field")


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
        return [(coords[0], coords[1])]

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
        "coordinates": [[
            [min_lon, min_lat],
            [max_lon, min_lat],
            [max_lon, max_lat],
            [min_lon, max_lat],
            [min_lon, min_lat],  # Close the ring
        ]]
    }
