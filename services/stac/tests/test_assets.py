"""
Tests for asset operations (User Story 5).

Following TDD: Write tests first, ensure they fail, then implement.
"""

from pathlib import Path

from debrief_stac.assets import add_asset
from debrief_stac.catalog import create_catalog
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot
from debrief_stac.types import ASSET_ROLE_SOURCE


class TestAddAsset:
    """Tests for add_asset() function - User Story 5."""

    def test_add_asset_copies_file(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T041: Given a source file path and plot,
        When add_asset() is called, Then file is copied to plot's assets directory.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Create a source file
        source_file = temp_dir / "source.rep"
        source_file.write_text("Sample REP data content")

        add_asset(catalog_path, plot_id, source_file)

        # Verify file copied to assets directory
        assets_dir = catalog_path / plot_id / "assets"
        assert assets_dir.exists()
        copied_file = assets_dir / "source.rep"
        assert copied_file.exists()
        assert copied_file.read_text() == "Sample REP data content"

    def test_add_asset_creates_stac_asset_reference(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T042: Given an added asset,
        When plot is read, Then asset appears in STAC Item assets.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        source_file = temp_dir / "data.rep"
        source_file.write_text("REP content")

        add_asset(catalog_path, plot_id, source_file, asset_key="original-rep")

        item = read_plot(catalog_path, plot_id)

        assert "original-rep" in item["assets"]
        asset = item["assets"]["original-rep"]
        assert asset["href"].endswith("data.rep")
        assert ASSET_ROLE_SOURCE in asset["roles"]

    def test_add_asset_records_provenance(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T043: Given an asset with provenance metadata,
        When added, Then provenance is stored in asset's extra fields.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        source_file = temp_dir / "exercise.rep"
        source_file.write_text("Exercise data")

        add_asset(catalog_path, plot_id, source_file)

        item = read_plot(catalog_path, plot_id)

        # Find the source asset
        source_assets = [
            (k, v) for k, v in item["assets"].items()
            if ASSET_ROLE_SOURCE in v.get("roles", [])
        ]
        assert len(source_assets) == 1

        _, asset = source_assets[0]

        # Check provenance fields
        assert "debrief:provenance" in asset
        provenance = asset["debrief:provenance"]
        assert "source_path" in provenance
        assert "load_timestamp" in provenance
        assert "tool_version" in provenance

    def test_add_asset_with_custom_key(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """add_asset with custom asset_key uses that key."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        source_file = temp_dir / "custom.rep"
        source_file.write_text("Custom content")

        add_asset(
            catalog_path, plot_id, source_file,
            asset_key="my-custom-source"
        )

        item = read_plot(catalog_path, plot_id)
        assert "my-custom-source" in item["assets"]

    def test_add_multiple_assets(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """Multiple assets can be added to a plot."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Add two source files
        file1 = temp_dir / "file1.rep"
        file1.write_text("File 1")
        file2 = temp_dir / "file2.rep"
        file2.write_text("File 2")

        add_asset(catalog_path, plot_id, file1, asset_key="source-1")
        add_asset(catalog_path, plot_id, file2, asset_key="source-2")

        item = read_plot(catalog_path, plot_id)
        assert "source-1" in item["assets"]
        assert "source-2" in item["assets"]
