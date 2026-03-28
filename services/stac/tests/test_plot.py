"""
Tests for plot (STAC Item) operations (User Stories 2 & 3)
and temporal metadata (Feature #137).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot, update_temporal_metadata
from debrief_stac.types import STAC_VERSION


class TestCreatePlot:
    """Tests for create_plot() function - User Story 2."""

    def test_create_plot_with_valid_metadata(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T018: Given an existing catalog and valid PlotMetadata,
        When create_plot() is called, Then a new STAC Item is created.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Verify plot ID returned
        assert plot_id is not None
        assert isinstance(plot_id, str)

        # Verify plot directory created
        plot_dir = catalog_path / plot_id
        assert plot_dir.exists()
        assert plot_dir.is_dir()

        # Verify item.json created with correct structure
        item_path = plot_dir / "item.json"
        assert item_path.exists()

        with open(item_path) as f:
            item_data = json.load(f)

        assert item_data["type"] == "Feature"
        assert item_data["stac_version"] == STAC_VERSION
        assert item_data["id"] == plot_id

    def test_create_plot_updates_catalog_links(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T019: Given a created plot, When catalog is read,
        Then plot appears in catalog links.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata)

        # Re-read catalog
        catalog_data = open_catalog(catalog_path)

        # Verify item link added
        item_links = [link for link in catalog_data["links"] if link["rel"] == "item"]
        assert len(item_links) == 1
        assert plot_id in item_links[0]["href"]

    def test_create_plot_item_link_uses_plot_title(self, temp_dir: Path) -> None:
        """Item link in catalog carries human-readable plot title (#135)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Exercise Alpha 2024")

        create_plot(catalog_path, metadata, plot_id="ex-alpha-2024")

        catalog_data = open_catalog(catalog_path)
        item_links = [link for link in catalog_data["links"] if link["rel"] == "item"]
        assert len(item_links) == 1
        assert item_links[0]["title"] == "Exercise Alpha 2024"

    def test_create_plot_structural_links_have_titles(self, temp_dir: Path) -> None:
        """Structural links (root, parent, self) in item.json carry titles (#135)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="My Plot")

        plot_id = create_plot(catalog_path, metadata, plot_id="my-plot")

        item = read_plot(catalog_path, plot_id)
        links_by_rel = {link["rel"]: link for link in item["links"]}

        assert links_by_rel["root"]["title"] == "Root catalog"
        assert links_by_rel["parent"]["title"] == "Parent catalog"
        assert links_by_rel["self"]["title"] == "My Plot"

    def test_create_plot_with_title_and_description(self, temp_dir: Path) -> None:
        """T020: Given PlotMetadata with title and description,
        When plot is created, Then STAC Item properties include them.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="My Analysis", description="Detailed track analysis")

        plot_id = create_plot(catalog_path, metadata)

        # Read the item
        item_path = catalog_path / plot_id / "item.json"
        with open(item_path) as f:
            item_data = json.load(f)

        assert item_data["properties"]["title"] == "My Analysis"
        assert item_data["properties"]["description"] == "Detailed track analysis"
        assert "datetime" in item_data["properties"]

    def test_create_plot_with_custom_id(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """create_plot with custom plot_id uses that ID."""
        catalog_path = create_catalog(temp_dir / "catalog")

        plot_id = create_plot(catalog_path, sample_plot_metadata, plot_id="my-custom-plot")

        assert plot_id == "my-custom-plot"
        assert (catalog_path / "my-custom-plot" / "item.json").exists()

    def test_create_plot_rejects_invalid_custom_id(self, temp_dir: Path) -> None:
        """Custom plot IDs must match [a-z0-9_-] (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Bad ID Plot")

        with pytest.raises(ValueError, match=r"\[a-z0-9_-\]"):
            create_plot(catalog_path, metadata, plot_id="Bad ID!")

    def test_create_plot_rejects_uppercase_id(self, temp_dir: Path) -> None:
        """Uppercase letters in custom plot IDs are rejected (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Upper")

        with pytest.raises(ValueError):
            create_plot(catalog_path, metadata, plot_id="MyPlot")

    def test_create_plot_accepts_valid_custom_id(self, temp_dir: Path) -> None:
        """Valid custom IDs with lowercase, digits, underscores, hyphens pass (#139)."""
        catalog_path = create_catalog(temp_dir / "catalog")
        metadata = PlotMetadata(title="Good ID")

        plot_id = create_plot(catalog_path, metadata, plot_id="exercise-alpha_2024")
        assert plot_id == "exercise-alpha_2024"


class TestReadPlot:
    """Tests for read_plot() function - User Story 3."""

    def test_read_plot_returns_complete_item(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T025: Given an existing plot ID, When read_plot() is called,
        Then complete STAC Item is returned.
        """
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        item = read_plot(catalog_path, plot_id)

        assert item["type"] == "Feature"
        assert item["stac_version"] == STAC_VERSION
        assert item["id"] == plot_id
        assert "properties" in item
        assert "links" in item
        assert "assets" in item

    def test_read_plot_not_found_raises_error(self, temp_dir: Path) -> None:
        """T026: Given a non-existent plot ID, When read_plot() is called,
        Then raises PlotNotFoundError.
        """
        catalog_path = create_catalog(temp_dir / "catalog")

        with pytest.raises(PlotNotFoundError) as exc_info:
            read_plot(catalog_path, "nonexistent-plot")

        assert "nonexistent-plot" in str(exc_info.value)

    def test_read_plot_includes_asset_hrefs(
        self, temp_dir: Path, sample_plot_metadata: PlotMetadata
    ) -> None:
        """T027: Given a plot with assets, When read, Then asset hrefs are included."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, sample_plot_metadata)

        item = read_plot(catalog_path, plot_id)

        # Assets should be present (even if empty initially)
        assert "assets" in item
        assert isinstance(item["assets"], dict)


def _make_track(
    name: str,
    start_time: str,
    end_time: str,
    coords: list[list[float]] | None = None,
) -> dict:
    """Helper: build a TRACK feature with start_time/end_time properties."""
    if coords is None:
        coords = [[-5.0, 50.0], [-4.0, 50.5]]
    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": {
            "name": name,
            "kind": "TRACK",
            "start_time": start_time,
            "end_time": end_time,
        },
    }


class TestUpdateTemporalMetadata:
    """Tests for update_temporal_metadata() — Feature #137."""

    # --- US1: Accurate temporal extent on loaded plots ---

    def test_multi_track_temporal_extent(self, temp_dir: Path) -> None:
        """T004: Multi-track file produces correct start_datetime/end_datetime."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Multi-track"))

        tracks = [
            _make_track("Alpha", "2022-08-27T09:00:00Z", "2022-09-01T12:00:00Z"),
            _make_track("Bravo", "2022-08-30T06:00:00Z", "2022-09-10T16:44:49Z"),
        ]
        add_features(catalog_path, plot_id, tracks)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2022-08-27T09:00:00Z"
        assert result.end_datetime == "2022-09-10T16:44:49Z"

        # Verify item on disk
        item = read_plot(catalog_path, plot_id)
        assert item["properties"]["start_datetime"] == "2022-08-27T09:00:00Z"
        assert item["properties"]["end_datetime"] == "2022-09-10T16:44:49Z"

    def test_single_track_temporal_extent(self, temp_dir: Path) -> None:
        """T005: Single track file produces correct temporal extent."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Single-track"))

        tracks = [_make_track("Alpha", "2022-08-27T09:00:00Z", "2022-09-01T12:00:00Z")]
        add_features(catalog_path, plot_id, tracks)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2022-08-27T09:00:00Z"
        assert result.end_datetime == "2022-09-01T12:00:00Z"

    def test_overlapping_track_time_ranges(self, temp_dir: Path) -> None:
        """T006: Overlapping tracks use global min/max."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Overlapping"))

        tracks = [
            _make_track("Alpha", "2022-08-27T09:00:00Z", "2022-09-05T12:00:00Z"),
            _make_track("Bravo", "2022-09-01T06:00:00Z", "2022-09-10T16:44:49Z"),
        ]
        add_features(catalog_path, plot_id, tracks)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2022-08-27T09:00:00Z"
        assert result.end_datetime == "2022-09-10T16:44:49Z"

    # --- US2: datetime equals earliest track timestamp ---

    def test_datetime_equals_earliest_start_time(self, temp_dir: Path) -> None:
        """T010: datetime is set to the earliest track start_time."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Datetime test"))

        tracks = [
            _make_track("Alpha", "2022-08-27T09:00:00Z", "2022-09-01T12:00:00Z"),
            _make_track("Bravo", "2022-08-30T06:00:00Z", "2022-09-10T16:44:49Z"),
        ]
        add_features(catalog_path, plot_id, tracks)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.datetime == "2022-08-27T09:00:00Z"

        item = read_plot(catalog_path, plot_id)
        assert item["properties"]["datetime"] == "2022-08-27T09:00:00Z"

    # --- US3: Graceful handling of edge cases ---

    def test_no_track_features_returns_none(self, temp_dir: Path) -> None:
        """T013: No tracks → return None, item unchanged."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="No tracks"))

        # Add a non-track feature
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-4.0, 50.0]},
                "properties": {"name": "Waypoint", "kind": "WAYPOINT"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        item_before = read_plot(catalog_path, plot_id)
        original_datetime = item_before["properties"]["datetime"]

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is None
        item_after = read_plot(catalog_path, plot_id)
        assert item_after["properties"]["datetime"] == original_datetime
        assert "start_datetime" not in item_after["properties"]
        assert "end_datetime" not in item_after["properties"]

    def test_single_position_track_start_equals_end(self, temp_dir: Path) -> None:
        """T014: Single position track → start == end == datetime."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Single pos"))

        tracks = [_make_track("Alpha", "2022-08-27T09:00:00Z", "2022-08-27T09:00:00Z")]
        add_features(catalog_path, plot_id, tracks)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2022-08-27T09:00:00Z"
        assert result.end_datetime == "2022-08-27T09:00:00Z"
        assert result.datetime == "2022-08-27T09:00:00Z"

    def test_tracks_without_temporal_properties_skipped(self, temp_dir: Path) -> None:
        """T015: Tracks missing start_time/end_time are skipped."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="No temporal"))

        features = [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[-5, 50], [-4, 50.5]]},
                "properties": {"name": "Track-no-time", "kind": "TRACK"},
            }
        ]
        add_features(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is None

    def test_no_features_geojson_returns_none(self, temp_dir: Path) -> None:
        """No features.geojson asset → return None."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Empty plot"))

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is None

    # --- Sensor/narrative temporal extraction ---

    def test_sensor_only_temporal_extent(self, temp_dir: Path) -> None:
        """Sensor-only plots derive temporal extent from sensor time properties."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Sensors"))

        features = [
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "kind": "SENSOR_CONTACT",
                    "time": "2010-01-12T12:00:00+00:00",
                    "parent_track": "OWNSHIP",
                },
            },
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "kind": "SENSOR_CONTACT",
                    "time": "2010-01-12T14:00:00+00:00",
                    "parent_track": "OWNSHIP",
                },
            },
        ]
        add_features(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2010-01-12T12:00:00+00:00"
        assert result.end_datetime == "2010-01-12T14:00:00+00:00"

    def test_narrative_only_temporal_extent(self, temp_dir: Path) -> None:
        """Narrative-only plots derive temporal extent from narrative time properties."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Narratives"))

        features = [
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "kind": "NARRATIVE",
                    "time": "1995-12-12T05:00:00+00:00",
                    "text": "First entry",
                },
            },
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "kind": "NARRATIVE",
                    "time": "1995-12-12T11:00:00+00:00",
                    "text": "Last entry",
                },
            },
        ]
        add_features(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "1995-12-12T05:00:00+00:00"
        assert result.end_datetime == "1995-12-12T11:00:00+00:00"

    def test_mixed_track_and_sensor_temporal_extent(self, temp_dir: Path) -> None:
        """Mixed track+sensor plots use global min/max across all types."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Mixed"))

        features = [
            _make_track("Alpha", "2010-01-12T13:00:00Z", "2010-01-12T14:00:00Z"),
            {
                "type": "Feature",
                "geometry": None,
                "properties": {
                    "kind": "SENSOR_CONTACT",
                    "time": "2010-01-12T12:00:00Z",
                    "parent_track": "Alpha",
                },
            },
        ]
        add_features(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        # Sensor contact at 12:00 is earlier than track start at 13:00
        assert result.start_datetime == "2010-01-12T12:00:00Z"
        assert result.end_datetime == "2010-01-12T14:00:00Z"

    def test_periodtext_temporal_extent(self, temp_dir: Path) -> None:
        """PERIODTEXT features contribute time_start/time_end to extent."""
        catalog_path = create_catalog(temp_dir / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="PeriodText"))

        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-4.0, 50.0]},
                "properties": {
                    "kind": "PERIODTEXT",
                    "time_start": "2010-01-12T12:20:00+00:00",
                    "time_end": "2010-01-12T12:24:00+00:00",
                    "text": "Hit_121220",
                },
            },
        ]
        add_features(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2010-01-12T12:20:00+00:00"
        assert result.end_datetime == "2010-01-12T12:24:00+00:00"
