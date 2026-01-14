"""
Tests for CLI JSON-RPC handlers.

These tests verify the CLI layer correctly handles requests,
particularly edge cases not covered by lower-level unit tests.
"""

from pathlib import Path

import pytest

from debrief_stac.cli import handle_copy_asset, handle_create_plot, handle_init_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import read_plot


class TestHandleCopyAsset:
    """Tests for handle_copy_asset CLI handler."""

    def test_copy_multiple_assets_to_same_plot(self, temp_dir: Path) -> None:
        """Adding multiple source files to a plot should preserve all assets.

        Regression test: Previously, all files used the same asset_key ("source-data"),
        causing the second file to overwrite the first.
        """
        catalog_path = temp_dir / "catalog"

        # Create catalog
        handle_init_catalog({"path": str(catalog_path), "name": "Test Catalog"})

        # Create plot
        result = handle_create_plot({
            "store_path": str(catalog_path),
            "name": "Test Plot",
        })
        plot_id = result["plot_id"]

        # Create two source files
        file1 = temp_dir / "boat1.rep"
        file1.write_text("Boat 1 track data")
        file2 = temp_dir / "boat2.rep"
        file2.write_text("Boat 2 track data")

        # Add both files to the same plot
        handle_copy_asset({
            "store_path": str(catalog_path),
            "plot_id": plot_id,
            "source_path": str(file1),
            "asset_role": "source-data",
        })
        handle_copy_asset({
            "store_path": str(catalog_path),
            "plot_id": plot_id,
            "source_path": str(file2),
            "asset_role": "source-data",
        })

        # Read the plot and verify BOTH assets exist
        item = read_plot(catalog_path, plot_id)

        # Find all source-data assets
        source_assets = [
            (key, asset)
            for key, asset in item["assets"].items()
            if "source-data" in asset.get("roles", []) or "source" in asset.get("roles", [])
        ]

        # CRITICAL: Both files should be present, not just the last one
        assert len(source_assets) >= 2, (
            f"Expected at least 2 source assets, found {len(source_assets)}. "
            f"Asset keys: {list(item['assets'].keys())}"
        )

        # Verify both filenames are represented
        asset_hrefs = [asset["href"] for _, asset in source_assets]
        assert any("boat1.rep" in href for href in asset_hrefs), "boat1.rep not found in assets"
        assert any("boat2.rep" in href for href in asset_hrefs), "boat2.rep not found in assets"

    def test_copy_asset_returns_correct_path(self, temp_dir: Path) -> None:
        """handle_copy_asset should return the correct asset path and href."""
        catalog_path = temp_dir / "catalog"

        handle_init_catalog({"path": str(catalog_path), "name": "Test"})
        result = handle_create_plot({
            "store_path": str(catalog_path),
            "name": "Plot",
        })
        plot_id = result["plot_id"]

        source_file = temp_dir / "data.rep"
        source_file.write_text("Data content")

        result = handle_copy_asset({
            "store_path": str(catalog_path),
            "plot_id": plot_id,
            "source_path": str(source_file),
        })

        assert "asset_path" in result
        assert "asset_href" in result
        assert result["asset_href"] == "./assets/data.rep"
        assert Path(result["asset_path"]).exists()
