"""
STAC Item (Plot) operations for debrief-stac.

This module provides functions for creating and reading plots,
which are represented as STAC Items within a catalog.
"""

import json
import re
import uuid
from pathlib import Path
from typing import Any

from debrief_stac._helpers import (
    DEFAULT_PROVIDERS,
    STAC_EXTENSION_DEBRIEF,
    STAC_EXTENSION_FILE,
    STAC_EXTENSION_PROCESSING,
    iso_now_utc,
)
from debrief_stac.catalog import _add_item_link, _save_catalog, open_catalog
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.models import PlotMetadata, TemporalExtent
from debrief_stac.types import (
    STAC_VERSION,
    CatalogPath,
    STACItem,
)

# Default Item-level metadata required by STAC 1.1.0 + best practices (spec 241).
_DEFAULT_LICENSE = "other"
_DEFAULT_STAC_EXTENSIONS: list[str] = [
    STAC_EXTENSION_DEBRIEF,
    STAC_EXTENSION_PROCESSING,
    STAC_EXTENSION_FILE,
]


def create_plot(
    catalog_path: CatalogPath,
    metadata: PlotMetadata,
    plot_id: str | None = None,
) -> str:
    """Create a new plot (STAC Item) within a catalog.

    Creates a new directory for the plot with an item.json file
    containing the STAC Item structure. Updates the catalog links
    to include the new plot.

    Args:
        catalog_path: Path to the catalog directory
        metadata: PlotMetadata with title, description, and timestamp
        plot_id: Optional custom ID (defaults to UUID)

    Returns:
        The plot ID (either provided or generated)

    Raises:
        CatalogNotFoundError: If the catalog doesn't exist

    Example:
        >>> metadata = PlotMetadata(title="Day 1 Analysis")
        >>> plot_id = create_plot("/data/catalog", metadata)
        >>> print(f"Created plot: {plot_id}")
    """
    catalog_path = Path(catalog_path)

    # Load catalog (validates it exists)
    catalog_data = open_catalog(catalog_path)

    # Generate plot ID if not provided
    if plot_id is None:
        plot_id = str(uuid.uuid4())
    elif not re.fullmatch(r"[a-z0-9_-]+", plot_id):
        raise ValueError(
            f"plot_id must contain only lowercase letters, digits, underscores, "
            f"and hyphens ([a-z0-9_-]), got: {plot_id!r}"
        )

    # Create plot directory
    plot_dir = catalog_path / plot_id
    plot_dir.mkdir(parents=True, exist_ok=True)

    now = iso_now_utc()

    # Build STAC Item structure (spec 241 — STAC 1.1.0 with standard metadata
    # extensions).  Note: bbox is omitted (rather than null) when geometry is
    # absent, since STAC 1.1's Item Schema forbids `null` bbox.
    item_data: STACItem = {
        "type": "Feature",
        "stac_version": STAC_VERSION,
        "stac_extensions": list(_DEFAULT_STAC_EXTENSIONS),
        "id": plot_id,
        "geometry": None,  # Updated when features are added
        "properties": {
            "title": metadata.title,
            "datetime": metadata.timestamp.isoformat(),
            "created": now,
            "updated": now,
            "license": _DEFAULT_LICENSE,
            "providers": [dict(p) for p in DEFAULT_PROVIDERS],
        },
        "links": [
            {
                "rel": "root",
                "href": "../catalog.json",
                "type": "application/json",
                "title": "Root catalog",
            },
            {
                "rel": "parent",
                "href": "../catalog.json",
                "type": "application/json",
                "title": "Parent catalog",
            },
            {
                "rel": "self",
                "href": "./item.json",
                "type": "application/geo+json",
                "title": metadata.title,
            },
        ],
        "assets": {},
    }

    # Add description if provided
    if metadata.description:
        item_data["properties"]["description"] = metadata.description

    # Write item.json
    item_path = plot_dir / "item.json"
    with open(item_path, "w") as f:
        json.dump(item_data, f, indent=2)

    # Update catalog links
    item_href = f"./{plot_id}/item.json"
    _add_item_link(catalog_data, plot_id, item_href, title=metadata.title)

    # Update Collection summaries (promotes Catalog→Collection if needed)
    from debrief_stac.collection import update_collection_summaries

    update_collection_summaries(catalog_data, item_data, "add", catalog_path=catalog_path)

    _save_catalog(catalog_path, catalog_data)

    return plot_id


