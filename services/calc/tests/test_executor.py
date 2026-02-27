"""Unit tests for debrief-calc executor."""

from collections.abc import Iterator

import pytest
from debrief_calc.executor import run
from debrief_calc.models import ContextType, SelectionContext


@pytest.fixture(autouse=True)
def setup_registry() -> Iterator[None]:
    """Ensure registry has test tools."""
    # Import built-in tools to register them
    yield


@pytest.fixture
def single_track_context() -> SelectionContext:
    """Create a single track selection context."""
    feature = {
        "type": "Feature",
        "id": "track-001",
        "properties": {"kind": "TRACK", "name": "Test Track"},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-4.5, 50.2, 0, 1705305600000],
                [-4.4, 50.3, 0, 1705309200000],
                [-4.3, 50.4, 0, 1705312800000],
            ],
        },
    }
    return SelectionContext(type=ContextType.SINGLE, features=[feature])


@pytest.fixture
def multi_track_context() -> SelectionContext:
    """Create a multi track selection context."""
    feature1 = {
        "type": "Feature",
        "id": "track-alpha",
        "properties": {
            "kind": "TRACK",
            "name": "Alpha",
            "times": [1705305600000, 1705309200000],
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-5.0, 50.0, 0, 1705305600000], [-4.5, 50.2, 0, 1705309200000]],
        },
    }
    feature2 = {
        "type": "Feature",
        "id": "track-bravo",
        "properties": {
            "kind": "TRACK",
            "name": "Bravo",
            "times": [1705305600000, 1705309200000],
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[-4.0, 50.5, 0, 1705305600000], [-4.5, 50.3, 0, 1705309200000]],
        },
    }
    return SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])


@pytest.fixture
def region_context() -> SelectionContext:
    """Create a region selection context."""
    return SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.5, -3.0, 51.0])


class TestRunSuccess:
    """Tests for successful tool execution."""

    def test_run_track_stats(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.tool == "track-stats"
        assert result.error is None
        assert result.duration_ms > 0
        assert result.features is not None
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "track/statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_range_bearing(self, multi_track_context: SelectionContext) -> None:
        result = run("range-bearing", multi_track_context)

        assert result.success is True
        assert result.tool == "range-bearing"
        assert result.features is not None
        assert len(result.features) == 1  # single GeoJSON Feature wrapper

        feature = result.features[0]
        assert feature["type"] == "Feature"
        assert feature["properties"]["kind"] == "dataset/range_bearing_series"
        assert "__datasets" in feature["properties"]
        datasets = feature["properties"]["__datasets"]
        assert len(datasets) == 2
        for dataset in datasets:
            assert dataset["type"] == "range_bearing_series"
            assert len(dataset["series"][0]["data"]) == 2

    def test_run_area_summary(self) -> None:
        # area-summary now uses MULTI context type, extracts bounds from features (#107)
        features = [
            {
                "type": "Feature",
                "id": "zone-1",
                "properties": {"kind": "RECTANGLE"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[[-5.0, 49.5], [-3.0, 49.5], [-3.0, 51.0], [-5.0, 51.0], [-5.0, 49.5]]],
                },
            }
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        result = run("area-summary", context)

        assert result.success is True
        assert result.tool == "area-summary"
        assert result.features is not None
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "region/statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_with_parameters(self, multi_track_context: SelectionContext) -> None:
        result = run("range-bearing", multi_track_context, params={})

        assert result.success is True
        assert result.features is not None
        assert len(result.features) == 1  # single wrapper with time-series

    def test_provenance_attached(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.features is not None
        provenance = result.features[0]["properties"]["provenance"]

        # Provenance is now an array of PROV-aligned entries
        assert isinstance(provenance, list)
        assert len(provenance) == 1

        entry = provenance[0]
        assert "activityId" in entry
        assert "timestamp" in entry
        assert "executionDuration" in entry

        wgb = entry["wasGeneratedBy"]
        assert wgb["tool"] == "track-stats"
        assert wgb["toolVersion"] == "1.0.0"
        assert entry["used"] == ["track-001"]


class TestRunErrors:
    """Tests for error handling in tool execution."""

    def test_tool_not_found(self, single_track_context: SelectionContext) -> None:
        result = run("nonexistent-tool", single_track_context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "TOOL_NOT_FOUND"
        assert "nonexistent-tool" in result.error.message

    def test_invalid_context_type(self, multi_track_context: SelectionContext) -> None:
        # track-stats requires SINGLE, we're giving MULTI
        result = run("track-stats", multi_track_context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "INVALID_CONTEXT"
        assert "single" in result.error.message.lower()
        assert "multi" in result.error.message.lower()

    def test_kind_mismatch(self) -> None:
        # Create context with zone kind, but try track-stats which wants track
        feature = {
            "type": "Feature",
            "id": "zone-001",
            "properties": {"kind": "ZONE"},
            "geometry": None,
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])

        result = run("track-stats", context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "KIND_MISMATCH"


class TestRunDuration:
    """Tests for execution duration tracking."""

    def test_duration_is_positive(self, single_track_context: SelectionContext) -> None:
        result = run("track-stats", single_track_context)
        assert result.duration_ms > 0

    def test_duration_on_error(self, single_track_context: SelectionContext) -> None:
        result = run("nonexistent-tool", single_track_context)
        assert result.duration_ms > 0  # Duration tracked even on error
