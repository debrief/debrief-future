"""Tests for STAC output validation against official STAC specification (T071).

Validates that all STAC outputs conform to STAC 1.0.0 specification.
Network-dependent tests (using stac-validator) are skipped in offline environments.
Structural validation tests always run.
"""

import json
from pathlib import Path

import pytest

# Check if network is available for stac-validator tests
try:
    import urllib.request

    from stac_validator import stac_validator

    urllib.request.urlopen("https://schemas.stacspec.org", timeout=2)
    NETWORK_AVAILABLE = True
except Exception:
    NETWORK_AVAILABLE = False
    stac_validator = None

network_required = pytest.mark.skipif(
    not NETWORK_AVAILABLE, reason="Network unavailable - stac-validator requires schema fetch"
)


class TestSTACCatalogValidation:
    """Tests that validate catalog.json against STAC spec."""

    @network_required
    def test_catalog_json_is_valid_stac(self, tmp_path: Path) -> None:
        """Test that generated catalog.json passes STAC validation."""
        from debrief_stac.catalog import create_catalog

        catalog_path = create_catalog(
            tmp_path / "validated_catalog",
            catalog_id="validation-test",
            description="Catalog for STAC validation testing",
        )

        catalog_json_path = catalog_path / "catalog.json"
        assert catalog_json_path.exists()

        # Validate against STAC spec
        stac = stac_validator.StacValidate(str(catalog_json_path))
        stac.run()

        assert stac.valid, f"Catalog validation failed: {stac.message}"

    @network_required
    def test_catalog_with_plots_is_valid_stac(self, tmp_path: Path) -> None:
        """Test that catalog with item links passes validation."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")

        # Add multiple plots
        for i in range(3):
            metadata = PlotMetadata(title=f"Plot {i}")
            create_plot(catalog_path, metadata)

        catalog_json_path = catalog_path / "catalog.json"
        stac = stac_validator.StacValidate(str(catalog_json_path))
        stac.run()

        assert stac.valid, f"Catalog with plots validation failed: {stac.message}"


class TestSTACItemValidation:
    """Tests that validate STAC Items (plots) against STAC spec."""

    @network_required
    def test_item_json_is_valid_stac(self, tmp_path: Path) -> None:
        """Test that generated STAC Item passes STAC validation."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(
            title="Validation Test Plot",
            description="Plot for STAC validation testing",
        )
        plot_id = create_plot(catalog_path, metadata)

        item_json_path = catalog_path / plot_id / "item.json"
        assert item_json_path.exists()

        # Validate against STAC spec
        stac = stac_validator.StacValidate(str(item_json_path))
        stac.run()

        assert stac.valid, f"Item validation failed: {stac.message}"

    @network_required
    def test_item_with_features_is_valid_stac(self, tmp_path: Path) -> None:
        """Test that STAC Item with features and bbox passes validation."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Features Test Plot")
        plot_id = create_plot(catalog_path, metadata)

        # Add features to update bbox and geometry
        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-5.0, 50.0], [-4.0, 51.0], [-3.0, 50.5]],
                },
                "properties": {"name": "Track Alpha"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-4.5, 50.5]},
                "properties": {"name": "Reference Point"},
            },
        ]
        add_features(catalog_path, plot_id, features)

        item_json_path = catalog_path / plot_id / "item.json"

        # Validate against STAC spec
        stac = stac_validator.StacValidate(str(item_json_path))
        stac.run()

        assert stac.valid, f"Item with features validation failed: {stac.message}"

    @network_required
    def test_item_with_assets_is_valid_stac(self, tmp_path: Path) -> None:
        """Test that STAC Item with assets passes validation."""
        from debrief_stac.assets import add_asset
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Assets Test Plot")
        plot_id = create_plot(catalog_path, metadata)

        # Add a source asset
        source_file = tmp_path / "test_data.rep"
        source_file.write_text("Sample REP data")
        add_asset(catalog_path, plot_id, source_file)

        item_json_path = catalog_path / plot_id / "item.json"

        # Validate against STAC spec
        stac = stac_validator.StacValidate(str(item_json_path))
        stac.run()

        assert stac.valid, f"Item with assets validation failed: {stac.message}"


class TestSTACFullWorkflowValidation:
    """Integration tests validating complete workflow outputs."""

    @network_required
    def test_full_workflow_produces_valid_stac(self, tmp_path: Path) -> None:
        """Test that a complete workflow produces valid STAC throughout."""
        from debrief_stac.assets import add_asset
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        # Create catalog
        catalog_path = create_catalog(
            tmp_path / "full_workflow",
            catalog_id="full-workflow-test",
            description="Full workflow STAC validation",
        )

        # Create multiple plots with full data
        for i in range(3):
            metadata = PlotMetadata(
                title=f"Analysis Plot {i + 1}",
                description=f"Plot {i + 1} description",
            )
            plot_id = create_plot(catalog_path, metadata)

            # Add features
            features = [
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [i, i]},
                    "properties": {"index": i},
                }
            ]
            add_features(catalog_path, plot_id, features)

            # Add asset
            asset_file = tmp_path / f"data_{i}.txt"
            asset_file.write_text(f"Data for plot {i}")
            add_asset(catalog_path, plot_id, asset_file)

        # Validate catalog
        catalog_stac = stac_validator.StacValidate(str(catalog_path / "catalog.json"))
        catalog_stac.run()
        assert catalog_stac.valid, f"Catalog validation failed: {catalog_stac.message}"

        # Validate all items
        for item_dir in catalog_path.iterdir():
            if item_dir.is_dir():
                item_json = item_dir / "item.json"
                if item_json.exists():
                    item_stac = stac_validator.StacValidate(str(item_json))
                    item_stac.run()
                    assert item_stac.valid, (
                        f"Item {item_dir.name} validation failed: {item_stac.message}"
                    )

    def test_stac_version_is_1_0_0(self, tmp_path: Path) -> None:
        """Test that STAC outputs use version 1.0.0."""
        import json

        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "version_test")
        metadata = PlotMetadata(title="Version Test")
        plot_id = create_plot(catalog_path, metadata)

        # Check catalog version
        with open(catalog_path / "catalog.json") as f:
            catalog = json.load(f)
        assert catalog["stac_version"] == "1.0.0"

        # Check item version
        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)
        assert item["stac_version"] == "1.0.0"


class TestSTACStructuralValidation:
    """Offline structural validation tests (no network required)."""

    def test_catalog_has_required_fields(self, tmp_path: Path) -> None:
        """Test that catalog.json has all required STAC fields."""
        from debrief_stac.catalog import create_catalog

        catalog_path = create_catalog(tmp_path / "catalog", catalog_id="test")

        with open(catalog_path / "catalog.json") as f:
            catalog = json.load(f)

        # Required STAC Catalog fields
        assert catalog["type"] == "Catalog"
        assert catalog["stac_version"] == "1.0.0"
        assert "id" in catalog
        assert "description" in catalog
        assert "links" in catalog
        assert isinstance(catalog["links"], list)

    def test_catalog_links_have_required_fields(self, tmp_path: Path) -> None:
        """Test that catalog links have rel and href."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        create_plot(catalog_path, metadata)

        with open(catalog_path / "catalog.json") as f:
            catalog = json.load(f)

        for link in catalog["links"]:
            assert "rel" in link
            assert "href" in link

        # Check item links exist
        item_links = [link for link in catalog["links"] if link["rel"] == "item"]
        assert len(item_links) == 1

    def test_item_has_required_fields(self, tmp_path: Path) -> None:
        """Test that STAC Item has all required fields."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test", description="Test description")
        plot_id = create_plot(catalog_path, metadata)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        # Required STAC Item fields
        assert item["type"] == "Feature"
        assert item["stac_version"] == "1.0.0"
        assert "id" in item
        assert "geometry" in item  # Can be null
        assert "properties" in item
        assert "links" in item
        assert "assets" in item

        # Required properties
        assert "datetime" in item["properties"]

    def test_item_geometry_is_valid_geojson(self, tmp_path: Path) -> None:
        """Test that Item geometry is valid GeoJSON when bbox is set."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
                "properties": {},
            }
        ]
        add_features(catalog_path, plot_id, features)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        # Geometry should be set when bbox is present
        assert item["bbox"] is not None
        assert item["geometry"] is not None
        assert item["geometry"]["type"] == "Polygon"
        assert "coordinates" in item["geometry"]

    def test_item_assets_have_required_fields(self, tmp_path: Path) -> None:
        """Test that Item assets have required href field."""
        from debrief_stac.assets import add_asset
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        # Add features asset
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
                "properties": {},
            }
        ]
        add_features(catalog_path, plot_id, features)

        # Add source asset
        source_file = tmp_path / "test.txt"
        source_file.write_text("test")
        add_asset(catalog_path, plot_id, source_file)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        # Check all assets have href
        for asset_key, asset in item["assets"].items():
            assert "href" in asset, f"Asset {asset_key} missing href"
            assert "type" in asset, f"Asset {asset_key} missing type"

    def test_item_links_have_parent_and_root(self, tmp_path: Path) -> None:
        """Test that Item links include parent and root references."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        link_rels = [link["rel"] for link in item["links"]]
        assert "self" in link_rels
        assert "parent" in link_rels
        assert "root" in link_rels
