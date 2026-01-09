"""
STAC Catalog operations for debrief-stac.

This module provides functions for creating and managing local STAC catalogs.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from debrief_stac.exceptions import CatalogExistsError, CatalogNotFoundError
from debrief_stac.models import PlotSummary
from debrief_stac.types import (
    STAC_VERSION,
    CatalogPath,
    STACCatalog,
)


def create_catalog(
    path: CatalogPath,
    catalog_id: Optional[str] = None,
    description: str = "Debrief analysis catalog",
) -> Path:
    """Create a new local STAC catalog at the specified path.

    Creates the directory structure and a valid catalog.json file
    with the correct STAC specification version.

    Args:
        path: Directory path where the catalog will be created
        catalog_id: Unique identifier for the catalog (defaults to directory name)
        description: Human-readable description of the catalog

    Returns:
        Path to the created catalog directory

    Raises:
        CatalogExistsError: If a catalog already exists at the path
        PermissionError: If the path is not writable

    Example:
        >>> catalog_path = create_catalog("/data/analysis", catalog_id="exercise-alpha")
        >>> print(f"Catalog created at: {catalog_path}")
    """
    catalog_path = Path(path)

    # Check if catalog already exists
    catalog_json_path = catalog_path / "catalog.json"
    if catalog_json_path.exists():
        raise CatalogExistsError(str(catalog_path))

    # Create directory structure (including parents)
    catalog_path.mkdir(parents=True, exist_ok=True)

    # Use directory name as default catalog ID
    if catalog_id is None:
        catalog_id = catalog_path.name

    # Build STAC catalog structure
    catalog_data: STACCatalog = {
        "type": "Catalog",
        "stac_version": STAC_VERSION,
        "id": catalog_id,
        "description": description,
        "links": [
            {
                "rel": "root",
                "href": "./catalog.json",
                "type": "application/json"
            },
            {
                "rel": "self",
                "href": "./catalog.json",
                "type": "application/json"
            },
        ]
    }

    # Write catalog.json
    with open(catalog_json_path, "w") as f:
        json.dump(catalog_data, f, indent=2)

    return catalog_path


def open_catalog(path: CatalogPath) -> STACCatalog:
    """Open an existing STAC catalog and return its data.

    Args:
        path: Path to the catalog directory

    Returns:
        Dictionary containing the parsed catalog.json data

    Raises:
        CatalogNotFoundError: If no catalog exists at the path

    Example:
        >>> catalog = open_catalog("/data/analysis")
        >>> print(f"Opened catalog: {catalog['id']}")
    """
    catalog_path = Path(path)
    catalog_json_path = catalog_path / "catalog.json"

    if not catalog_json_path.exists():
        raise CatalogNotFoundError(str(catalog_path))

    with open(catalog_json_path) as f:
        catalog_data: STACCatalog = json.load(f)

    return catalog_data


def _save_catalog(path: CatalogPath, catalog_data: STACCatalog) -> None:
    """Save catalog data back to disk.

    Internal function used after modifying catalog links.

    Args:
        path: Path to the catalog directory
        catalog_data: Catalog data to save
    """
    catalog_path = Path(path)
    catalog_json_path = catalog_path / "catalog.json"

    with open(catalog_json_path, "w") as f:
        json.dump(catalog_data, f, indent=2)


def _add_item_link(catalog_data: STACCatalog, item_id: str, item_href: str) -> None:
    """Add a link to a STAC Item in the catalog.

    Internal function used when creating plots.

    Args:
        catalog_data: Catalog data dictionary (modified in place)
        item_id: ID of the item being linked
        item_href: Relative path to the item
    """
    # Check if link already exists
    for link in catalog_data["links"]:
        if link.get("rel") == "item" and link.get("href") == item_href:
            return  # Already exists

    catalog_data["links"].append({
        "rel": "item",
        "href": item_href,
        "type": "application/geo+json",
        "title": item_id
    })


def list_plots(path: CatalogPath) -> list[PlotSummary]:
    """List all plots in a catalog with summary information.

    Returns plots sorted by datetime descending (newest first).

    Args:
        path: Path to the catalog directory

    Returns:
        List of PlotSummary objects with id, title, datetime, feature_count

    Raises:
        CatalogNotFoundError: If no catalog exists at the path

    Example:
        >>> plots = list_plots("/data/analysis")
        >>> for plot in plots:
        ...     print(f"{plot.title} ({plot.id})")
    """
    catalog_path = Path(path)
    catalog_data = open_catalog(catalog_path)

    summaries: list[PlotSummary] = []

    # Find all item links
    for link in catalog_data.get("links", []):
        if link.get("rel") != "item":
            continue

        # Load the item
        item_href = link.get("href", "")
        item_path = catalog_path / item_href

        if not item_path.exists():
            continue

        with open(item_path) as f:
            item_data = json.load(f)

        # Extract summary info
        properties = item_data.get("properties", {})
        dt_str = properties.get("datetime")

        # Parse datetime
        if dt_str:
            dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
        else:
            dt = datetime.now()

        # Count features if available
        feature_count = 0
        if "features" in item_data.get("assets", {}):
            features_href = item_data["assets"]["features"].get("href", "")
            features_path = item_path.parent / features_href
            if features_path.exists():
                with open(features_path) as f:
                    fc = json.load(f)
                    feature_count = len(fc.get("features", []))

        summary = PlotSummary(
            id=item_data.get("id", ""),
            title=properties.get("title", "Untitled"),
            timestamp=dt,
            feature_count=feature_count,
        )
        summaries.append(summary)

    # Sort by datetime descending (newest first)
    summaries.sort(key=lambda s: s.timestamp, reverse=True)

    return summaries
