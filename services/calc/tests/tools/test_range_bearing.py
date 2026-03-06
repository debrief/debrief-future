"""Unit tests for range-bearing tool."""

import json
from pathlib import Path
from typing import Any

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
def tracks_pair_fixture() -> dict[str, Any]:
    """Load the tracks pair fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "tracks-pair.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def multi_track_context(tracks_pair_fixture: dict[str, Any]) -> SelectionContext:
    """Create a context from the tracks pair fixture."""
    return SelectionContext(type=ContextType.MULTI, features=tracks_pair_fixture["features"])


def _make_track(name: str, coords: list[list[float]], times: list[int]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "TRACK", "times": times},
        "geometry": {"type": "LineString", "coordinates": coords},
    }


def _make_point(name: str, lon: float, lat: float) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "POINT"},
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
    }


def _make_polygon(name: str, ring: list[list[float]]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "id": name,
        "properties": {"name": name, "kind": "SHAPE"},
        "geometry": {"type": "Polygon", "coordinates": [ring]},
    }


class TestCalculateBearing:
    def test_bearing_due_north(self) -> None:
        assert abs(_calculate_bearing(0.0, 50.0, 0.0, 51.0)) < 1.0

    def test_bearing_due_east(self) -> None:
        assert abs(_calculate_bearing(0.0, 50.0, 1.0, 50.0) - 90.0) < 1.0

    def test_bearing_due_south(self) -> None:
        assert abs(_calculate_bearing(0.0, 51.0, 0.0, 50.0) - 180.0) < 1.0

    def test_bearing_due_west(self) -> None:
        assert abs(_calculate_bearing(1.0, 50.0, 0.0, 50.0) - 270.0) < 1.0

    def test_bearing_range(self) -> None:
        bearing = _calculate_bearing(-5.0, 50.0, -4.0, 51.0)
        assert 0 <= bearing < 360


class TestCalculateRange:
    def test_same_point_zero_range(self) -> None:
        assert _calculate_range(-4.0, 50.0, -4.0, 50.0) == 0.0

    def test_known_range(self) -> None:
        range_nm = _calculate_range(0.0, 50.0, 0.0, 51.0)
        assert 59 < range_nm < 61


class TestClosestPointHelpers:
    def test_closest_point_on_segment_midpoint(self) -> None:
        cx, cy = _closest_point_on_segment(0.5, 1.0, 0.0, 0.0, 1.0, 0.0)
        assert abs(cx - 0.5) < 1e-9
        assert abs(cy - 0.0) < 1e-9

    def test_closest_point_on_segment_clamped(self) -> None:
        cx, cy = _closest_point_on_segment(2.0, 0.0, 0.0, 0.0, 1.0, 0.0)
        assert abs(cx - 1.0) < 1e-9

    def test_closest_point_on_polygon(self) -> None:
        ring = [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0], [0.0, 1.0], [0.0, 0.0]]
        cx, cy = _closest_point_on_polygon(0.5, -0.5, ring)
        assert abs(cy - 0.0) < 1e-9
        assert abs(cx - 0.5) < 1e-9


class TestRangeBearingTrackTrack:
    """Track + Track time-series tests."""

    def test_returns_geojson_feature(self, multi_track_context: SelectionContext) -> None:
        results = range_bearing(multi_track_context, {})
        assert len(results) == 1
        feature = results[0]
        assert feature["type"] == "Feature"
        assert feature["geometry"]["type"] == "Point"
        assert "__datasets" in feature["properties"]
        assert len(feature["properties"]["__datasets"]) == 2

    def test_datasets_have_series_data(self, multi_track_context: SelectionContext) -> None:
        feature = range_bearing(multi_track_context, {})[0]
        for dataset in feature["properties"]["__datasets"]:
            assert dataset["type"] == "range_bearing_series"
            assert "series" in dataset
            assert len(dataset["series"]) == 1
            data = dataset["series"][0]["data"]
            assert len(data) == 5
            for point in data:
                assert "time" in point
                assert "value" in point

    def test_references_features(self, multi_track_context: SelectionContext) -> None:
        feature = range_bearing(multi_track_context, {})[0]
        assert feature["properties"]["from_feature"] == "Alpha"
        assert feature["properties"]["to_feature"] == "Bravo"

    def test_range_values_positive(self, multi_track_context: SelectionContext) -> None:
        feature = range_bearing(multi_track_context, {})[0]
        range_dataset = feature["properties"]["__datasets"][0]
        for point in range_dataset["series"][0]["data"]:
            assert point["value"] >= 0

    def test_times_are_iso_strings(self, multi_track_context: SelectionContext) -> None:
        feature = range_bearing(multi_track_context, {})[0]
        range_dataset = feature["properties"]["__datasets"][0]
        for point in range_dataset["series"][0]["data"]:
            assert isinstance(point["time"], str)
            assert "T" in point["time"]  # ISO 8601


class TestRangeBearingTrackPoint:
    """Track + Point tests."""

    def test_track_point_series(self) -> None:
        track = _make_track("T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000])
        point = _make_point("P1", -4.5, 50.5)
        ctx = SelectionContext(type=ContextType.MULTI, features=[track, point])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        feature = results[0]
        assert feature["type"] == "Feature"
        datasets = feature["properties"]["__datasets"]
        assert len(datasets[0]["series"][0]["data"]) == 2
        assert feature["properties"]["from_feature"] == "T1"
        assert feature["properties"]["to_feature"] == "P1"

    def test_point_track_order(self) -> None:
        """Point first, track second — still produces series."""
        point = _make_point("P1", -4.5, 50.5)
        track = _make_track("T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000])
        ctx = SelectionContext(type=ContextType.MULTI, features=[point, track])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        assert len(results[0]["properties"]["__datasets"][0]["series"][0]["data"]) == 2


class TestRangeBearingTrackPolygon:
    """Track + Polygon tests."""

    def test_track_polygon_series(self) -> None:
        track = _make_track("T1", [[-5.0, 50.0], [-4.0, 50.0]], [1704067200000, 1704070800000])
        ring = [[-3.0, 49.0], [-2.0, 49.0], [-2.0, 50.0], [-3.0, 50.0], [-3.0, 49.0]]
        poly = _make_polygon("Zone", ring)
        ctx = SelectionContext(type=ContextType.MULTI, features=[track, poly])
        results = range_bearing(ctx, {})
        assert len(results) == 1
        feature = results[0]
        assert feature["type"] == "Feature"
        datasets = feature["properties"]["__datasets"]
        assert len(datasets[0]["series"][0]["data"]) == 2
        for point in datasets[0]["series"][0]["data"]:
            assert point["value"] >= 0


class TestRangeBearingEdgeCases:
    def test_no_times_returns_empty(self) -> None:
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

    def test_empty_coordinates(self) -> None:
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

    def test_two_points_no_track_returns_empty(self) -> None:
        """Two non-track features produce no series."""
        p1 = _make_point("P1", -4.0, 50.0)
        p2 = _make_point("P2", -3.0, 50.0)
        context = SelectionContext(type=ContextType.MULTI, features=[p1, p2])
        results = range_bearing(context, {})
        assert results == []
