"""
Shared test fixtures and sample data for debrief-stac tests.

This module provides reusable test data for GeoJSON features,
STAC structures, and sample metadata.
"""

from datetime import datetime, timezone

from debrief_stac.types import GeoJSONFeature, GeoJSONFeatureCollection


def make_sample_track_feature(
    feature_id: str = "track-001",
    platform_id: str = "VESSEL-A",
    platform_name: str = "HMS Example",
) -> GeoJSONFeature:
    """Create a sample track feature for testing.

    Returns a GeoJSON Feature representing a vessel track.
    """
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-5.0, 50.0],
                [-5.1, 50.1],
                [-5.2, 50.2],
            ]
        },
        "properties": {
            "platform_id": platform_id,
            "platform_name": platform_name,
            "track_type": "OWNSHIP",
            "start_time": "2026-01-09T10:00:00Z",
            "end_time": "2026-01-09T12:00:00Z",
            "positions": [
                {
                    "time": "2026-01-09T10:00:00Z",
                    "coordinates": [-5.0, 50.0],
                    "course": 45.0,
                    "speed": 12.0
                },
                {
                    "time": "2026-01-09T11:00:00Z",
                    "coordinates": [-5.1, 50.1],
                    "course": 47.0,
                    "speed": 11.5
                },
                {
                    "time": "2026-01-09T12:00:00Z",
                    "coordinates": [-5.2, 50.2],
                    "course": 50.0,
                    "speed": 13.0
                }
            ]
        },
        "bbox": [-5.2, 50.0, -5.0, 50.2]
    }


def make_sample_reference_location(
    feature_id: str = "ref-001",
    name: str = "Waypoint Alpha",
    lon: float = -4.5,
    lat: float = 50.5,
) -> GeoJSONFeature:
    """Create a sample reference location for testing.

    Returns a GeoJSON Feature representing a reference point.
    """
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat]
        },
        "properties": {
            "name": name,
            "location_type": "WAYPOINT",
            "description": "Test waypoint"
        }
    }


def make_sample_feature_collection(
    features: list[GeoJSONFeature] | None = None,
) -> GeoJSONFeatureCollection:
    """Create a sample FeatureCollection for testing.

    If no features provided, creates a collection with one track
    and one reference location.
    """
    if features is None:
        features = [
            make_sample_track_feature(),
            make_sample_reference_location(),
        ]

    return {
        "type": "FeatureCollection",
        "features": features
    }


def make_sample_stac_catalog(
    catalog_id: str = "test-catalog",
    description: str = "Test catalog for unit tests",
) -> dict:
    """Create a sample STAC catalog structure."""
    return {
        "type": "Catalog",
        "stac_version": "1.0.0",
        "id": catalog_id,
        "description": description,
        "links": [
            {"rel": "root", "href": "./catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./catalog.json", "type": "application/json"},
        ]
    }


def make_sample_stac_item(
    item_id: str = "plot-001",
    title: str = "Test Plot",
    dt: datetime | None = None,
) -> dict:
    """Create a sample STAC Item structure."""
    if dt is None:
        dt = datetime.now(timezone.utc)

    return {
        "type": "Feature",
        "stac_version": "1.0.0",
        "id": item_id,
        "geometry": None,
        "bbox": None,
        "properties": {
            "title": title,
            "datetime": dt.isoformat(),
        },
        "links": [
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./item.json", "type": "application/json"},
        ],
        "assets": {}
    }
