"""
Thumbnail storage for debrief-stac.

Writes thumbnail PNG files to the item directory and updates STAC Item asset lists.
"""

from pathlib import Path

from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import CatalogPath


def store_thumbnail(
    catalog_path: CatalogPath,
    plot_id: str,
    large_png: bytes,
    small_png: bytes,
) -> dict:
    """Write thumbnail PNG files and update STAC item metadata.

    Args:
        catalog_path: Path to the catalog directory.
        plot_id: ID of the plot (STAC item).
        large_png: Raw PNG bytes for 800x600 thumbnail.
        small_png: Raw PNG bytes for 200x150 thumbnail.

    Returns:
        Updated STAC Item dict with new thumbnail asset entries.

    Raises:
        PlotNotFoundError: If the plot doesn't exist.
    """
    catalog_path = Path(catalog_path)
    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id

    # Write thumbnail files to item root directory
    large_path = plot_dir / "thumbnail.png"
    large_path.write_bytes(large_png)

    small_path = plot_dir / "thumbnail-sm.png"
    small_path.write_bytes(small_png)

    # Update item assets (idempotent — overwrites existing entries)
    item["assets"]["thumbnail"] = {
        "href": "./thumbnail.png",
        "type": "image/png",
        "title": "Plot thumbnail",
        "roles": ["thumbnail"],
    }
    item["assets"]["thumbnail-sm"] = {
        "href": "./thumbnail-sm.png",
        "type": "image/png",
        "title": "Plot thumbnail (small)",
        "roles": ["thumbnail"],
    }

    _save_plot(catalog_path, plot_id, item)
    return item