def read_plot(catalog_path: CatalogPath, plot_id: str) -> STACItem:
    """Read a plot (STAC Item) from a catalog.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to read

    Returns:
        Dictionary containing the STAC Item data

    Raises:
        PlotNotFoundError: If the plot doesn't exist

    Example:
        >>> item = read_plot("/data/catalog", "my-plot-id")
        >>> print(f"Plot title: {item['properties']['title']}")
    """
    catalog_path = Path(catalog_path)
    plot_dir = catalog_path / plot_id
    item_path = plot_dir / "item.json"

    if not item_path.exists():
        raise PlotNotFoundError(plot_id, str(catalog_path))

    with open(item_path) as f:
        item_data: STACItem = json.load(f)

    return item_data


def update_temporal_metadata(
    catalog_path: CatalogPath,
    plot_id: str,
) -> TemporalExtent | None:
    """Compute temporal extent from all features and update the STAC Item.

    Scans the plot's features.geojson for temporal data across all feature
    types: TRACK (start_time/end_time), sensor contacts and narratives
    (time), and annotations (time_start/time_end). Computes the global
    min/max and writes datetime, start_datetime, end_datetime to the item.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to update

    Returns:
        TemporalExtent if features with temporal data found, None otherwise
    """
    catalog_path = Path(catalog_path)
    item = read_plot(catalog_path, plot_id)

    # Load features.geojson
    features_path = catalog_path / plot_id / "features.geojson"
    if not features_path.exists():
        return None

    with open(features_path) as f:
        fc = json.load(f)

    # Collect all timestamps from all feature types
    all_times: list[str] = []

    for feature in fc.get("features", []):
        props = feature.get("properties") or {}
        kind = props.get("kind", "")

        if kind == "TRACK":
            # Tracks have explicit start/end range
            st = props.get("start_time")
            et = props.get("end_time")
            if st:
                all_times.append(st)
            if et:
                all_times.append(et)
        else:
            # Sensor contacts, narratives: "time" or "timestamp" property
            t = props.get("time") or props.get("timestamp")
            if t:
                all_times.append(t)
            # Annotations (PERIODTEXT, TIMETEXT, etc.): time_start/time_end
            ts = props.get("time_start")
            te = props.get("time_end")
            if ts:
                all_times.append(ts)
            if te:
                all_times.append(te)

    if not all_times:
        return None

    earliest = min(all_times)
    latest = max(all_times)

    # Update item properties
    item["properties"]["datetime"] = earliest
    item["properties"]["start_datetime"] = earliest
    item["properties"]["end_datetime"] = latest

    _save_plot(catalog_path, plot_id, item)

    # Update collection extent
    from debrief_stac.catalog import _save_catalog, open_catalog
    from debrief_stac.collection import update_collection_summaries

    catalog_data = open_catalog(catalog_path)
    update_collection_summaries(catalog_data, item, "update", catalog_path=catalog_path)
    _save_catalog(catalog_path, catalog_data)

    return TemporalExtent(
        datetime=earliest,
        start_datetime=earliest,
        end_datetime=latest,
    )


def _save_plot(catalog_path: CatalogPath, plot_id: str, item_data: STACItem) -> None:
    """Save plot data back to disk.

    Refreshes ``properties.updated`` (RFC 3339 UTC) on every write per
    spec 241 FR-003.  ``properties.created`` is preserved if present;
    backfilled from on-disk Item if missing (defensive — handles items
    written before spec 241 landed without overwriting their lineage).

    Internal function used after modifying plot assets or properties.
    """
    catalog_path = Path(catalog_path)
    plot_dir = catalog_path / plot_id
    item_path = plot_dir / "item.json"

    properties: dict[str, Any] = item_data.setdefault("properties", {})

    # Preserve created across edits — fall back to current file's value if the
    # in-memory item doesn't have one; only mint a fresh value if neither
    # source has one (e.g. fresh creation flowing through this same write path).
    if "created" not in properties:
        if item_path.exists():
            try:
                with open(item_path) as f:
                    existing = json.load(f)
                existing_created = (
                    existing.get("properties", {}).get("created")
                    if isinstance(existing, dict)
                    else None
                )
                if existing_created:
                    properties["created"] = existing_created
            except (json.JSONDecodeError, OSError):
                pass
        if "created" not in properties:
            properties["created"] = iso_now_utc()

    properties["updated"] = iso_now_utc()

    with open(item_path, "w") as f:
        json.dump(item_data, f, indent=2)
