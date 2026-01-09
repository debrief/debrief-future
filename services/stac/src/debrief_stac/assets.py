"""
Asset operations for debrief-stac.

This module provides functions for managing source file assets
with provenance tracking per Constitution Article III.
"""

import mimetypes
import shutil
from pathlib import Path
from typing import Optional

from debrief_stac.models import AssetProvenance
from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import (
    ASSET_ROLE_SOURCE,
    MEDIA_TYPE_JSON,
    AssetPath,
    CatalogPath,
)


def add_asset(
    catalog_path: CatalogPath,
    plot_id: str,
    source_path: AssetPath,
    asset_key: Optional[str] = None,
    media_type: Optional[str] = None,
) -> str:
    """Add a source file as an asset to a plot.

    Copies the source file to the plot's assets directory and records
    it as a STAC asset with provenance metadata (source path, timestamp,
    tool version) per Constitution Article III.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot to add asset to
        source_path: Path to the source file to copy
        asset_key: Optional key for the asset (defaults to "source-{filename}")
        media_type: Optional MIME type (auto-detected if not provided)

    Returns:
        The asset key used

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        FileNotFoundError: If the source file doesn't exist

    Example:
        >>> add_asset("/data/catalog", "my-plot", "/path/to/file.rep")
        'source-file'
    """
    catalog_path = Path(catalog_path)
    source_path = Path(source_path)

    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    # Read current plot
    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id

    # Create assets directory
    assets_dir = plot_dir / "assets"
    assets_dir.mkdir(exist_ok=True)

    # Generate asset key if not provided
    if asset_key is None:
        asset_key = f"source-{source_path.stem}"

    # Copy file to assets directory
    dest_path = assets_dir / source_path.name
    shutil.copy2(source_path, dest_path)

    # Detect media type
    if media_type is None:
        media_type, _ = mimetypes.guess_type(str(source_path))
        if media_type is None:
            media_type = "application/octet-stream"

    # Create provenance metadata
    provenance = AssetProvenance(source_path=str(source_path.absolute()))

    # Create STAC asset entry
    item["assets"][asset_key] = {
        "href": f"./assets/{source_path.name}",
        "type": media_type,
        "title": source_path.name,
        "roles": [ASSET_ROLE_SOURCE],
        "debrief:provenance": provenance.model_dump(mode="json")
    }

    # Save updated item
    _save_plot(catalog_path, plot_id, item)

    return asset_key
