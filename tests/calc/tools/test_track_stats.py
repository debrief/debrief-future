"""Unit tests for track-stats tool."""

import pytest
import json
from pathlib import Path

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track_stats import track_stats, _haversine_distance, _calculate_track_stats


@pytest.fixture
def single_track_fixture():
    """Load the single track fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "track-single.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def single_track_context(single_track_fixture):
    """Create a context from the single track fixture."""
    return SelectionContext(
        type=ContextType.SINGLE,
        features=[single_track_fixture]
    )


class TestHaversineDistance:
    """Tests for haversine distance calculation."""

    def test_same_point_zero_distance(self):
        dist = _haversine_distance(-4.0, 50.0, -4.0, 50.0)
        assert dist == 0.0

    def test_known_distance(self):
        # Plymouth to Falmouth is approximately 35 nautical miles
        dist = _haversine_distance(-4.14, 50.37, -5.07, 50.15)
        assert 30 < dist < 40  # Approximate check

    def test_north_south_distance(self):
        # 1 degree of latitude is approximately 60 nautical miles
        dist = _haversine_distance(0.0, 50.0, 0.0, 51.0)
        assert 59 < dist < 61


class TestCalculateTrackStats:
    """Tests for track statistics calculation."""

    def test_empty_coordinates(self):
        stats = _calculate_track_stats([])
        assert stats["point_count"] == 0
        assert stats["duration_hours"] == 0
        assert stats["distance_nm"] == 0
        assert stats["average_speed_kts"] == 0

    def test_single_point(self):
        coords = [[-4.0, 50.0, 0, 1000000]]
        stats = _calculate_track_stats(coords)
        assert stats["point_count"] == 1
        assert stats["distance_nm"] == 0

    def test_two_points_with_timestamps(self):
        # Two points 1 hour apart, approximately 60nm apart (1 degree latitude)
        coords = [
            [0.0, 50.0, 0, 0],
            [0.0, 51.0, 0, 3600000]  # 1 hour = 3600000 ms
        ]
        stats = _calculate_track_stats(coords)

        assert stats["point_count"] == 2
        assert stats["duration_hours"] == 1.0
        assert 59 < stats["distance_nm"] < 61
        assert 59 < stats["average_speed_kts"] < 61

    def test_multiple_points(self):
        coords = [
            [-4.5, 50.2, 0, 1705305600000],
            [-4.4, 50.3, 0, 1705309200000],
            [-4.3, 50.4, 0, 1705312800000],
        ]
        stats = _calculate_track_stats(coords)

        assert stats["point_count"] == 3
        assert stats["distance_nm"] > 0
        assert stats["duration_hours"] > 0


class TestTrackStatsTool:
    """Tests for the track-stats tool handler."""

    def test_returns_single_feature(self, single_track_context):
        results = track_stats(single_track_context, {})

        assert isinstance(results, list)
        assert len(results) == 1

    def test_result_is_feature(self, single_track_context):
        results = track_stats(single_track_context, {})
        feature = results[0]

        assert feature["type"] == "Feature"
        assert "id" in feature
        assert "properties" in feature
        assert "geometry" in feature

    def test_result_has_statistics(self, single_track_context):
        results = track_stats(single_track_context, {})
        stats = results[0]["properties"]["statistics"]

        assert "point_count" in stats
        assert "duration_hours" in stats
        assert "distance_nm" in stats
        assert "average_speed_kts" in stats

    def test_result_references_source_track(self, single_track_context):
        results = track_stats(single_track_context, {})
        props = results[0]["properties"]

        assert props["source_track"] == "track-001"
        assert props["source_name"] == "HMS Example"

    def test_result_geometry_is_centroid(self, single_track_context):
        results = track_stats(single_track_context, {})
        geom = results[0]["geometry"]

        assert geom["type"] == "Point"
        assert len(geom["coordinates"]) == 2

    def test_with_fixture_data(self, single_track_context, single_track_fixture):
        results = track_stats(single_track_context, {})
        stats = results[0]["properties"]["statistics"]

        # Fixture has 9 points
        assert stats["point_count"] == 9
        assert stats["distance_nm"] > 0
        assert stats["duration_hours"] > 0
