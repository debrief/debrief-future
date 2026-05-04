"""
Tests for plot (STAC Item) operations (User Stories 2 & 3)
and temporal metadata (Feature #137).

Following TDD: Write tests first, ensure they fail, then implement.
"""

import json
from collections.abc import Sequence
from pathlib import Path

import pytest

from debrief_stac.catalog import create_catalog, open_catalog
from debrief_stac.exceptions import PlotNotFoundError
from debrief_stac.features import add_features
from debrief_stac.models import PlotMetadata
from debrief_stac.plot import create_plot, read_plot, update_temporal_metadata
from debrief_stac.types import STAC_VERSION


def _write_features_raw(catalog_path: Path, plot_id: str, features: Sequence[dict]) -> None:
    """Write features directly to disk, bypassing schema validation.

    Used by tests that exercise temporal metadata extraction on non-schema
    feature types (SENSOR_CONTACT, NARRATIVE, PERIODTEXT, etc.) which
    are rejected by catalog_write validation.
    """
    plot_dir = Path(catalog_path) / plot_id
    features_path = plot_dir / "features.geojson"
    if features_path.exists():
        with open(features_path) as f:
            fc = json.load(f)
    else:
        fc = {"type": "FeatureCollection", "features": []}
    fc["features"].extend(features)
    with open(features_path, "w") as f:
        json.dump(fc, f, indent=2)


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


_track_counter = 0


def _make_track(
    name: str,
    start_time: str,
    end_time: str,
    coords: list[list[float]] | None = None,
) -> dict:
    """Helper: build a schema-valid TRACK feature with start_time/end_time."""
    global _track_counter  # noqa: PLW0603
    _track_counter += 1
    if coords is None:
        coords = [[-5.0, 50.0], [-4.0, 50.5]]
    return {
        "type": "Feature",
        "id": f"track-{name.lower()}-{_track_counter}",
        "geometry": {"type": "LineString", "coordinates": coords},
        "properties": {
            "kind": "TRACK",
            "platform_id": name,
            "platform_name": name,
            "track_type": "OWNSHIP",
            "start_time": start_time,
            "end_time": end_time,
            "positions": [
                {"time": start_time, "course": 45, "speed": 12},
                {"time": end_time, "course": 45, "speed": 12},
            ],
            "style": {
                "line": {"color": "#0066CC"},
                "point": {"shape": "circle", "radius": 4, "fill_color": "#0066CC", "color": "#FFF"},
            },
            "default_position_style": {
                "show_symbol": False,
                "symbol": "circle",
                "show_label": False,
            },
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

        # Add a non-track feature (bypasses schema validation — WAYPOINT not in schema)
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [-4.0, 50.0]},
                "properties": {"name": "Waypoint", "kind": "WAYPOINT"},
            }
        ]
        _write_features_raw(catalog_path, plot_id, features)

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

        # Deliberately incomplete TRACK — bypasses validation to test edge case
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": [[-5, 50], [-4, 50.5]]},
                "properties": {"name": "Track-no-time", "kind": "TRACK"},
            }
        ]
        _write_features_raw(catalog_path, plot_id, features)

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
        _write_features_raw(catalog_path, plot_id, features)

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
        _write_features_raw(catalog_path, plot_id, features)

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
        _write_features_raw(catalog_path, plot_id, features)

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
        _write_features_raw(catalog_path, plot_id, features)

        result = update_temporal_metadata(catalog_path, plot_id)

        assert result is not None
        assert result.start_datetime == "2010-01-12T12:20:00+00:00"
        assert result.end_datetime == "2010-01-12T12:24:00+00:00"


# ---------------------------------------------------------------------------
# Spec 241 — Item factory emits STAC 1.1.0 with standard metadata extensions
# ---------------------------------------------------------------------------

import sys as _sys  # noqa: E402
import time as _time  # noqa: E402

import jsonschema as _jsonschema  # noqa: E402

_sys.path.insert(0, str(Path(__file__).parent))
from _stac_schema_harness import validate_stac_item as _validate_stac_item  # noqa: E402

from debrief_stac._helpers import (  # noqa: E402
    STAC_EXTENSION_DEBRIEF,
    STAC_EXTENSION_FILE,
    STAC_EXTENSION_PROCESSING,
    multihash_sha256,
    multihash_sha256_bytes,
)

