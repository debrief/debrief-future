"""
Migration utilities for debrief-stac store layout.

Converts legacy flat STAC stores (all items in a shared directory)
to per-item folder structure with item.json and assets/ subfolder.
"""

import json
import re
import shutil
from pathlib import Path


def migrate_flat_store(catalog_path: Path) -> list[str]:
    """Migrate a flat STAC store to per-item folder structure.

    Detects flat structure (items as {id}.json in an items/ subdirectory
    or at catalog root), moves each item into its own folder as item.json,
    moves associated assets alongside, creates assets/ subfolder, and
    updates all href references.

    Args:
        catalog_path: Path to the catalog directory containing catalog.json

    Returns:
        List of migrated item IDs. Empty list if nothing to migrate.

    Raises:
        FileNotFoundError: If catalog.json doesn't exist
    """
    catalog_path = Path(catalog_path)
    catalog_json_path = catalog_path / "catalog.json"

    if not catalog_json_path.exists():
        raise FileNotFoundError(f"catalog.json not found at {catalog_path}")

    with open(catalog_json_path) as f:
        catalog = json.load(f)

    migrated: list[str] = []
    dirs_to_clean: set[Path] = set()

    for link in catalog.get("links", []):
        if link.get("rel") != "item":
            continue

        href = link["href"]

        # Skip items already in per-item folder structure: ./{id}/item.json
        if re.match(r"^\./[^/]+/item\.json$", href):
            continue

        # Resolve the item file path
        item_file = (catalog_path / href).resolve()
        if not item_file.exists():
            continue

        # Read item to get ID
        with open(item_file) as f:
            item_data = json.load(f)

        item_id = item_data["id"]
        source_dir = item_file.parent

        # Track source directory for cleanup
        if source_dir != catalog_path:
            dirs_to_clean.add(source_dir)

        # Create per-item directory
        item_dir = catalog_path / item_id
        item_dir.mkdir(parents=True, exist_ok=True)

        # Move associated files (geojson assets referenced by the item)
        for asset_info in item_data.get("assets", {}).values():
            asset_href = asset_info.get("href", "")
            asset_source = (source_dir / asset_href).resolve()
            if asset_source.exists() and asset_source.parent == source_dir:
                asset_dest = item_dir / asset_source.name
                if not asset_dest.exists():
                    shutil.move(str(asset_source), str(asset_dest))

        # Update item links
        for item_link in item_data.get("links", []):
            if item_link["rel"] == "self":
                item_link["href"] = "./item.json"
            elif item_link["rel"] in ("root", "parent"):
                item_link["href"] = "../catalog.json"

        # Write item.json to new location
        with open(item_dir / "item.json", "w") as f:
            json.dump(item_data, f, indent=2)

        # Remove old item JSON file
        if item_file.exists():
            item_file.unlink()

        # Create assets/ subdirectory
        (item_dir / "assets").mkdir(exist_ok=True)

        # Update catalog link
        link["href"] = f"./{item_id}/item.json"

        migrated.append(item_id)

    # Save updated catalog
    if migrated:
        with open(catalog_json_path, "w") as f:
            json.dump(catalog, f, indent=2)

    # Clean up empty source directories
    for d in dirs_to_clean:
        if d.exists() and not any(d.iterdir()):
            d.rmdir()

    return migrated
