"""Post-import fixup for STAC data quality issues.

Recomputes temporal metadata for all plots in a catalog.

Note: Sensor-plot merging was previously handled here but is now done
during import (see import_catalog._merge_deferred_sensors). DSF sensor
data is embedded into companion tracks' properties.sensors arrays by
the import pipeline.

Usage:
    python -m debrief_io.fixup_stac_quality <catalog_path>
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def recompute_all_temporal_metadata(catalog_path: Path) -> int:
    """Recompute temporal metadata for all plots in the catalog.

    Returns the number of plots that had their timestamps updated.
    """
    from debrief_stac.plot import update_temporal_metadata

    updated = 0
    for plot_dir in sorted(catalog_path.iterdir()):
        if not plot_dir.is_dir():
            continue
        item_path = plot_dir / "item.json"
        if not item_path.exists():
            continue

        plot_id = plot_dir.name
        result = update_temporal_metadata(catalog_path, plot_id)
        if result is not None:
            updated += 1
            logger.info(
                "Updated %s: %s to %s",
                plot_id,
                result.start_datetime,
                result.end_datetime,
            )

    return updated


def fixup_catalog(catalog_path: Path) -> None:
    """Run all fixups on a STAC catalog."""
    catalog_path = Path(catalog_path)

    if not catalog_path.exists():
        raise FileNotFoundError(f"Catalog not found: {catalog_path}")

    # Recompute temporal metadata for all plots
    updated = recompute_all_temporal_metadata(catalog_path)
    logger.info("Temporal fixup complete: updated %d plot timestamps", updated)


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    if len(sys.argv) != 2:
        print("Usage: python -m debrief_io.fixup_stac_quality <catalog_path>")
        sys.exit(1)

    fixup_catalog(Path(sys.argv[1]))
