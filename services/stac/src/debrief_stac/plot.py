"""
STAC Item (Plot) operations for debrief-stac.

This module provides functions for creating and reading plots,
which are represented as STAC Items within a catalog.
"""

import json
import uuid
from pathlib import Path

from debrief_stac.catalog import _add_item_link, _save_catalog, open_catalog
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.models import PlotMetadata, TemporalExtent
from debrief_stac.types import (
    STAC_VERSION,
    CatalogPath,
    STACItem,
)


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

    # Create plot directory
    plot_dir = catalog_path / plot_id
    plot_dir.mkdir(parents=True, exist_ok=True)

    # Build STAC Item structure
    item_data: STACItem = {
        "type": "Feature",
        "stac_version": STAC_VERSION,
        "stac_extensions": [],
        "id": plot_id,
        "geometry": None,  # Updated when features are added
        "bbox": None,  # Updated when features are added
        "properties": {
            "title": metadata.title,
            "datetime": metadata.timestamp.isoformat(),
        },
        "links": [
            {"rel": "root", "href": "../catalog.json", "type": "application/json"},
            {"rel": "parent", "href": "../catalog.json", "type": "application/json"},
            {"rel": "self", "href": "./item.json", "type": "application/geo+json"},
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
    _add_item_link(catalog_data, plot_id, item_href)

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
    """Compute temporal extent from track features and update the STAC Item.

    Scans the plot's features.geojson for TRACK features with start_time/end_time
    properties, computes the global min/max, and writes datetime, start_datetime,
    end_datetime to the item properties.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to update

    Returns:
        TemporalExtent if tracks with temporal data found, None otherwise
    """
    catalog_path = Path(catalog_path)
    item = read_plot(catalog_path, plot_id)

    # Load features.geojson
    features_path = catalog_path / plot_id / "features.geojson"
    if not features_path.exists():
        return None

    with open(features_path) as f:
        fc = json.load(f)

    # Scan TRACK features for temporal data
    start_times: list[str] = []
    end_times: list[str] = []

    for feature in fc.get("features", []):
        props = feature.get("properties") or {}
        if props.get("kind") != "TRACK":
            continue
        st = props.get("start_time")
        et = props.get("end_time")
        if st and et:
            start_times.append(st)
            end_times.append(et)

    if not start_times:
        return None

    earliest = min(start_times)
    latest = max(end_times)

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

    Internal function used after modifying plot assets or properties.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        item_data: Updated item data to save
    """
    catalog_path = Path(catalog_path)
    plot_dir = catalog_path / plot_id
    item_path = plot_dir / "item.json"

    with open(item_path, "w") as f:
        json.dump(item_data, f, indent=2)
