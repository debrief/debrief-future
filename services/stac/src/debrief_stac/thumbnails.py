"""
Thumbnail storage for debrief-stac.

Writes thumbnail PNG files to the item directory and updates STAC Item asset
lists.  Per spec 241, this module is the single asset-writing seam for
plot-level thumbnails: the small variant (200x150) is stored at
``assets.thumbnail`` and the large variant (800x600) is stored at
``assets.overview``, both with ``proj:shape``, ``file:size``, and
``file:checksum`` per the file-info / projection extensions.
"""

from pathlib import Path

from debrief_stac._helpers import multihash_sha256_bytes
from debrief_stac.plot import _save_plot, read_plot
from debrief_stac.types import CatalogPath, STACItem


def store_thumbnail(
    catalog_path: CatalogPath,
    plot_id: str,
    large_png: bytes,
    small_png: bytes,
) -> STACItem:
    """Write thumbnail PNG files and update STAC item metadata.

    Writes ``thumbnail.png`` (200x150 from ``small_png``) and ``overview.png``
    (800x600 from ``large_png``) to the item directory and registers them
    under ``assets.thumbnail`` and ``assets.overview`` respectively.

    The legacy ``thumbnail-sm`` asset key is removed (callers must read the
    new keys; the TS reader rename is enforced by tsc strict mode).

    Args:
        catalog_path: Path to the catalog directory.
        plot_id: ID of the plot (STAC item).
        large_png: Raw PNG bytes for 800x600 overview.
        small_png: Raw PNG bytes for 200x150 thumbnail.

    Returns:
        Updated STAC Item dict with new thumbnail/overview asset entries.

    Raises:
        PlotNotFoundError: If the plot doesn't exist.
    """
    catalog_path = Path(catalog_path)
    item = read_plot(catalog_path, plot_id)
    plot_dir = catalog_path / plot_id

    # Write PNGs to item root directory.  Naming is part of the contract:
    # thumbnail.png == small (200x150), overview.png == large (800x600).
    small_path = plot_dir / "thumbnail.png"
    small_path.write_bytes(small_png)

    large_path = plot_dir / "overview.png"
    large_path.write_bytes(large_png)

    # Drop the legacy small-variant key if it was written by an older code
    # path; idempotent on fresh items.
    item["assets"].pop("thumbnail-sm", None)

    item["assets"]["thumbnail"] = {
        "href": "./thumbnail.png",
        "type": "image/png",
        "title": "Plot thumbnail (200×150)",
        "roles": ["thumbnail"],
        "proj:shape": [150, 200],  # [height, width]
        "file:size": len(small_png),
        "file:checksum": multihash_sha256_bytes(small_png),
    }
    item["assets"]["overview"] = {
        "href": "./overview.png",
        "type": "image/png",
        "title": "Plot overview (800×600)",
        "roles": ["overview"],
        "proj:shape": [600, 800],
        "file:size": len(large_png),
        "file:checksum": multihash_sha256_bytes(large_png),
    }

    _save_plot(catalog_path, plot_id, item)
    return item
