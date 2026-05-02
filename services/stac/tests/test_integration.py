"""Integration tests for debrief-stac full workflow (Phase 10)."""

import json
from pathlib import Path


class TestFullWorkflow:
    """Integration test for complete debrief-stac workflow."""

    def test_full_workflow_create_to_read(self, tmp_path: Path) -> None:
        """Test complete workflow: create catalog -> create plot -> add features -> add asset -> read.

        This test validates the full data pipeline works end-to-end.
        """
        from debrief_stac.assets import add_asset
        from debrief_stac.catalog import create_catalog, list_plots, open_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        # Step 1: Create catalog
        catalog_path = create_catalog(
            tmp_path / "integration_test",
            catalog_id="integration-catalog",
            description="Integration test catalog",
        )
        assert catalog_path.exists()
        assert (catalog_path / "catalog.json").exists()

        # Verify catalog structure
        catalog = open_catalog(catalog_path)
        assert catalog["id"] == "integration-catalog"
        assert catalog["type"] == "Catalog"
        assert catalog["stac_version"] == "1.1.0"

        # Step 2: Create first plot
        metadata1 = PlotMetadata(
            title="Track Analysis Day 1",
            description="Analysis of vessel tracks from exercise day 1",
        )
        plot_id_1 = create_plot(catalog_path, metadata1, plot_id="day1-analysis")
        assert plot_id_1 == "day1-analysis"
        assert (catalog_path / "day1-analysis" / "item.json").exists()

        # Step 3: Create second plot
        metadata2 = PlotMetadata(
            title="Track Analysis Day 2",
            description="Analysis of vessel tracks from exercise day 2",
        )
        plot_id_2 = create_plot(catalog_path, metadata2)
        assert (catalog_path / plot_id_2 / "item.json").exists()

        # Step 4: Add features to first plot
        track_features = [
            {
                "type": "Feature",
                "id": "track-alpha",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [-5.0, 50.0],
                        [-4.5, 50.2],
                        [-4.0, 50.5],
                        [-3.5, 50.8],
                    ],
                },
                "properties": {
                    "kind": "TRACK",
                    "platform_id": "VESSEL-ALPHA",
                    "track_type": "OWNSHIP",
                    "start_time": "2026-01-09T10:00:00Z",
                    "end_time": "2026-01-09T12:00:00Z",
                    "positions": [
                        {"time": "2026-01-09T10:00:00Z", "course": 45, "speed": 12},
                        {"time": "2026-01-09T12:00:00Z", "course": 45, "speed": 12},
                    ],
                    "style": {
                        "line": {"color": "#0066CC"},
                        "point": {
                            "shape": "circle",
                            "radius": 4,
                            "fill_color": "#0066CC",
                            "color": "#FFF",
                        },
                    },
                    "default_position_style": {
                        "show_symbol": False,
                        "symbol": "circle",
                        "show_label": False,
                    },
                },
            },
            {
                "type": "Feature",
                "id": "ref-point-1",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-4.2, 50.3],
                },
                "properties": {
                    "kind": "POINT",
                    "name": "Reference Point",
                    "location_type": "WAYPOINT",
                    "style": {
                        "shape": "circle",
                        "radius": 6,
                        "fill_color": "#FF5733",
                        "color": "#000",
                    },
                },
            },
        ]
        feature_count = add_features(catalog_path, plot_id_1, track_features)
        assert feature_count == 2

        # Verify features file created
        features_path = catalog_path / plot_id_1 / "features.geojson"
        assert features_path.exists()
        with open(features_path) as f:
            fc = json.load(f)
        assert fc["type"] == "FeatureCollection"
        assert len(fc["features"]) == 2

        # Step 5: Add source asset to first plot
        source_file = tmp_path / "source_data.rep"
        source_file.write_text("Sample REP data content")

        asset_key = add_asset(catalog_path, plot_id_1, source_file)
        assert asset_key == "source-source_data"  # Default key is "source-{stem}"

        # Verify asset copied
        asset_path = catalog_path / plot_id_1 / "assets" / "source_data.rep"
        assert asset_path.exists()
        assert asset_path.read_text() == "Sample REP data content"

        # Step 6: Read plot back and verify all data
        item = read_plot(catalog_path, plot_id_1)
        assert item["id"] == "day1-analysis"
        assert item["type"] == "Feature"
        assert item["stac_version"] == "1.1.0"
        assert item["properties"]["title"] == "Track Analysis Day 1"
        assert item["properties"]["description"] == "Analysis of vessel tracks from exercise day 1"

        # Verify bbox updated from features
        assert item["bbox"] is not None
        min_lon, min_lat, max_lon, max_lat = item["bbox"]
        assert min_lon == -5.0
        assert min_lat == 50.0
        assert max_lon == -3.5
        assert max_lat == 50.8

        # Verify assets
        assert "features" in item["assets"]
        assert item["assets"]["features"]["type"] == "application/geo+json"
        assert "source-source_data" in item["assets"]
        assert item["assets"]["source-source_data"]["roles"] == ["source"]

        # Verify provenance metadata
        provenance = item["assets"]["source-source_data"].get("debrief:provenance", {})
        assert "source_path" in provenance
        assert "load_timestamp" in provenance
        assert "tool_version" in provenance

        # Step 7: List plots and verify both appear
        plots = list_plots(catalog_path)
        assert len(plots) == 2

        # Should be sorted by datetime descending (newest first)
        plot_ids = [p.id for p in plots]
        assert plot_id_1 in plot_ids
        assert plot_id_2 in plot_ids

        # Verify summary info
        day1_summary = next(p for p in plots if p.id == plot_id_1)
        assert day1_summary.title == "Track Analysis Day 1"
        assert day1_summary.feature_count == 2

    def test_workflow_with_multiple_feature_additions(self, tmp_path: Path) -> None:
        """Test adding features in multiple batches."""
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot

        catalog_path = create_catalog(tmp_path / "multi_features")
        metadata = PlotMetadata(title="Multi-batch Test")
        plot_id = create_plot(catalog_path, metadata)

        # Add first batch
        batch1 = [
            {
                "type": "Feature",
                "id": "ref-b1",
                "geometry": {"type": "Point", "coordinates": [0, 0]},
                "properties": {
                    "kind": "POINT",
                    "name": "Batch 1",
                    "location_type": "WAYPOINT",
                    "style": {
                        "shape": "circle",
                        "radius": 6,
                        "fill_color": "#FF5733",
                        "color": "#000",
                    },
                },
            }
        ]
        count1 = add_features(catalog_path, plot_id, batch1)
        assert count1 == 1

        # Add second batch
        batch2 = [
            {
                "type": "Feature",
                "id": "ref-b2a",
                "geometry": {"type": "Point", "coordinates": [1, 1]},
                "properties": {
                    "kind": "POINT",
                    "name": "Batch 2a",
                    "location_type": "WAYPOINT",
                    "style": {
                        "shape": "circle",
                        "radius": 6,
                        "fill_color": "#FF5733",
                        "color": "#000",
                    },
                },
            },
            {
                "type": "Feature",
                "id": "ref-b2b",
                "geometry": {"type": "Point", "coordinates": [2, 2]},
                "properties": {
                    "kind": "POINT",
                    "name": "Batch 2b",
                    "location_type": "WAYPOINT",
                    "style": {
                        "shape": "circle",
                        "radius": 6,
                        "fill_color": "#FF5733",
                        "color": "#000",
                    },
                },
            },
        ]
        count2 = add_features(catalog_path, plot_id, batch2)
        assert count2 == 3  # Total count after append

        # Verify bbox encompasses all features
        item = read_plot(catalog_path, plot_id)
        assert item["bbox"] == [0, 0, 2, 2]

    def test_workflow_with_temporal_metadata(self, tmp_path: Path) -> None:
        """Test full workflow including temporal metadata update (#137).

        create catalog → create plot → add track features → update temporal metadata → verify.
        """
        from debrief_stac.catalog import create_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot, read_plot, update_temporal_metadata

        catalog_path = create_catalog(tmp_path / "temporal_test")
        metadata = PlotMetadata(title="Exercise Alpha")
        plot_id = create_plot(catalog_path, metadata, plot_id="exercise-alpha")

        # Add track features with temporal data
        tracks = [
            {
                "type": "Feature",
                "id": "track-alpha",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-5.0, 50.0], [-4.5, 50.2], [-4.0, 50.5]],
                },
                "properties": {
                    "kind": "TRACK",
                    "platform_id": "VESSEL-ALPHA",
                    "track_type": "OWNSHIP",
                    "start_time": "2022-08-27T09:00:00Z",
                    "end_time": "2022-09-01T12:00:00Z",
                    "positions": [
                        {"time": "2022-08-27T09:00:00Z", "course": 45, "speed": 12},
                        {"time": "2022-09-01T12:00:00Z", "course": 45, "speed": 12},
                    ],
                    "style": {
                        "line": {"color": "#0066CC"},
                        "point": {
                            "shape": "circle",
                            "radius": 4,
                            "fill_color": "#0066CC",
                            "color": "#FFF",
                        },
                    },
                    "default_position_style": {
                        "show_symbol": False,
                        "symbol": "circle",
                        "show_label": False,
                    },
                },
            },
            {
                "type": "Feature",
                "id": "track-bravo",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[-3.0, 51.0], [-2.5, 51.2]],
                },
                "properties": {
                    "kind": "TRACK",
                    "platform_id": "VESSEL-BRAVO",
                    "track_type": "OWNSHIP",
                    "start_time": "2022-08-30T06:00:00Z",
                    "end_time": "2022-09-10T16:44:49Z",
                    "positions": [
                        {"time": "2022-08-30T06:00:00Z", "course": 90, "speed": 10},
                        {"time": "2022-09-10T16:44:49Z", "course": 90, "speed": 10},
                    ],
                    "style": {
                        "line": {"color": "#CC0000"},
                        "point": {
                            "shape": "circle",
                            "radius": 4,
                            "fill_color": "#CC0000",
                            "color": "#FFF",
                        },
                    },
                    "default_position_style": {
                        "show_symbol": False,
                        "symbol": "circle",
                        "show_label": False,
                    },
                },
            },
        ]
        add_features(catalog_path, plot_id, tracks)

        # Update temporal metadata
        result = update_temporal_metadata(catalog_path, plot_id)
        assert result is not None
        assert result.start_datetime == "2022-08-27T09:00:00Z"
        assert result.end_datetime == "2022-09-10T16:44:49Z"
        assert result.datetime == "2022-08-27T09:00:00Z"

        # Verify persisted item
        item = read_plot(catalog_path, plot_id)
        assert item["properties"]["datetime"] == "2022-08-27T09:00:00Z"
        assert item["properties"]["start_datetime"] == "2022-08-27T09:00:00Z"
        assert item["properties"]["end_datetime"] == "2022-09-10T16:44:49Z"

    def test_workflow_catalog_integrity(self, tmp_path: Path) -> None:
        """Test that catalog maintains integrity through all operations."""
        from debrief_stac.catalog import create_catalog, open_catalog
        from debrief_stac.features import add_features
        from debrief_stac.models import PlotMetadata
        from debrief_stac.plot import create_plot

        catalog_path = create_catalog(tmp_path / "integrity_test")

        # Create multiple plots
        for i in range(3):
            metadata = PlotMetadata(title=f"Plot {i}")
            plot_id = create_plot(catalog_path, metadata)
            features = [
                {
                    "type": "Feature",
                    "id": f"ref-{i}",
                    "geometry": {"type": "Point", "coordinates": [i, i]},
                    "properties": {
                        "kind": "POINT",
                        "name": f"Point {i}",
                        "location_type": "WAYPOINT",
                        "style": {
                            "shape": "circle",
                            "radius": 6,
                            "fill_color": "#FF5733",
                            "color": "#000",
                        },
                    },
                }
            ]
            add_features(catalog_path, plot_id, features)

        # Verify catalog links are correct
        catalog = open_catalog(catalog_path)
        item_links = [link for link in catalog["links"] if link["rel"] == "item"]
        assert len(item_links) == 3

        # Verify each link points to valid item
        for link in item_links:
            item_path = catalog_path / link["href"]
            assert item_path.exists(), f"Item not found: {link['href']}"
