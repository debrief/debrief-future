"""Tests for STAC Collection summaries (feature #136).

Covers:
- US1: Automatic Collection summaries on item mutation
- US2: Backwards-compatible catalog loading (promotion)
- US3: Summary data available for CQL2 filter validation
- US4: Summary accuracy after item deletion
"""

import json
from datetime import UTC, datetime
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.collection import (
    _extract_item_extent,
    _extract_item_summaries,
    _merge_extent,
    _merge_summaries,
    read_collection_summaries,
    rebuild_collection_summaries,
)
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.features import add_features, delete_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot


def _make_item(
    item_id: str = "test-item",
    bbox: list[float] | None = None,
    datetime: str = "2024-06-15T12:00:00Z",
    start_datetime: str | None = None,
    end_datetime: str | None = None,
    platforms: list[dict] | None = None,
    tags: list[str] | None = None,
    feature_tags: list[str] | None = None,
) -> dict:
    """Helper to create a STAC Item dict for testing."""
    props: dict = {
        "title": f"Test Item {item_id}",
        "datetime": datetime,
    }
    if start_datetime:
        props["start_datetime"] = start_datetime
    if end_datetime:
        props["end_datetime"] = end_datetime
    if platforms is not None:
        props["debrief:platforms"] = platforms
    if tags is not None:
        props["debrief:tags"] = tags
    if feature_tags is not None:
        props["debrief:feature_tags"] = feature_tags

    return {
        "type": "Feature",
        "stac_version": "1.0.0",
        "id": item_id,
        "geometry": None,
        "bbox": bbox,
        "properties": props,
        "links": [],
        "assets": {},
    }


class TestExtractItemExtent:
    """Tests for _extract_item_extent helper."""

    def test_extracts_bbox(self) -> None:
        item = _make_item(bbox=[-5.0, 49.0, 2.0, 58.5])
        bbox, _, _ = _extract_item_extent(item)
        assert bbox == (-5.0, 49.0, 2.0, 58.5)

    def test_null_bbox(self) -> None:
        item = _make_item(bbox=None)
        bbox, _, _ = _extract_item_extent(item)
        assert bbox is None

    def test_datetime_used_as_start_and_end(self) -> None:
        """T019: item with datetime but no start/end → datetime used as both."""
        item = _make_item(datetime="2024-06-15T12:00:00Z")
        _, start, end = _extract_item_extent(item)
        assert start == "2024-06-15T12:00:00Z"
        assert end == "2024-06-15T12:00:00Z"

    def test_explicit_start_end(self) -> None:
        item = _make_item(
            start_datetime="2024-01-01T00:00:00Z",
            end_datetime="2024-12-31T23:59:59Z",
        )
        _, start, end = _extract_item_extent(item)
        assert start == "2024-01-01T00:00:00Z"
        assert end == "2024-12-31T23:59:59Z"


class TestExtractItemSummaries:
    """Tests for _extract_item_summaries helper."""

    def test_extracts_platforms(self) -> None:
        platforms = [
            {
                "id": "NELSON",
                "name": "HMS Nelson",
                "nationality": "GB",
                "vessel_class": "surface/warship/frigate",
            },
            {
                "id": "MASON",
                "name": "USS Mason",
                "nationality": "US",
                "vessel_class": "surface/warship/destroyer",
            },
        ]
        item = _make_item(platforms=platforms)
        result = _extract_item_summaries(item)
        assert result["debrief:platforms"] == platforms

    def test_missing_properties_not_included(self) -> None:
        """T020: item missing debrief:* properties → contributes nothing."""
        item = _make_item()
        result = _extract_item_summaries(item)
        assert len(result) == 0

    def test_non_dict_platform_entries_filtered(self) -> None:
        item = _make_item()
        item["properties"]["debrief:platforms"] = [
            {"id": "NELSON", "vessel_class": "frigate"},
            "not-a-dict",
            None,
            {"id": "MASON", "vessel_class": "submarine"},
        ]
        result = _extract_item_summaries(item)
        assert result["debrief:platforms"] == [
            {"id": "NELSON", "vessel_class": "frigate"},
            {"id": "MASON", "vessel_class": "submarine"},
        ]


