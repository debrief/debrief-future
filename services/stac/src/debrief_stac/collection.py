"""
STAC Collection operations for debrief-stac.

This module provides functions for promoting Catalogs to Collections
and managing Collection summaries (temporal range, spatial extent,
extension property enumerations).

Data Flow:

    ┌─────────────┐    incremental    ┌──────────────────┐
    │ create_plot  │───────────────────│ update_collection │
    │ add_features │    (add/update)   │    _summaries     │
    │ upd_features │                   └──────────────────┘
    └─────────────┘
                                       ┌──────────────────┐
    ┌──────────────┐    full scan      │ rebuild_collection│
    │ del_features │───────────────────│    _summaries     │
    │ promotion    │                   └──────────────────┘
    └──────────────┘

Incremental path: merges new item data into existing summaries (O(1) reads).
Rebuild path: scans all items via link traversal (O(N) reads).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TYPE_CHECKING, Literal

from debrief_stac.exceptions import PlotNotFoundError

if TYPE_CHECKING:
    from debrief_stac.models import CollectionExtent, CollectionSummaries
    from debrief_stac.types import BoundingBox, CatalogPath, STACCatalog, STACItem

# Extension property keys that appear in item.properties and Collection summaries
_SUMMARY_PROPERTIES = [
    "debrief:vessel_classes",
    "debrief:tags",
    "debrief:feature_tags",
    "debrief:track_names",
    "debrief:nationalities",
]


def _extract_item_extent(
    item_data: STACItem,
) -> tuple[BoundingBox | None, str | None, str | None]:
    """Extract bounding box and temporal range from a STAC Item.

    Args:
        item_data: STAC Item dictionary

    Returns:
        Tuple of (bbox, start_datetime, end_datetime).
        bbox is None if item has no spatial data.
        Datetimes are None if item has no temporal data.
        If item has ``datetime`` but not ``start_datetime``/``end_datetime``,
        the single datetime is used as both start and end.
    """
    # Spatial
    bbox_raw = item_data.get("bbox")
    bbox: BoundingBox | None = None
    if bbox_raw and len(bbox_raw) >= 4:
        bbox = (float(bbox_raw[0]), float(bbox_raw[1]), float(bbox_raw[2]), float(bbox_raw[3]))

    # Temporal
    props = item_data.get("properties", {})
    start_dt = props.get("start_datetime")
    end_dt = props.get("end_datetime")
    dt = props.get("datetime")

    if not start_dt and dt:
        start_dt = dt
    if not end_dt and dt:
        end_dt = dt

    return bbox, start_dt, end_dt


def _extract_item_summaries(item_data: STACItem) -> dict[str, list[str]]:
    """Extract debrief extension properties from a STAC Item.

    Args:
        item_data: STAC Item dictionary

    Returns:
        Dictionary mapping extension property names to their values.
        Only non-null properties with list values are included.
    """
    props = item_data.get("properties", {})
    result: dict[str, list[str]] = {}
    for key in _SUMMARY_PROPERTIES:
        val = props.get(key)
        if val is not None and isinstance(val, list):
            result[key] = [str(v) for v in val if v is not None]
    return result


def _merge_extent(
    current_extent: dict | None,
    item_bbox: BoundingBox | None,
    item_start: str | None,
    item_end: str | None,
) -> dict:
    """Incrementally expand Collection extent with a new item's data.

    Args:
        current_extent: Existing extent dict (may be None for first item)
        item_bbox: New item's bounding box (may be None)
        item_start: New item's start datetime ISO string (may be None)
        item_end: New item's end datetime ISO string (may be None)

    Returns:
        Updated extent dict with spatial.bbox and temporal.interval
    """
    if current_extent is None:
        current_extent = {
            "spatial": {"bbox": [[-180, -90, 180, 90]]},
            "temporal": {"interval": [[None, None]]},
        }

    # Merge spatial
    if item_bbox is not None:
        current_bbox = current_extent["spatial"]["bbox"]
        if current_bbox and current_bbox[0] != [-180, -90, 180, 90]:
            cb = current_bbox[0]
            merged = [
                min(cb[0], item_bbox[0]),
                min(cb[1], item_bbox[1]),
                max(cb[2], item_bbox[2]),
                max(cb[3], item_bbox[3]),
            ]
            current_extent["spatial"]["bbox"] = [merged]
        else:
            current_extent["spatial"]["bbox"] = [list(item_bbox)]

    # Merge temporal
    if item_start is not None or item_end is not None:
        current_interval = current_extent["temporal"]["interval"]
        if current_interval and current_interval[0] != [None, None]:
            ci = current_interval[0]
            new_start = item_start
            new_end = item_end
            if ci[0] is not None and new_start is not None:
                merged_start = min(ci[0], new_start)
            else:
                merged_start = ci[0] or new_start
            if ci[1] is not None and new_end is not None:
                merged_end = max(ci[1], new_end)
            else:
                merged_end = ci[1] or new_end
            current_extent["temporal"]["interval"] = [[merged_start, merged_end]]
        else:
            current_extent["temporal"]["interval"] = [[item_start, item_end]]

    return current_extent


def _merge_summaries(
    current_summaries: dict | None,
    item_summaries: dict[str, list[str]],
) -> dict:
    """Incrementally merge item's extension properties into Collection summaries.

    Args:
        current_summaries: Existing summaries dict (may be None)
        item_summaries: New item's extracted summaries

    Returns:
        Updated summaries dict with sorted, deduplicated arrays
    """
    if current_summaries is None:
        current_summaries = {key: [] for key in _SUMMARY_PROPERTIES}

    for key in _SUMMARY_PROPERTIES:
        existing = set(current_summaries.get(key, []))
        new_values = set(item_summaries.get(key, []))
        merged = sorted(existing | new_values)
        current_summaries[key] = merged

    return current_summaries


def update_collection_summaries(
    catalog_data: STACCatalog,
    item_data: STACItem,
    operation: Literal["add", "update"],
    *,
    catalog_path: CatalogPath | None = None,
) -> None:
    """Update Collection summaries incrementally after an item mutation.

    Mutates catalog_data in place. If the catalog is still type "Catalog"
    (not yet promoted), triggers a full rebuild via rebuild_collection_summaries
    when catalog_path is provided.

    Note: Extension property population on items must happen BEFORE calling
    this function. See Review 7A in plan.md.

    Args:
        catalog_data: Catalog/Collection data dict (modified in place)
        item_data: The item that was added or modified
        operation: Type of mutation ("add" or "update")
        catalog_path: Path to catalog directory (required for promotion/rebuild)
    """
    # If catalog hasn't been promoted yet, do a full rebuild
    if catalog_data.get("type") == "Catalog":
        if catalog_path is not None:
            rebuild_collection_summaries(catalog_data, catalog_path)
        return

    # Incremental update for existing Collection
    bbox, start_dt, end_dt = _extract_item_extent(item_data)
    item_sums = _extract_item_summaries(item_data)

    catalog_data["extent"] = _merge_extent(catalog_data.get("extent"), bbox, start_dt, end_dt)
    catalog_data["summaries"] = _merge_summaries(catalog_data.get("summaries"), item_sums)


def rebuild_collection_summaries(
    catalog_data: STACCatalog,
    catalog_path: CatalogPath,
) -> None:
    """Full recomputation of Collection summaries from all items.

    Reads all item links, loads each item.json, and computes fresh
    extent and summaries. Promotes Catalog to Collection if needed.
    Raises PlotNotFoundError on dangling item links (Review 6B: strict failure).

    Uses dedicated link traversal: reads only item.json, not features.geojson
    (Review 9A).

    Args:
        catalog_data: Catalog/Collection data dict (modified in place)
        catalog_path: Path to the catalog directory for resolving item links
    """
    catalog_dir = Path(catalog_path)

    # Promote Catalog to Collection
    catalog_data["type"] = "Collection"
    if "license" not in catalog_data:
        catalog_data["license"] = "proprietary"

    # Collect all item data via link traversal
    extent: dict | None = None
    summaries: dict | None = None
    has_items = False

    for link in catalog_data.get("links", []):
        if link.get("rel") != "item":
            continue

        item_href = link.get("href", "")
        item_path = catalog_dir / item_href

        if not item_path.exists():
            # Extract item ID from href for error message
            item_id = item_href.split("/")[-2] if "/" in item_href else item_href
            raise PlotNotFoundError(item_id, str(catalog_dir))

        with open(item_path) as f:
            item_data: STACItem = json.load(f)

        has_items = True
        bbox, start_dt, end_dt = _extract_item_extent(item_data)
        item_sums = _extract_item_summaries(item_data)

        extent = _merge_extent(extent, bbox, start_dt, end_dt)
        summaries = _merge_summaries(summaries, item_sums)

    if has_items:
        catalog_data["extent"] = extent
        catalog_data["summaries"] = summaries
    else:
        # Zero items: clear extent/summaries but keep Collection type
        catalog_data["extent"] = {
            "spatial": {"bbox": [[-180, -90, 180, 90]]},
            "temporal": {"interval": [[None, None]]},
        }
        catalog_data["summaries"] = {key: [] for key in _SUMMARY_PROPERTIES}


def read_collection_summaries(
    path: CatalogPath,
) -> tuple[CollectionExtent, CollectionSummaries] | None:
    """Read Collection summaries without loading individual items.

    Args:
        path: Path to the catalog directory

    Returns:
        Tuple of (CollectionExtent, CollectionSummaries) if the catalog
        has been promoted to a Collection, or None if it's still a Catalog.
    """
    from debrief_stac.models import CollectionExtent, CollectionSummaries

    catalog_dir = Path(path)
    catalog_json_path = catalog_dir / "catalog.json"

    if not catalog_json_path.exists():
        return None

    with open(catalog_json_path) as f:
        catalog_data = json.load(f)

    if catalog_data.get("type") != "Collection":
        return None

    extent_data = catalog_data.get("extent")
    summaries_data = catalog_data.get("summaries")

    if extent_data is None:
        return None

    # Parse extent
    spatial_bbox = extent_data.get("spatial", {}).get("bbox", [[-180, -90, 180, 90]])
    temporal_interval = extent_data.get("temporal", {}).get("interval", [[None, None]])

    bbox_list = spatial_bbox[0] if spatial_bbox else [-180, -90, 180, 90]
    bbox_tuple: BoundingBox | None = None
    if bbox_list and bbox_list != [-180, -90, 180, 90]:
        bbox_tuple = (bbox_list[0], bbox_list[1], bbox_list[2], bbox_list[3])

    temporal = temporal_interval[0] if temporal_interval else [None, None]
    temporal_start = temporal[0] if temporal else None
    temporal_end = temporal[1] if len(temporal) > 1 else None

    extent = CollectionExtent(
        bbox=bbox_tuple,
        temporal_start=temporal_start,
        temporal_end=temporal_end,
    )

    # Parse summaries
    if summaries_data is None:
        summaries_data = {}

    summaries = CollectionSummaries(
        vessel_classes=summaries_data.get("debrief:vessel_classes", []),
        tags=summaries_data.get("debrief:tags", []),
        feature_tags=summaries_data.get("debrief:feature_tags", []),
        track_names=summaries_data.get("debrief:track_names", []),
        nationalities=summaries_data.get("debrief:nationalities", []),
    )

    return extent, summaries
