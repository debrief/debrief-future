"""Additional tests to increase code coverage."""

import json
from pathlib import Path

import pytest


class TestGeometryTypes:
    """Tests for various GeoJSON geometry types in features."""

    def test_add_features_multipoint(self, tmp_path: Path) -> None:
        """Test adding MultiPoint geometry."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "multipoint")
        metadata = PlotMetadata(title="MultiPoint Test")
        plot_id = create_plot(catalog_path, metadata)

        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [[0, 0], [1, 1], [2, 2]],
                },
                "properties": {"name": "multipoint"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)
        assert item["bbox"] == [0, 0, 2, 2]

    def test_add_features_multilinestring(self, tmp_path: Path) -> None:
        """Test adding MultiLineString geometry."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "multilinestring")
        metadata = PlotMetadata(title="MultiLineString Test")
        plot_id = create_plot(catalog_path, metadata)

        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiLineString",
                    "coordinates": [
                        [[0, 0], [1, 1]],
                        [[2, 2], [3, 3]],
                    ],
                },
                "properties": {"name": "multilinestring"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)
        assert item["bbox"] == [0, 0, 3, 3]

    def test_add_features_multipolygon(self, tmp_path: Path) -> None:
        """Test adding MultiPolygon geometry."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "multipolygon")
        metadata = PlotMetadata(title="MultiPolygon Test")
        plot_id = create_plot(catalog_path, metadata)

        features = [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPolygon",
                    "coordinates": [
                        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                        [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]],
                    ],
                },
                "properties": {"name": "multipolygon"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)
        assert item["bbox"] == [0, 0, 3, 3]

    def test_add_features_null_geometry(self, tmp_path: Path) -> None:
        """Test adding feature with null geometry."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "nullgeom")
        metadata = PlotMetadata(title="Null Geometry Test")
        plot_id = create_plot(catalog_path, metadata)

        features = [
            {
                "type": "Feature",
                "geometry": None,
                "properties": {"name": "no geometry"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)
        # bbox remains None with null geometry
        assert item["bbox"] is None

    def test_add_features_unknown_geometry_type(self, tmp_path: Path) -> None:
        """Test adding feature with unknown geometry type."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "unknown")
        metadata = PlotMetadata(title="Unknown Geometry Test")
        plot_id = create_plot(catalog_path, metadata)

        # First add valid feature
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
                "properties": {"name": "valid"},
            },
            {
                "type": "Feature",
                "geometry": {"type": "UnknownType", "coordinates": [[5, 5]]},
                "properties": {"name": "unknown geometry type"},
            },
        ]
        add_features(catalog_path, plot_id, features)

        item = read_plot(catalog_path, plot_id)
        # Only gets bbox from valid Point
        assert item["bbox"] == [0, 0, 0, 0]


class TestExceptionMessages:
    """Tests for exception string representations."""

    def test_catalog_exists_error_str(self) -> None:
        """Test CatalogExistsError string representation."""
        from debrief_stac.exceptions import CatalogExistsError

        error = CatalogExistsError("/path/to/catalog")
        assert "/path/to/catalog" in str(error)
        assert "already exists" in str(error)

    def test_catalog_not_found_error_str(self) -> None:
        """Test CatalogNotFoundError string representation."""
        from debrief_stac.exceptions import CatalogNotFoundError

        error = CatalogNotFoundError("/path/to/catalog")
        assert "/path/to/catalog" in str(error)
        assert "not found" in str(error)

    def test_plot_not_found_error_str(self) -> None:
        """Test PlotNotFoundError string representation."""
        from debrief_stac.exceptions import PlotNotFoundError

        error = PlotNotFoundError("plot-123", "/path/to/catalog")
        assert "plot-123" in str(error)
        assert "/path/to/catalog" in str(error)

    def test_validation_error_str(self) -> None:
        """Test ValidationError string representation."""
        from debrief_stac.exceptions import ValidationError

        error = ValidationError("Invalid field", details={"field": "test_field"})
        assert "Invalid field" in str(error)
        assert error.details["field"] == "test_field"

    def test_plot_exists_error_str(self) -> None:
        """Test PlotExistsError string representation."""
        from debrief_stac.exceptions import PlotExistsError

        error = PlotExistsError("plot-123")
        assert "plot-123" in str(error)
        assert "already exists" in str(error)

    def test_permission_error_str(self) -> None:
        """Test PermissionError string representation."""
        from debrief_stac.exceptions import PermissionError as DebriefPermissionError

        error = DebriefPermissionError("/path/to/file", operation="write")
        assert "/path/to/file" in str(error)
        assert "write" in str(error)

    def test_asset_not_found_error_str(self) -> None:
        """Test AssetNotFoundError string representation."""
        from debrief_stac.exceptions import AssetNotFoundError

        error = AssetNotFoundError("source-file", "plot-123")
        assert "source-file" in str(error)
        assert "plot-123" in str(error)

    def test_plot_not_found_without_catalog_path(self) -> None:
        """Test PlotNotFoundError without catalog path."""
        from debrief_stac.exceptions import PlotNotFoundError

        error = PlotNotFoundError("plot-123")
        assert "plot-123" in str(error)
        assert error.catalog_path is None


class TestMCPTools:
    """Tests for MCP tool decorator functions."""

    def test_create_catalog_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling create_catalog_tool directly."""
        from debrief_stac.mcp_server import create_catalog_tool

        result = create_catalog_tool(
            path=str(tmp_path / "mcp_cat"),
            catalog_id="mcp-test",
            description="MCP tool test",
        )
        assert "path" in result
        assert Path(result["path"]).exists()

    def test_create_plot_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling create_plot_tool directly."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import create_plot_tool

        catalog_path = create_catalog(tmp_path / "catalog")

        result = create_plot_tool(
            catalog_path=str(catalog_path),
            title="MCP Plot",
            description="Created via MCP tool",
        )
        assert "plot_id" in result

    def test_read_plot_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling read_plot_tool directly."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import read_plot_tool
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        result = read_plot_tool(
            catalog_path=str(catalog_path),
            plot_id=plot_id,
        )
        assert "item" in result
        assert result["item"]["id"] == plot_id

    def test_add_features_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling add_features_tool directly."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import add_features_tool
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        result = add_features_tool(
            catalog_path=str(catalog_path),
            plot_id=plot_id,
            features=[
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                    "properties": {},
                }
            ],
        )
        assert "feature_count" in result
        assert result["feature_count"] == 1

    def test_add_asset_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling add_asset_tool directly."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import add_asset_tool
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        source_file = tmp_path / "test.txt"
        source_file.write_text("content")

        result = add_asset_tool(
            catalog_path=str(catalog_path),
            plot_id=plot_id,
            source_path=str(source_file),
        )
        assert "asset_key" in result

    def test_list_plots_tool_direct_call(self, tmp_path: Path) -> None:
        """Test calling list_plots_tool directly."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import list_plots_tool
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        create_plot(catalog_path, metadata)

        result = list_plots_tool(catalog_path=str(catalog_path))
        assert "plots" in result
        assert len(result["plots"]) == 1

    def test_add_asset_tool_file_not_found(self, tmp_path: Path) -> None:
        """Test add_asset_tool with non-existent file."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.mcp_server import add_asset_tool
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        result = add_asset_tool(
            catalog_path=str(catalog_path),
            plot_id=plot_id,
            source_path="/nonexistent/file.txt",
        )
        assert "error" in result
        assert "not found" in result["error"].lower()


class TestAssetEdgeCases:
    """Tests for asset edge cases."""

    def test_add_asset_with_unknown_mime_type(self, tmp_path: Path) -> None:
        """Test adding asset with unknown file extension."""
        from debrief_stac.assets import add_asset
        from debrief_stac.catalog import create_catalog
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        # Create file with unknown extension
        source_file = tmp_path / "data.xyz123"
        source_file.write_text("unknown content")

        add_asset(catalog_path, plot_id, source_file)

        item = read_plot(catalog_path, plot_id)
        # Should default to octet-stream
        asset = item["assets"]["source-data"]
        assert asset["type"] == "application/octet-stream"


class TestListPlotsEdgeCases:
    """Tests for list_plots edge cases."""

    def test_list_plots_with_missing_datetime(self, tmp_path: Path) -> None:
        """Test list_plots handles missing datetime in properties."""
        from debrief_stac.catalog import create_catalog, list_plots
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        # Manually remove datetime from item
        item_path = catalog_path / plot_id / "item.json"
        with open(item_path) as f:
            item = json.load(f)
        del item["properties"]["datetime"]
        with open(item_path, "w") as f:
            json.dump(item, f)

        # Should still work, using current time as fallback
        plots = list_plots(catalog_path)
        assert len(plots) == 1
        assert plots[0].id == plot_id

    def test_list_plots_with_missing_item_file(self, tmp_path: Path) -> None:
        """Test list_plots handles missing item file gracefully."""
        from debrief_stac.catalog import create_catalog, list_plots, open_catalog

        catalog_path = create_catalog(tmp_path / "catalog")

        # Manually add a link to non-existent item
        catalog = open_catalog(catalog_path)
        catalog["links"].append({
            "rel": "item",
            "href": "./nonexistent/item.json",
            "type": "application/geo+json",
        })
        with open(catalog_path / "catalog.json", "w") as f:
            json.dump(catalog, f)

        # Should still work, skipping the missing item
        plots = list_plots(catalog_path)
        assert len(plots) == 0


class TestFeatureValidation:
    """Tests for feature validation edge cases."""

    def test_add_features_invalid_type(self, tmp_path: Path) -> None:
        """Test adding features with invalid type."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        with pytest.raises(ValueError, match="type must be 'Feature'"):
            add_features(
                catalog_path,
                plot_id,
                [{"type": "NotAFeature", "geometry": None, "properties": {}}],
            )

    def test_add_features_not_a_dict(self, tmp_path: Path) -> None:
        """Test adding features that are not dictionaries."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "catalog")
        metadata = PlotMetadata(title="Test")
        plot_id = create_plot(catalog_path, metadata)

        with pytest.raises(ValueError, match="must be a dictionary"):
            add_features(catalog_path, plot_id, ["not a dict"])
