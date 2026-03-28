"""Post-import fixup for STAC data quality issues.

Addresses two problems identified in the March 2026 data quality audit:
1. Sensor-only plots that should be merged into companion track plots
2. Plots with fallback timestamps (import date) instead of real data dates

Usage:
    python -m debrief_io.fixup_stac_quality <catalog_path>
"""

from __future__ import annotations

import json
import logging
import shutil
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Manually-verified sensor -> track plot mapping from the data quality audit.
# Each entry: (sensor_plot_id, target_track_plot_id)
SENSOR_MERGE_MAP: list[tuple[str, str]] = [
    ("core--sen-frig-sensor", "core--sen-tracks"),
    ("core--sen-missing-host-sensor", "core--sen-tracks"),
    ("core--sen-ssk-freq", "core--sen-tracks"),
    ("core--sen-ssk-sensor", "core--sen-tracks"),
    ("demo-review--review2-sensor1", "demo-review--review1-tracks"),
    ("demo-review--review3-sensor2", "demo-review--review1-tracks"),
    (
        "other-formats-ta-dummy-data--freq-bluesensor",
        "other-formats-ta-dummy-data--freq-bluetrack",
    ),
    (
        "other-formats-ta-dummy-data--freq-bluesensor-nopos",
        "other-formats-ta-dummy-data--freq-bluetrack",
    ),
    (
        "s2r-2553-missing-sensor-data--bluesensorbrg",
        "s2r-2553-missing-sensor-data--bluetrack",
    ),
    ("s2r--ambig-tracks-hover-north-hm", "s2r--ambig-tracks-hover-north"),
    ("s2r--ambig-tracks-hover-north-ta", "s2r--ambig-tracks-hover-north"),
    ("s2r-freq--contact-bearings", "s2r-freq--osshipaa-3"),
    ("s2r--sensor", "s2r--nonsuch"),
    ("satc--b-rate-sensor", "satc--b-rate-ownship"),
    ("satc--bluesensor", "satc--bluetrack"),
    ("satc--l1-ownshipsensor", "satc--l1-ownshiptrack"),
    ("satc--bluesensor-sparse", "satc--bluetrack"),
]


def merge_sensor_into_track(
    catalog_path: Path,
    sensor_plot_id: str,
    track_plot_id: str,
) -> int:
    """Merge sensor features from sensor_plot into track_plot.

    Appends sensor features to the track plot's features.geojson,
    copies source assets, removes sensor plot from catalog, and
    deletes the sensor plot directory.

    Returns the number of sensor features merged.
    """
    from debrief_stac.catalog import _save_catalog, open_catalog
    from debrief_stac.features import add_features
    from debrief_stac.plot import read_plot, update_temporal_metadata

    sensor_dir = catalog_path / sensor_plot_id
    track_dir = catalog_path / track_plot_id

    if not sensor_dir.exists():
        logger.warning("Sensor plot %s not found, skipping", sensor_plot_id)
        return 0

    if not track_dir.exists():
        logger.warning("Track plot %s not found, skipping merge", track_plot_id)
        return 0

    # Load sensor features
    sensor_fc_path = sensor_dir / "features.geojson"
    if not sensor_fc_path.exists():
        logger.warning("No features.geojson in %s", sensor_plot_id)
        return 0

    with open(sensor_fc_path) as f:
        sensor_fc = json.load(f)

    sensor_features: list[dict[str, Any]] = sensor_fc.get("features", [])
    if not sensor_features:
        return 0

    # Append sensor features to track plot
    add_features(catalog_path, track_plot_id, sensor_features)

    # Copy source assets from sensor plot to track plot
    sensor_assets_dir = sensor_dir / "assets"
    track_assets_dir = track_dir / "assets"
    if sensor_assets_dir.exists():
        track_assets_dir.mkdir(parents=True, exist_ok=True)
        for asset_file in sensor_assets_dir.iterdir():
            if asset_file.is_file():
                dest = track_assets_dir / asset_file.name
                shutil.copy2(asset_file, dest)
                logger.info(
                    "Copied asset %s -> %s", asset_file.name, track_plot_id
                )

    # Copy asset metadata from sensor item.json to track item.json
    sensor_item = read_plot(catalog_path, sensor_plot_id)
    track_item = read_plot(catalog_path, track_plot_id)
    for key, asset_meta in sensor_item.get("assets", {}).items():
        if key == "features":
            continue  # Skip the features.geojson asset ref
        # Prefix to avoid key collision
        new_key = f"merged-{sensor_plot_id}-{key}"
        track_item["assets"][new_key] = asset_meta
    from debrief_stac.plot import _save_plot

    _save_plot(catalog_path, track_plot_id, track_item)

    # Recompute temporal metadata on the enriched track plot
    update_temporal_metadata(catalog_path, track_plot_id)

    # Remove sensor plot from catalog links
    catalog_data = open_catalog(catalog_path)
    catalog_data["links"] = [
        link
        for link in catalog_data.get("links", [])
        if not link.get("href", "").startswith(f"./{sensor_plot_id}/")
    ]
    _save_catalog(catalog_path, catalog_data)

    # Remove sensor plot directory
    shutil.rmtree(sensor_dir)
    logger.info(
        "Merged %d sensor features from %s into %s",
        len(sensor_features),
        sensor_plot_id,
        track_plot_id,
    )

    return len(sensor_features)


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

    # Phase 1: Merge sensor-only plots into track companions
    total_merged = 0
    for sensor_id, track_id in SENSOR_MERGE_MAP:
        count = merge_sensor_into_track(catalog_path, sensor_id, track_id)
        total_merged += count

    logger.info("Phase 1 complete: merged %d sensor features", total_merged)

    # Phase 2: Recompute temporal metadata for all plots
    updated = recompute_all_temporal_metadata(catalog_path)
    logger.info("Phase 2 complete: updated %d plot timestamps", updated)


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    if len(sys.argv) != 2:
        print("Usage: python -m debrief_io.fixup_stac_quality <catalog_path>")
        sys.exit(1)

    fixup_catalog(Path(sys.argv[1]))
