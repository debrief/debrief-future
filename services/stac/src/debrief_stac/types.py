"""
Type aliases for STAC structures used throughout debrief-stac.

These types provide clarity for function signatures and help
with static type checking.
"""

from pathlib import Path
from typing import Any, TypeAlias

# Path types
CatalogPath: TypeAlias = Path | str
PlotPath: TypeAlias = Path | str
AssetPath: TypeAlias = Path | str

# STAC structure types (JSON-compatible dicts)
STACCatalog: TypeAlias = dict[str, Any]
STACCollection: TypeAlias = dict[str, Any]
STACItem: TypeAlias = dict[str, Any]
STACAsset: TypeAlias = dict[str, Any]
STACLink: TypeAlias = dict[str, str]

# GeoJSON types
# #204 / Article XV note: These aliases remain `dict[str, Any]` pending a
# full refactor of debrief_stac.features. The stricter schema-rooted shape
# (`RawGeoJSONFeature` Pydantic model, or `dict[str, object]` with explicit
# narrowing) would require replacing every `fc["features"]` access with
# a cast — a non-trivial change outside #204's consolidation scope. The
# ADR records this deferral explicitly; see docs/project_notes/decisions.md.
GeoJSONFeature: TypeAlias = dict[str, Any]
GeoJSONFeatureCollection: TypeAlias = dict[str, Any]
BoundingBox: TypeAlias = tuple[float, float, float, float]  # [minLon, minLat, maxLon, maxLat]

# STAC spec version
STAC_VERSION = "1.1.0"

# Asset roles
ASSET_ROLE_DATA = "data"
ASSET_ROLE_SOURCE = "source"

# Media types
MEDIA_TYPE_GEOJSON = "application/geo+json"
MEDIA_TYPE_JSON = "application/json"
