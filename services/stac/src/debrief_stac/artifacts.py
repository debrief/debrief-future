"""
Artifact storage for debrief-stac.

Writes artifact files to the results/ directory and updates STAC Item asset lists.
"""

import json
from pathlib import Path

from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import CatalogPath


def store_artifact(
    catalog_path: CatalogPath,
    plot_id: str,
    artifact_data: bytes,
    href: str,
    mime_type: str,
    label: str,
) -> dict:
    """Write an artifact file to the results/ directory and update item.json.

    Args:
        catalog_path: Path to the catalog directory
        plot_id: ID of the plot
        artifact_data: Raw artifact bytes
        href: Relative file path (e.g., "./results/bt_plot_001.png")
        mime_type: MIME type of the artifact
        label: Human-readable label for the asset entry

    Returns:
        Updated STAC Item dict with new asset entry

    Raises:
        PlotNotFoundError: If the plot doesn't exist
        ValueError: If href doesn't start with "./results/"
    """
    if not href.startswith("./results/"):
        raise ValueError(f"href must start with './results/', got: '{href}'")

    catalog_path = Path(catalog_path)
    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id

    # Write artifact file
    artifact_path = plot_dir / href.lstrip("./")
    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    artifact_path.write_bytes(artifact_data)

    # Generate asset key from filename
    asset_key = f"result-{artifact_path.stem}"

    # Update item assets
    item["assets"][asset_key] = {
        "href": href,
        "type": mime_type,
        "title": label,
        "roles": ["result"],
    }

    _save_plot(catalog_path, plot_id, item)
    return item