class TestMergeExtent:
    """Tests for _merge_extent helper."""

    def test_first_item_sets_extent(self) -> None:
        result = _merge_extent(
            None, (-5.0, 49.0, 2.0, 58.5), "2024-01-01T00:00:00Z", "2024-06-30T00:00:00Z"
        )
        assert result["spatial"]["bbox"] == [[-5.0, 49.0, 2.0, 58.5]]
        assert result["temporal"]["interval"] == [["2024-01-01T00:00:00Z", "2024-06-30T00:00:00Z"]]

    def test_expands_bbox(self) -> None:
        existing = {
            "spatial": {"bbox": [[-5.0, 49.0, 2.0, 58.5]]},
            "temporal": {"interval": [["2024-01-01T00:00:00Z", "2024-06-30T00:00:00Z"]]},
        }
        result = _merge_extent(existing, (-10.0, 48.0, 3.0, 60.0), None, None)
        assert result["spatial"]["bbox"] == [[-10.0, 48.0, 3.0, 60.0]]

    def test_expands_temporal(self) -> None:
        existing = {
            "spatial": {"bbox": [[-5.0, 49.0, 2.0, 58.5]]},
            "temporal": {"interval": [["2024-01-01T00:00:00Z", "2024-06-30T00:00:00Z"]]},
        }
        result = _merge_extent(existing, None, "2023-06-01T00:00:00Z", "2025-01-01T00:00:00Z")
        assert result["temporal"]["interval"] == [["2023-06-01T00:00:00Z", "2025-01-01T00:00:00Z"]]

    def test_null_bbox_skipped(self) -> None:
        """T018: item with null bbox excluded from spatial calculation."""
        existing = {
            "spatial": {"bbox": [[-5.0, 49.0, 2.0, 58.5]]},
            "temporal": {"interval": [["2024-01-01T00:00:00Z", "2024-06-30T00:00:00Z"]]},
        }
        result = _merge_extent(existing, None, None, None)
        assert result["spatial"]["bbox"] == [[-5.0, 49.0, 2.0, 58.5]]


class TestMergeSummaries:
    """Tests for _merge_summaries helper."""

    def test_first_item_sets_platforms(self) -> None:
        platforms = [
            {"id": "NELSON", "vessel_class": "frigate"},
            {"id": "MASON", "vessel_class": "destroyer"},
        ]
        result = _merge_summaries(None, {"debrief:platforms": platforms})
        assert result["debrief:platforms"] == platforms

    def test_merges_platforms_deduplicated_by_id(self) -> None:
        existing_platforms = [{"id": "NELSON", "vessel_class": "frigate"}]
        new_platforms = [
            {"id": "NELSON", "vessel_class": "updated-frigate"},
            {"id": "MASON", "vessel_class": "destroyer"},
        ]
        existing = {"debrief:platforms": existing_platforms}
        result = _merge_summaries(existing, {"debrief:platforms": new_platforms})
        # NELSON already seen — first record wins; MASON is new
        assert len(result["debrief:platforms"]) == 2
        nelson = next(p for p in result["debrief:platforms"] if p["id"] == "NELSON")
        assert nelson["vessel_class"] == "frigate"  # first-seen wins
        assert any(p["id"] == "MASON" for p in result["debrief:platforms"])

    def test_sorted_tags_alphabetically(self) -> None:
        """T021: tag summaries arrays sorted alphabetically."""
        result = _merge_summaries(None, {"debrief:tags": ["training", "ASW", "SAR"]})
        assert result["debrief:tags"] == ["ASW", "SAR", "training"]


