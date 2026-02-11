"""Unit tests for range-bearing tool."""

import json
from pathlib import Path

import pytest
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.range_bearing import (
    _calculate_bearing,
    _calculate_range,
    _closest_point_on_polygon,
    _closest_point_on_segment,
    range_bearing,
)


@pytest.fixture
def tracks_pair_fixture():
    """Load the tracks pair fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "tracks-pair.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def multi_track_context(tracks_pair_fixture):
    """Create a context from the tracks pair fixture."""
    return SelectionContext(type=ContextType.MULTI, features=tracks_pair_fixture["features"])


def _make_track(name, coords, times):
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "TRACK", "times": times},
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def _make_point(name, lon, lat):
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "POINT"},
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    }


def _make_polygon(name, ring):
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "SHAPE"},
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


class TestCalculateBearing:
    def test_bearing_due_north(self):
        assert abs(_calculate_bearing(0.0, 50.0, 0.0, 51.0)) < 1.0

    def test_bearing_due_east(self):
        assert abs(_calculate_bearing(0.0, 50.0, 1.0, 50.0) - 90.0) < 1.0

    def test_bearing_due_south(self):
        assert abs(_calculate_bearing(0.0, 51.0, 0.0, 50.0) - 180.0) < 1.0

    def test_bearing_due_west(self):
        assert abs(_calculate_bearing(1.0, 50.0, 0.0, 50.0) - 270.0) < 1.0

    def test_bearing_range(self):
        bearing = _calculate_bearing(-5.0, 50.0, -4.0, 51.0)
        assert 0 <= bearing < 360


class TestCalculateRange:
    def test_same_point_zero_range(self):
        assert _calculate_range(-4.0, 50.0, -4.0, 50.0) == 0.0

    def test_known_range(self):
        range_nm = _calculate_range(0.0, 50.0, 0.0, 51.0)
        assert 59 < range_nm < 61


class TestClosestPointHelpers:
    def test_closest_point_on_segment_midpoint(self):
        cx, cy = _closest_point_on_segment(0.5, 1.0, 0.0, 0.0, 1.0, 0.0)
        assert abs(cx - 0.5) < 1e-9
        assert abs(cy - 0.0) < 1e-9

    def test_closest_point_on_segment_clamped(self):
        cx, cy = _closest_point_on_segment(2.0, 0.0, 0.0, 0.0, 1.0, 0.0)
        assert abs(cx - 1.0) < 1e-9

    def test_closest_point_on_polygon(self):
        ring = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
        cx, cy = _closest_point_on_polygon(0.5, -0.5, ring)
        assert abs(cy - 0.0) < 1e-9
        assert abs(cx - 0.5) < 1e-9


class TestRangeBearingTrackTrack:
    """Track + Track time-series tests."""

    def test_returns_time_series(self, multi_track_context):
        results = range_bearing(multi_track_context, {})
        assert len(results) == 1
        wrapper = results[0]
        assert wrapper["type"] == "range-bearing-series"
        assert len(wrapper["entries"]) == 5

    def test_entries_have_required_fields(self, multi_track_context):
        wrapper = range_bearing(multi_track_context, {})[0]
        for entry in wrapper["entries"]:
            assert "time" in entry
            assert "range_nm" in entry
            assert "bearing_deg" in entry
            assert isinstance(entry["range_nm"], (int, float))
            assert 0 <= entry["bearing_deg"] < 360

    def test_references_features(self, multi_track_context):
        wrapper = range_bearing(multi_track_context, {})[0]
        assert wrapper["from_feature"] == "Alpha"
        assert wrapper["to_feature"] == "Bravo"

    def test_range_positive(self, multi_track_context):
        wrapper = range_bearing(multi_track_context, {})[0]
        for entry in wrapper["entries"]:
            assert entry["range_nm"] >= 0

    def test_times_are_epoch_ms(self, multi_track_context):
        wrapper = range_bearing(multi_track_context, {})[0]
        for entry in wrapper["entries"]:
            assert isinstance(entry["time"], int)


class TestRangeBearingTrackPoint:
    """Track + Point tests."""

    def test_track_point_series(self):
        track = _make_track(
            "T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000]
        )
        point = _make_point("P1", -4.5, 50.5)
        ctx = SelectionContext(type=ContextType.MULTI, features=[track, point])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        wrapper = results[0]
        assert len(wrapper["entries"]) == 2
        assert wrapper["from_feature"] == "T1"
        assert wrapper["to_feature"] == "P1"

    def test_point_track_order(self):
        """Point first, track second — still produces series."""
        point = _make_point("P1", -4.5, 50.5)
        track = _make_track(
            "T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000]
        )
        ctx = SelectionContext(type=ContextType.MULTI, features=[point, track])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        assert len(results[0]["entries"]) == 2


class TestRangeBearingTrackPolygon:
    """Track + Polygon tests."""

    def test_track_polygon_series(self):
        track = _make_track(
            "T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000]
        )
        ring = [[-3.0, 49.0], [-2.0, 49.0], [-2.0, 50.0], [-3.0, 50.0], [-3.0, 49.0]]
        poly = _make_polygon("Zone", ring)
        ctx = SelectionContext(type=ContextType.MULTI, features=[track, poly])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        wrapper = results[0]
        assert len(wrapper["entries"]) == 2
        for entry in wrapper["entries"]:
            assert entry["range_nm"] >= 0


class TestRangeBearingEdgeCases:
    def test_no_times_returns_empty(self):
        """Features without times produce no series."""
        feature = {
            "type": "Feature",
            "id": "track-1",
            "properties": {"kind": "TRACK"},
            "geometry": {"type": "LineString", "coordinates": [[-4.0, 50.0], [-3.9, 50.1]]},
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature, feature])
        results = range_bearing(context, {})
        assert results == []

    def test_empty_coordinates(self):
        feature1 = {
            "type": "Feature",
            "id": "track-1",
            "properties": {"kind": "TRACK", "times": [1704067200000]},
            "geometry": {"type": "LineString", "coordinates": []},
        }
        feature2 = {
            "type": "Feature",
            "id": "track-2",
            "properties": {"kind": "TRACK", "times": [1704067200000]},
            "geometry": {"type": "LineString", "coordinates": [[-4.0, 50.0]]},
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature1, feature2])
        results = range_bearing(context, {})
        assert results == []

    def test_two_points_no_track_returns_empty(self):
        """Two non-track features produce no series."""
        p1 = _make_point("P1", -4.0, 50.0)
        p2 = _make_point("P2", -3.0, 50.0)
        context = SelectionContext(type=ContextType.MULTI, features=[p1, p2])
        results = range_bearing(context, {})
        assert results == []