_REPO_ROOT = Path(__file__).parent.parent.parent.parent
_ITEM_SHAPE_CONTRACT_PATH = (
    _REPO_ROOT
    / "specs"
    / "241-stac-best-practices-upgrade"
    / "contracts"
    / "item-shape.schema.json"
)
_SCENE_THUMBNAIL_OVERLAY_PATH = (
    _REPO_ROOT / "shared" / "schemas" / "contracts" / "scene-thumbnail-asset.schema.json"
)
_LINKML_BUNDLE_PATH = (
    _REPO_ROOT
    / "shared"
    / "schemas"
    / "src"
    / "generated"
    / "json-schema"
    / "debrief.schema.json"
)


def _validate_against_contract(item: dict) -> None:
    """Validate against contracts/item-shape.schema.json.

    The contract `$ref`s the scene-thumbnail overlay (spec 243), which in
    turn `$ref`s the LinkML-generated SceneThumbnailAssetEntry. We register
    both schemas in a `referencing.Registry` so the draft-07 validator can
    resolve the chain at validation time.
    """
    from referencing import Registry, Resource  # type: ignore[import-untyped]

    with open(_ITEM_SHAPE_CONTRACT_PATH) as f:
        schema = json.load(f)
    overlay = json.loads(_SCENE_THUMBNAIL_OVERLAY_PATH.read_text())
    bundle = json.loads(_LINKML_BUNDLE_PATH.read_text())
    registry: Registry = Registry().with_resources(  # type: ignore[type-arg]
        [
            (overlay["$id"], Resource.from_contents(overlay)),
            (bundle["$id"], Resource.from_contents(bundle)),
        ]
    )
    validator = _jsonschema.Draft7Validator(schema, registry=registry)
    validator.validate(item)