class TestCollectionPromotionUS1:
    """Tests for User Story 1: Automatic Collection summaries on item mutation."""

    def test_create_plot_promotes_catalog(self, tmp_path: Path) -> None:
        """T015: empty catalog → create_plot → catalog becomes Collection."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="Plot 1"), plot_id="plot-1")

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"
        assert "extent" in catalog
        assert "summaries" in catalog
        # spec 241 — promoted Collection defaults to STAC 1.1 'other' (the
        # legacy 'proprietary' value is deprecated in 1.1).
        assert catalog["license"] == "other"

    def test_add_item_expands_summaries(self, tmp_path: Path) -> None:
        """T016: Collection with items → add item with later date + new platform → summaries expand."""
        catalog_path = create_catalog(tmp_path / "catalog")

        # Create item 1 with features to set bbox and datetime
        plot1 = create_plot(
            catalog_path,
            PlotMetadata(title="Plot 1", datetime=datetime(2024, 1, 15, 8, 0, 0, tzinfo=UTC)),
            plot_id="plot-1",
        )
        # Manually set extension properties on item
        item1 = read_plot(catalog_path, plot1)
        item1["properties"]["debrief:platforms"] = [
            {"id": "NELSON", "name": "HMS Nelson", "nationality": "GB", "vessel_class": "frigate"}
        ]
        item1["bbox"] = [-5.0, 49.0, 2.0, 58.5]
        with open(catalog_path / plot1 / "item.json", "w") as f:
            json.dump(item1, f, indent=2)

        # Create item 2 with different properties
        plot2 = create_plot(
            catalog_path,
            PlotMetadata(title="Plot 2", datetime=datetime(2025, 3, 20, 16, 30, 0, tzinfo=UTC)),
            plot_id="plot-2",
        )
        item2 = read_plot(catalog_path, plot2)
        item2["properties"]["debrief:platforms"] = [
            {"id": "MASON", "name": "USS Mason", "nationality": "US", "vessel_class": "submarine"}
        ]
        item2["bbox"] = [-10.0, 48.0, 3.0, 60.0]
        with open(catalog_path / plot2 / "item.json", "w") as f:
            json.dump(item2, f, indent=2)

        # Trigger rebuild to pick up manually set properties
        from debrief_stac.catalog import _save_catalog

        catalog_data = open_catalog(catalog_path)
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"
        platform_ids = {p["id"] for p in catalog["summaries"]["debrief:platforms"]}
        assert platform_ids == {"NELSON", "MASON"}
        assert catalog["extent"]["spatial"]["bbox"] == [[-10.0, 48.0, 3.0, 60.0]]

    def test_add_features_updates_collection_extent(self, tmp_path: Path) -> None:
        """T017: add_features expands bbox → Collection spatial extent updated."""
        catalog_path = create_catalog(tmp_path / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Plot 1"), plot_id="plot-1")

        features = [
            {
                "type": "Feature",
                "id": "ref-a",
                "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
                "properties": {
                    "kind": "POINT",
                    "name": "Point A",
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
        add_features(catalog_path, plot_id, features)

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"
        assert catalog["extent"]["spatial"]["bbox"] == [[-5.0, 50.0, -5.0, 50.0]]

        # Add more features that expand the bbox
        more_features = [
            {
                "type": "Feature",
                "id": "ref-b",
                "geometry": {"type": "Point", "coordinates": [10.0, 60.0]},
                "properties": {
                    "kind": "POINT",
                    "name": "Point B",
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
        add_features(catalog_path, plot_id, more_features)

        catalog = open_catalog(catalog_path)
        assert catalog["extent"]["spatial"]["bbox"] == [[-5.0, 50.0, 10.0, 60.0]]

    def test_item_without_bbox_excluded_from_spatial(self, tmp_path: Path) -> None:
        """T018: item with null bbox excluded from spatial extent."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="No Geometry Plot"), plot_id="no-geo")

        catalog = open_catalog(catalog_path)
        # No features added, so bbox should be the global fallback
        assert catalog["extent"]["spatial"]["bbox"] == [[-180, -90, 180, 90]]

    def test_item_missing_extension_properties_no_error(self, tmp_path: Path) -> None:
        """T020: item missing debrief:* properties → no error."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="Plain Plot"), plot_id="plain")

        catalog = open_catalog(catalog_path)
        # spec 241 — STAC 1.1 forbids empty arrays in summaries (minItems: 1).
        # Empty summary keys are now omitted entirely; the `summaries` block
        # itself remains present.
        for key in [
            "debrief:platforms",
            "debrief:tags",
            "debrief:feature_tags",
        ]:
            assert key not in catalog["summaries"]

    def test_summaries_sorted_alphabetically(self, tmp_path: Path) -> None:
        """T021: tag summaries arrays are sorted alphabetically."""
        catalog_path = create_catalog(tmp_path / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Plot"), plot_id="plot-1")

        # Set tags in unsorted order
        item = read_plot(catalog_path, plot_id)
        item["properties"]["debrief:tags"] = ["training", "ASW", "SAR"]
        with open(catalog_path / plot_id / "item.json", "w") as f:
            json.dump(item, f, indent=2)

        from debrief_stac.catalog import _save_catalog

        catalog_data = open_catalog(catalog_path)
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

        catalog = open_catalog(catalog_path)
        assert catalog["summaries"]["debrief:tags"] == ["ASW", "SAR", "training"]

    def test_collection_validates_against_schema(self, tmp_path: Path) -> None:
        """T022: Collection output validates against collection-schema.json."""
        import jsonschema

        # Load the contract schema
        schema_path = (
            Path(__file__).parent.parent.parent.parent
            / "specs"
            / "136-stac-collection-summaries"
            / "contracts"
            / "collection-schema.json"
        )
        if not schema_path.exists():
            pytest.skip("Contract schema not found")

        with open(schema_path) as f:
            schema = json.load(f)

        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(
            catalog_path,
            PlotMetadata(title="Plot 1", datetime=datetime(2024, 1, 15, 8, 0, 0, tzinfo=UTC)),
            plot_id="plot-1",
        )

        # Add features to get a valid bbox
        add_features(
            catalog_path,
            "plot-1",
            [
                {
                    "type": "Feature",
                    "id": "ref-a",
                    "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
                    "properties": {
                        "kind": "POINT",
                        "name": "Point A",
                        "location_type": "WAYPOINT",
                        "style": {
                            "shape": "circle",
                            "radius": 6,
                            "fill_color": "#FF5733",
                            "color": "#000",
                        },
                    },
                },
            ],
        )

        catalog = open_catalog(catalog_path)
        jsonschema.validate(instance=catalog, schema=schema)


class TestBackwardsCompatibilityUS2:
    """Tests for User Story 2: Backwards-compatible catalog loading."""

    def test_open_catalog_with_type_catalog_loads(self, tmp_path: Path) -> None:
        """T030: open_catalog with type "Catalog" (no summaries) loads without errors."""
        catalog_path = tmp_path / "old_catalog"
        catalog_path.mkdir()
        catalog_json = {
            "type": "Catalog",
            "stac_version": "1.0.0",
            "id": "old-catalog",
            "description": "Pre-existing catalog",
            "links": [
                {"rel": "root", "href": "./catalog.json"},
                {"rel": "self", "href": "./catalog.json"},
            ],
        }
        with open(catalog_path / "catalog.json", "w") as f:
            json.dump(catalog_json, f)

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Catalog"
        assert catalog["id"] == "old-catalog"

    def test_create_plot_on_old_catalog_promotes(self, tmp_path: Path) -> None:
        """T031: create_plot on pre-existing Catalog → promotes to Collection."""
        catalog_path = tmp_path / "old_catalog"
        catalog_path.mkdir()
        catalog_json = {
            "type": "Catalog",
            "stac_version": "1.0.0",
            "id": "old-catalog",
            "description": "Pre-existing catalog",
            "links": [
                {"rel": "root", "href": "./catalog.json"},
                {"rel": "self", "href": "./catalog.json"},
            ],
        }
        with open(catalog_path / "catalog.json", "w") as f:
            json.dump(catalog_json, f)

        create_plot(catalog_path, PlotMetadata(title="New Plot"), plot_id="new-plot")

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"
        assert "extent" in catalog
        assert "summaries" in catalog
        # spec 241 — promoted Collection defaults to STAC 1.1 'other' (the
        # legacy 'proprietary' value is deprecated in 1.1).
        assert catalog["license"] == "other"

    def test_promoted_collection_retains_links(self, tmp_path: Path) -> None:
        """T032: promoted Collection retains all existing link relations."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="Plot 1"), plot_id="plot-1")

        catalog = open_catalog(catalog_path)
        link_rels = [link["rel"] for link in catalog["links"]]
        assert "root" in link_rels
        assert "self" in link_rels
        assert "item" in link_rels


