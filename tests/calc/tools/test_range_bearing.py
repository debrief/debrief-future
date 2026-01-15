"""Unit tests for range-bearing tool."""

import pytest
import json
from pathlib import Path

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.range_bearing import range_bearing, _calculate_bearing, _calculate_range


@pytest.fixture
def tracks_pair_fixture():
    """Load the tracks pair fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "tracks-pair.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def multi_track_context(tracks_pair_fixture):
    """Create a context from the tracks pair fixture."""
    return SelectionContext(
        type=ContextType.MULTI,
        features=tracks_pair_fixture["features"]
    )


class TestCalculateBearing:
    """Tests for bearing calculation."""

    def test_bearing_due_north(self):
        bearing = _calculate_bearing(0.0, 50.0, 0.0, 51.0)
        assert abs(bearing - 0.0) < 1.0  # Approximately north

    def test_bearing_due_east(self):
        bearing = _calculate_bearing(0.0, 50.0, 1.0, 50.0)
        assert abs(bearing - 90.0) < 1.0  # Approximately east

    def test_bearing_due_south(self):
        bearing = _calculate_bearing(0.0, 51.0, 0.0, 50.0)
        assert abs(bearing - 180.0) < 1.0  # Approximately south

    def test_bearing_due_west(self):
        bearing = _calculate_bearing(1.0, 50.0, 0.0, 50.0)
        assert abs(bearing - 270.0) < 1.0  # Approximately west

    def test_bearing_range(self):
        # Bearing should always be 0-360
        bearing = _calculate_bearing(-5.0, 50.0, -4.0, 51.0)
        assert 0 <= bearing < 360


class TestCalculateRange:
    """Tests for range calculation."""

    def test_same_point_zero_range(self):
        range_nm = _calculate_range(-4.0, 50.0, -4.0, 50.0)
        assert range_nm == 0.0

    def test_known_range(self):
        # 1 degree latitude is approximately 60 nm
        range_nm = _calculate_range(0.0, 50.0, 0.0, 51.0)
        assert 59 < range_nm < 61


class TestRangeBearingTool:
    """Tests for the range-bearing tool handler."""

    def test_returns_three_features_by_default(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        assert isinstance(results, list)
        assert len(results) == 3  # start, mid, end

    def test_returns_one_feature_for_midpoint_only(self, multi_track_context):
        results = range_bearing(multi_track_context, {"sample_points": "midpoint"})

        assert len(results) == 1
        assert results[0]["properties"]["measurement_type"] == "midpoint"

    def test_returns_two_features_for_endpoints(self, multi_track_context):
        results = range_bearing(multi_track_context, {"sample_points": "endpoints"})

        assert len(results) == 2
        types = {r["properties"]["measurement_type"] for r in results}
        assert types == {"start", "end"}

    def test_result_is_linestring(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        for result in results:
            assert result["geometry"]["type"] == "LineString"
            assert len(result["geometry"]["coordinates"]) == 2

    def test_result_has_range_and_bearing(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        for result in results:
            props = result["properties"]
            assert "range_nm" in props
            assert "bearing_deg" in props
            assert isinstance(props["range_nm"], (int, float))
            assert isinstance(props["bearing_deg"], (int, float))

    def test_result_references_tracks(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        for result in results:
            props = result["properties"]
            assert "from_track" in props
            assert "to_track" in props

    def test_bearing_is_valid_range(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        for result in results:
            bearing = result["properties"]["bearing_deg"]
            assert 0 <= bearing < 360

    def test_range_is_positive(self, multi_track_context):
        results = range_bearing(multi_track_context, {})

        for result in results:
            range_nm = result["properties"]["range_nm"]
            assert range_nm >= 0


class TestRangeBearingEdgeCases:
    """Edge case tests for range-bearing tool."""

    def test_insufficient_features(self):
        feature = {
            "type": "Feature",
            "id": "track-1",
            "properties": {"kind": "track"},
            "geometry": {"type": "LineString", "coordinates": [[-4.0, 50.0], [-3.9, 50.1]]}
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature, feature])

        # Should still work with duplicate feature
        results = range_bearing(context, {})
        assert len(results) == 3

    def test_empty_coordinates(self):
        feature1 = {
            "type": "Feature",
            "id": "track-1",
            "properties": {"kind": "track"},
            "geometry": {"type": "LineString", "coordinates": []}
        }
        feature2 = {
            "type": "Feature",
            "id": "track-2",
            "properties": {"kind": "track"},
            "geometry": {"type": "LineString", "coordinates": [[-4.0, 50.0]]}
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])

        results = range_bearing(context, {})
        assert results == []