@pytest.fixture
def populated_item(tmp_path: Path) -> tuple[Path, str]:
    """Plot + features + source asset + thumbnails — full FR-001..FR-009 shape."""
    from debrief_stac.assets import add_asset
    from debrief_stac.thumbnails import store_thumbnail

    catalog_path = create_catalog(tmp_path / "catalog")
    metadata = PlotMetadata(title="Spec 241 Plot", description="End-to-end")
    plot_id = create_plot(catalog_path, metadata, plot_id="plot-241")

    feature = {
        "type": "Feature",
        "id": "ref-1",
        "geometry": {"type": "Point", "coordinates": [-4.5, 50.5]},
        "properties": {
            "kind": "POINT",
            "name": "Test",
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

    source_file = tmp_path / "source.rep"
    source_file.write_text("source data")
    add_asset(catalog_path, plot_id, source_file)

    store_thumbnail(catalog_path, plot_id, b"\x89PNG\r\nlarge", b"\x89PNG\r\nsmall")

    return catalog_path, plot_id


class TestSpec241ItemFactoryShape:
    """T018 — Item validates against contracts/item-shape.schema.json AND
    against the official STAC 1.1 Item Schema. Covers FR-001..FR-005."""

    def test_validates_against_contract_and_official_schema(
        self, populated_item: tuple[Path, str]
    ) -> None:
        catalog_path, plot_id = populated_item
        with open(catalog_path / plot_id / "item.json") as f:
            item = json.load(f)

        _validate_against_contract(item)
        _validate_stac_item(item)

    def test_stac_version_is_1_1_0(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        assert item["stac_version"] == "1.1.0"

    def test_declares_required_extensions(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        for uri in (STAC_EXTENSION_DEBRIEF, STAC_EXTENSION_PROCESSING, STAC_EXTENSION_FILE):
            assert uri in item["stac_extensions"], f"missing {uri}"

    def test_properties_required_metadata(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        props = item["properties"]
        assert "created" in props
        assert "updated" in props
        assert props["license"] == "other"
        assert props["license"] not in ("proprietary", "various")
        assert isinstance(props["providers"], list) and len(props["providers"]) >= 1
        for provider in props["providers"]:
            assert {"name", "roles"} <= set(provider.keys())
            assert set(provider["roles"]).issubset({"licensor", "producer", "processor", "host"})


class TestSpec241LifecycleTimestamps:
    """T019 — created preserved across edits; updated refreshed on every write;
    updated monotonic (≥ previous updated, ≥ created)."""

    def test_created_preserved_across_edits(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item_before = read_plot(catalog_path, plot_id)
        created = item_before["properties"]["created"]

        # Trigger another write via add_features.
        add_features(
            catalog_path,
            plot_id,
            [
                {
                    "type": "Feature",
                    "id": "ref-2",
                    "geometry": {"type": "Point", "coordinates": [-4.6, 50.6]},
                    "properties": {
                        "kind": "POINT",
                        "name": "B",
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

        item_after = read_plot(catalog_path, plot_id)
        assert item_after["properties"]["created"] == created

    def test_updated_refreshes_on_every_write(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        first_updated = read_plot(catalog_path, plot_id)["properties"]["updated"]
        # Sleep at least 1ms so the next iso_now_utc strictly differs.
        _time.sleep(0.005)
        from debrief_stac.thumbnails import store_thumbnail

        store_thumbnail(catalog_path, plot_id, b"large2", b"small2")
        second_updated = read_plot(catalog_path, plot_id)["properties"]["updated"]
        assert second_updated > first_updated

    def test_updated_monotonic(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        assert item["properties"]["updated"] >= item["properties"]["created"]


class TestSpec241SourceAssetCoPublishing:
    """T020 — processing:* + file:* mirror debrief:provenance for source assets."""

    def test_source_asset_carries_processing_fields(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        source_assets = {k: v for k, v in item["assets"].items() if k.startswith("source")}
        assert source_assets, "expected at least one source-* asset"
        for _key, asset in source_assets.items():
            assert "debrief:provenance" in asset
            assert "processing:software" in asset
            assert "processing:datetime" in asset
            # Software map values are strings (versions).
            for name, version in asset["processing:software"].items():
                assert isinstance(name, str) and isinstance(version, str)

    def test_source_asset_has_file_size_and_checksum_when_disk_backed(
        self, populated_item: tuple[Path, str]
    ) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        source_assets = [v for k, v in item["assets"].items() if k.startswith("source")]
        assert source_assets
        for asset in source_assets:
            # Asset bytes copied to ./assets/ — both fields must be present.
            assert "file:size" in asset and isinstance(asset["file:size"], int)
            assert "file:checksum" in asset and isinstance(asset["file:checksum"], str)
            asset_path = catalog_path / plot_id / asset["href"].lstrip("./")
            assert asset["file:size"] == asset_path.stat().st_size
            assert asset["file:checksum"] == multihash_sha256(asset_path)


class TestSpec241ThumbnailPair:
    """T021 — assets.thumbnail (200x150) + assets.overview (800x600) shape
    with proj:shape, file:size, file:checksum."""

    def test_thumbnail_small_variant_proj_shape(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        assert item["assets"]["thumbnail"]["proj:shape"] == [150, 200]

    def test_overview_large_variant_proj_shape(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        assert item["assets"]["overview"]["proj:shape"] == [600, 800]

    def test_both_have_file_size_and_checksum(self, populated_item: tuple[Path, str]) -> None:
        catalog_path, plot_id = populated_item
        item = read_plot(catalog_path, plot_id)
        for key in ("thumbnail", "overview"):
            asset = item["assets"][key]
            assert "file:size" in asset and asset["file:size"] > 0
            assert "file:checksum" in asset and asset["file:checksum"].startswith("1220")


class TestSpec241SourceAssetMissingPath:
    """Edge case in spec — when source bytes aren't reachable, file:size and
    file:checksum are omitted (not zero, not null)."""

    def test_unreachable_source_omits_file_fields(self, tmp_path: Path) -> None:
        # add_asset only attaches assets it can actually copy from disk, so the
        # only way to exercise this branch is to mutate the asset entry after
        # the fact. The contract still holds for any code path that mints an
        # asset entry directly without on-disk bytes (e.g. derived_from URI).
        catalog_path = create_catalog(tmp_path / "catalog")
        plot_id = create_plot(catalog_path, PlotMetadata(title="Edge"), plot_id="edge-1")

        item = read_plot(catalog_path, plot_id)
        item["assets"]["source-external"] = {
            "href": "/path/that/does/not/exist.dat",
            "type": "application/octet-stream",
            "roles": ["source"],
            "debrief:provenance": {"source_path": "/missing", "tool_version": "x"},
            "processing:software": {"x": "1"},
            "processing:datetime": "2026-05-02T10:00:00.000Z",
        }
        from debrief_stac.plot import _save_plot

        _save_plot(catalog_path, plot_id, item)

        item = read_plot(catalog_path, plot_id)
        external = item["assets"]["source-external"]
        # Confirm the un-hashed asset has neither field.
        assert "file:size" not in external
        assert "file:checksum" not in external


def test_multihash_bytes_helper_round_trip() -> None:
    """Cheap consistency check used by the file:checksum assertions above."""
    assert multihash_sha256_bytes(b"x") == multihash_sha256_bytes(b"x")