class TestReadSummariesUS3:
    """Tests for User Story 3: Summary data available for CQL2 filter validation."""

    def test_read_summaries_returns_data_for_collection(self, tmp_path: Path) -> None:
        """T036: read_collection_summaries returns extent + summaries for promoted Collection."""
        catalog_path = create_catalog(tmp_path / "catalog")
        plot_id = create_plot(
            catalog_path,
            PlotMetadata(title="Plot", datetime=datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)),
            plot_id="plot-1",
        )

        add_features(
            catalog_path,
            plot_id,
            [
                {
                    "type": "Feature",
                    "id": "ref-a",
                    "geometry": {"type": "Point", "coordinates": [-5.0, 50.0]},
                    "properties": {
                        "kind": "POINT",
                        "name": "A",
                        "location_type": "WAYPOINT",
                        "style": {
                            "shape": "circle",
                            "radius": 6,
                            "fill_color": "#FF5733",
                            "color": "#000",
                        },
                    },
                },
            ],
        )

        result = read_collection_summaries(catalog_path)
        assert result is not None
        extent, summaries = result
        assert extent.bbox == (-5.0, 50.0, -5.0, 50.0)
        assert extent.temporal_start is not None

    def test_read_summaries_returns_none_for_catalog(self, tmp_path: Path) -> None:
        """T037: read_collection_summaries returns None for unpromoted Catalog."""
        catalog_path = create_catalog(tmp_path / "catalog")
        # Don't create any plots — catalog stays as Catalog type
        # Actually, create_catalog creates a Catalog, so just read it
        result = read_collection_summaries(catalog_path)
        assert result is None

    def test_mcp_tool_returns_expected_format(self, tmp_path: Path) -> None:
        """T038: MCP tool read_collection_summaries returns expected response format."""
        from debrief_stac.mcp_server import mcp_read_collection_summaries

        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(
            catalog_path,
            PlotMetadata(title="Plot", datetime=datetime(2024, 6, 15, 12, 0, 0, tzinfo=UTC)),
            plot_id="plot-1",
        )

        result = mcp_read_collection_summaries(str(catalog_path))
        assert result["promoted"] is True
        assert "extent" in result
        assert "summaries" in result
        assert "temporal" in result["extent"]
        assert "spatial" in result["extent"]

    def test_mcp_tool_returns_not_promoted(self, tmp_path: Path) -> None:
        """MCP tool returns promoted=False for unpromoted Catalog."""
        from debrief_stac.mcp_server import mcp_read_collection_summaries

        catalog_path = create_catalog(tmp_path / "catalog")
        result = mcp_read_collection_summaries(str(catalog_path))
        assert result["promoted"] is False


