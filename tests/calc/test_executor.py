"""Unit tests for debrief-calc executor."""

import pytest

from debrief_calc.models import ContextType, SelectionContext, Tool
from debrief_calc.registry import registry
from debrief_calc.executor import run


@pytest.fixture(autouse=True)
def setup_registry():
    """Ensure registry has test tools."""
    # Import built-in tools to register them
    from debrief_calc.tools import track_stats, range_bearing, area_summary
    yield


@pytest.fixture
def single_track_context():
    """Create a single track selection context."""
    feature = {
        "type": "Feature",
        "id": "track-001",
        "properties": {"kind": "track", "name": "Test Track"},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-4.5, 50.2, 0, 1705305600000],
                [-4.4, 50.3, 0, 1705309200000],
                [-4.3, 50.4, 0, 1705312800000]
            ]
        }
    }
    return SelectionContext(type=ContextType.SINGLE, features=[feature])


@pytest.fixture
def multi_track_context():
    """Create a multi track selection context."""
    feature1 = {
        "type": "Feature",
        "id": "track-alpha",
        "properties": {"kind": "track", "name": "Alpha"},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-5.0, 50.0, 0, 1705305600000],
                [-4.5, 50.2, 0, 1705309200000]
            ]
        }
    }
    feature2 = {
        "type": "Feature",
        "id": "track-bravo",
        "properties": {"kind": "track", "name": "Bravo"},
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [-4.0, 50.5, 0, 1705305600000],
                [-4.5, 50.3, 0, 1705309200000]
            ]
        }
    }
    return SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])


@pytest.fixture
def region_context():
    """Create a region selection context."""
    return SelectionContext(
        type=ContextType.REGION,
        bounds=[-5.0, 49.5, -3.0, 51.0]
    )


class TestRunSuccess:
    """Tests for successful tool execution."""

    def test_run_track_stats(self, single_track_context):
        result = run("track-stats", single_track_context)

        assert result.success is True
        assert result.tool == "track-stats"
        assert result.error is None
        assert result.duration_ms > 0
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "track-statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_range_bearing(self, multi_track_context):
        result = run("range-bearing", multi_track_context)

        assert result.success is True
        assert result.tool == "range-bearing"
        assert len(result.features) == 3  # start, mid, end

        for feature in result.features:
            assert feature["properties"]["kind"] == "range-bearing"
            assert "provenance" in feature["properties"]
            assert "range_nm" in feature["properties"]
            assert "bearing_deg" in feature["properties"]

    def test_run_area_summary(self, region_context):
        result = run("area-summary", region_context)

        assert result.success is True
        assert result.tool == "area-summary"
        assert len(result.features) == 1

        feature = result.features[0]
        assert feature["properties"]["kind"] == "area-statistics"
        assert "provenance" in feature["properties"]
        assert "statistics" in feature["properties"]

    def test_run_with_parameters(self, multi_track_context):
        result = run("range-bearing", multi_track_context, params={"sample_points": "midpoint"})

        assert result.success is True
        assert len(result.features) == 1  # Only midpoint

    def test_provenance_attached(self, single_track_context):
        result = run("track-stats", single_track_context)

        assert result.success is True
        provenance = result.features[0]["properties"]["provenance"]

        assert provenance["tool"] == "track-stats"
        assert provenance["version"] == "1.0.0"
        assert "timestamp" in provenance
        assert len(provenance["sources"]) == 1
        assert provenance["sources"][0]["id"] == "track-001"
        assert provenance["sources"][0]["kind"] == "track"


class TestRunErrors:
    """Tests for error handling in tool execution."""

    def test_tool_not_found(self, single_track_context):
        result = run("nonexistent-tool", single_track_context)

        assert result.success is False
        assert result.error is not None
        assert result.error.code == "TOOL_NOT_FOUND"
        assert "nonexistent-tool" in result.error.message

    def test_invalid_context_type(self, multi_track_context):
        # track-stats requires SINGLE, we're giving MULTI
        result = run("track-stats", multi_track_context)

        assert result.success is False
        assert result.error.code == "INVALID_CONTEXT"
        assert "single" in result.error.message.lower()
        assert "multi" in result.error.message.lower()

    def test_kind_mismatch(self):
        # Create context with zone kind, but try track-stats which wants track
        feature = {
            "type": "Feature",
            "id": "zone-001",
            "properties": {"kind": "zone"},
            "geometry": None
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])

        result = run("track-stats", context)

        assert result.success is False
        assert result.error.code == "KIND_MISMATCH"


class TestRunDuration:
    """Tests for execution duration tracking."""

    def test_duration_is_positive(self, single_track_context):
        result = run("track-stats", single_track_context)
        assert result.duration_ms > 0

    def test_duration_on_error(self, single_track_context):
        result = run("nonexistent-tool", single_track_context)
        assert result.duration_ms > 0  # Duration tracked even on error