class TestDeletionRebuildUS4:
    """Tests for User Story 4: Summary accuracy after item deletion."""

    def test_delete_item_contracts_temporal_range(self, tmp_path: Path) -> None:
        """T044: delete item with latest end date → temporal range contracts."""
        catalog_path = create_catalog(tmp_path / "catalog")

        # Create 3 plots with different dates
        p1 = create_plot(
            catalog_path,
            PlotMetadata(title="Early", datetime=datetime(2024, 1, 1, tzinfo=UTC)),
            plot_id="early",
        )
        p2 = create_plot(
            catalog_path,
            PlotMetadata(title="Mid", datetime=datetime(2024, 6, 15, tzinfo=UTC)),
            plot_id="mid",
        )
        p3 = create_plot(
            catalog_path,
            PlotMetadata(title="Late", datetime=datetime(2025, 12, 31, tzinfo=UTC)),
            plot_id="late",
        )

        # Add features to give them bboxes and trigger promotion
        for pid in [p1, p2, p3]:
            add_features(
                catalog_path,
                pid,
                [
                    {
                        "type": "Feature",
                        "id": f"{pid}-feat-1",
                        "geometry": {"type": "Point", "coordinates": [0, 0]},
                        "properties": {
                            "kind": "POINT",
                            "name": f"{pid} feature",
                            "location_type": "WAYPOINT",
                            "style": {
                                "shape": "circle",
                                "radius": 6,
                                "fill_color": "#FF5733",
                                "color": "#000",
                            },
                        },
                    },
                ],
            )

        catalog = open_catalog(catalog_path)
        # PlotMetadata stores datetime with timezone, which Python serialises as +00:00
        assert "2025-12-31" in catalog["extent"]["temporal"]["interval"][0][1]

        # Delete feature from the late plot, then remove the link manually
        # (simulating item deletion by removing the item link and triggering rebuild)
        delete_features(catalog_path, "late", ["late-feat-1"])

        # The delete_features triggers rebuild. But we need to simulate
        # actual item removal from catalog. Let's do a rebuild after removing link.
        from debrief_stac.catalog import _save_catalog

        catalog_data = open_catalog(catalog_path)

        # Remove the "late" item link
        catalog_data["links"] = [
            link
            for link in catalog_data["links"]
            if not (link.get("rel") == "item" and "late" in link.get("href", ""))
        ]
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

        catalog = open_catalog(catalog_path)
        # Temporal range should now end at mid's date
        assert "2024-06-15" in catalog["extent"]["temporal"]["interval"][0][1]

    def test_delete_item_removes_unique_platform(self, tmp_path: Path) -> None:
        """T045: delete item with unique platform → platform removed from summaries."""
        catalog_path = create_catalog(tmp_path / "catalog")

        create_plot(catalog_path, PlotMetadata(title="P1"), plot_id="p1")
        create_plot(catalog_path, PlotMetadata(title="P2"), plot_id="p2")

        # Set platforms on each item
        platforms_by_plot = {
            "p1": [{"id": "NELSON", "vessel_class": "frigate"}],
            "p2": [{"id": "MASON", "vessel_class": "submarine"}],
        }
        for pid, platforms in platforms_by_plot.items():
            item = read_plot(catalog_path, pid)
            item["properties"]["debrief:platforms"] = platforms
            with open(catalog_path / pid / "item.json", "w") as f:
                json.dump(item, f, indent=2)

        from debrief_stac.catalog import _save_catalog

        catalog_data = open_catalog(catalog_path)
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

        catalog = open_catalog(catalog_path)
        platform_ids = {p["id"] for p in catalog["summaries"]["debrief:platforms"]}
        assert "NELSON" in platform_ids
        assert "MASON" in platform_ids

        # Remove p2 link and rebuild
        catalog_data = open_catalog(catalog_path)
        catalog_data["links"] = [
            link
            for link in catalog_data["links"]
            if not (link.get("rel") == "item" and "p2" in link.get("href", ""))
        ]
        rebuild_collection_summaries(catalog_data, catalog_path)
        _save_catalog(catalog_path, catalog_data)

        catalog = open_catalog(catalog_path)
        platform_ids_after = {p["id"] for p in catalog["summaries"]["debrief:platforms"]}
        assert "NELSON" in platform_ids_after
        assert "MASON" not in platform_ids_after

    def test_delete_all_items_clears_summaries(self, tmp_path: Path) -> None:
        """T046: delete all items → summaries empty."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="P1"), plot_id="p1")

        from debrief_stac.catalog import _save_catalog

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"

        # Remove all item links and rebuild
        catalog["links"] = [link for link in catalog["links"] if link.get("rel") != "item"]
        rebuild_collection_summaries(catalog, catalog_path)
        _save_catalog(catalog_path, catalog)

        catalog = open_catalog(catalog_path)
        assert catalog["type"] == "Collection"
        assert catalog["extent"]["temporal"]["interval"] == [[None, None]]
        # spec 241 — empty summary keys are now omitted (STAC 1.1 minItems=1).
        for key in [
            "debrief:platforms",
            "debrief:tags",
            "debrief:feature_tags",
        ]:
            assert key not in catalog["summaries"]

    def test_dangling_link_raises_plot_not_found(self, tmp_path: Path) -> None:
        """T047: dangling item link during rebuild → PlotNotFoundError."""
        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="P1"), plot_id="p1")

        # Remove the item directory but keep the catalog link
        import shutil

        shutil.rmtree(catalog_path / "p1")

        catalog_data = open_catalog(catalog_path)
        with pytest.raises(PlotNotFoundError):
            rebuild_collection_summaries(catalog_data, catalog_path)


# ---------------------------------------------------------------------------
# Spec 241 — Collection factory emits STAC 1.1.0 with item_assets, providers,
# license migration, and rel='license' link when license=='other'.
# ---------------------------------------------------------------------------

import sys as _sys

_sys.path.insert(0, str(Path(__file__).parent))
from _stac_schema_harness import validate_stac_collection as _validate_stac_collection  # noqa: E402

import jsonschema as _jsonschema  # noqa: E402

_COLLECTION_SHAPE_CONTRACT_PATH = (
    Path(__file__).parent.parent.parent.parent
    / "specs"
    / "241-stac-best-practices-upgrade"
    / "contracts"
    / "collection-shape.schema.json"
)


def _validate_against_collection_contract(collection: dict) -> None:
    with open(_COLLECTION_SHAPE_CONTRACT_PATH) as f:
        schema = json.load(f)
    _jsonschema.validate(instance=collection, schema=schema)


@pytest.fixture
def populated_collection(tmp_path: Path) -> Path:
    """Collection with one Item — exercises promotion + envelope."""
    from debrief_stac.features import add_features
    from debrief_stac.thumbnails import store_thumbnail

    catalog_path = create_catalog(tmp_path / "catalog")
    plot_id = create_plot(catalog_path, PlotMetadata(title="Spec 241 Plot"), plot_id="p1")

    feature = {
        "type": "Feature",
        "id": "ref-1",
        "geometry": {"type": "Point", "coordinates": [-4.5, 50.5]},
        "properties": {
            "kind": "POINT",
            "name": "X",
            "location_type": "WAYPOINT",
            "style": {
                "shape": "circle",
                "radius": 6,
                "fill_color": "#FF5733",
                "color": "#000",
            },
        },
    }
    add_features(catalog_path, plot_id, [feature])
    store_thumbnail(catalog_path, plot_id, b"large", b"small")

    return catalog_path


class TestSpec241CollectionShape:
    """T024 — Collection validates against contracts/collection-shape.schema.json
    AND the official STAC 1.1 Collection Schema. Covers FR-010, 11, 12, 14."""

    def test_validates_against_contract_and_official_schema(
        self, populated_collection: Path
    ) -> None:
        catalog = open_catalog(populated_collection)
        _validate_against_collection_contract(catalog)
        _validate_stac_collection(catalog)

    def test_stac_version_is_1_1_0(self, populated_collection: Path) -> None:
        catalog = open_catalog(populated_collection)
        assert catalog["stac_version"] == "1.1.0"

    def test_license_not_proprietary(self, populated_collection: Path) -> None:
        catalog = open_catalog(populated_collection)
        assert catalog["license"] not in ("proprietary", "various")

    def test_providers_populated(self, populated_collection: Path) -> None:
        catalog = open_catalog(populated_collection)
        providers = catalog["providers"]
        assert isinstance(providers, list) and len(providers) >= 1
        for p in providers:
            assert {"name", "roles"} <= set(p.keys())
            assert set(p["roles"]).issubset({"licensor", "producer", "processor", "host"})

    def test_item_assets_keys_match_contract(self, populated_collection: Path) -> None:
        catalog = open_catalog(populated_collection)
        item_assets = catalog["item_assets"]
        for required_key in ("features", "thumbnail", "overview", "source", "scene-thumbnail"):
            assert required_key in item_assets
        # item_assets entries must NOT carry href (they describe the contract).
        for key, asset in item_assets.items():
            assert "href" not in asset, f"item_assets.{key} must not include href"


class TestSpec241SummariesUnchanged:
    """T025 — Collection summaries contents unchanged from 1.0 baseline (FR-013)."""

    def test_summaries_unchanged_after_envelope_migration(self, tmp_path: Path) -> None:
        from debrief_stac.features import add_features

        catalog_path = create_catalog(tmp_path / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Summaries"), plot_id="s1")

        # Set debrief:* on the item before promotion.
        item = read_plot(catalog_path, plot_id)
        item["properties"]["debrief:tags"] = ["alpha", "bravo"]
        item["properties"]["debrief:feature_tags"] = ["t1", "t2"]
        item["properties"]["debrief:platforms"] = [
            {"id": "P1", "name": "Plat1", "nationality": "GB", "vessel_class": "x"}
        ]
        with open(catalog_path / plot_id / "item.json", "w") as f:
            json.dump(item, f, indent=2)
        add_features(
            catalog_path,
            plot_id,
            [
                {
                    "type": "Feature",
                    "id": "ref",
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                    "properties": {
                        "kind": "POINT",
                        "name": "X",
                        "location_type": "WAYPOINT",
                        "style": {
                            "shape": "circle",
                            "radius": 6,
                            "fill_color": "#FF5733",
                            "color": "#000",
                        },
                    },
                }
            ],
        )

        catalog = open_catalog(catalog_path)
        summaries = catalog["summaries"]

        # Same keys + same value sets as a 1.0 baseline would have produced.
        assert sorted(summaries["debrief:tags"]) == ["alpha", "bravo"]
        assert sorted(summaries["debrief:feature_tags"]) == ["t1", "t2"]
        assert summaries["debrief:platforms"] == [
            {"id": "P1", "name": "Plat1", "nationality": "GB", "vessel_class": "x"}
        ]


class TestSpec241LicenseLink:
    """T026 — license=='other' requires rel='license' link; SPDX values do not."""

    def test_license_other_emits_license_link(self, populated_collection: Path) -> None:
        catalog = open_catalog(populated_collection)
        assert catalog["license"] == "other"
        license_links = [link for link in catalog["links"] if link.get("rel") == "license"]
        assert len(license_links) == 1, "expected exactly one rel='license' link"

    def test_spdx_license_does_not_require_link(self, tmp_path: Path) -> None:
        from debrief_stac.catalog import _save_catalog

        catalog_path = create_catalog(tmp_path / "catalog")
        create_plot(catalog_path, PlotMetadata(title="SPDX"), plot_id="x1")

        catalog = open_catalog(catalog_path)
        catalog["license"] = "CC-BY-4.0"
        # Strip any auto-added license link to mirror the SPDX path explicitly.
        catalog["links"] = [
            link for link in catalog.get("links", []) if link.get("rel") != "license"
        ]
        _save_catalog(catalog_path, catalog)

        # Re-running rebuild must NOT introduce a license link for SPDX.
        from debrief_stac.collection import rebuild_collection_summaries

        catalog = open_catalog(catalog_path)
        rebuild_collection_summaries(catalog, catalog_path)
        _save_catalog(catalog_path, catalog)
        catalog = open_catalog(catalog_path)
        assert catalog["license"] == "CC-BY-4.0"
        license_links = [link for link in catalog["links"] if link.get("rel") == "license"]
        assert license_links == []
