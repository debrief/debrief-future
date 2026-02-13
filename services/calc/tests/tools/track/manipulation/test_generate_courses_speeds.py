"""Golden example and edge case tests for generate-courses-speeds tool."""

import copy

import pytest

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.track.manipulation.generate_courses_speeds import (
    generate_courses_speeds,
)

BASIC_TRACK = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-5.0, 50.0], [-4.9, 50.1], [-4.8, 50.2]],
    },
    "properties": {
        "kind": "TRACK",
        "platform_id": "HMS-EXAMPLE",
        "platform_name": "HMS Example",
        "track_type": "OWNSHIP",
        "start_time": "2026-01-09T10:00:00Z",
        "end_time": "2026-01-09T12:00:00Z",
        "positions": [
            {"time": "2026-01-09T10:00:00Z", "course": 999, "speed": 999},
            {"time": "2026-01-09T11:00:00Z", "course": 999, "speed": 999},
            {"time": "2026-01-09T12:00:00Z", "course": 999, "speed": 999},
        ],
    },
}

SINGLE_POSITION_TRACK = {
    "type": "Feature",
    "id": "track-solo",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-5.0, 50.0]],
    },
    "properties": {
        "kind": "TRACK",
        "platform_id": "HMS-SOLO",
        "platform_name": "HMS Solo",
        "track_type": "OWNSHIP",
        "start_time": "2026-01-09T10:00:00Z",
        "end_time": "2026-01-09T10:00:00Z",
        "positions": [
            {"time": "2026-01-09T10:00:00Z", "course": 45, "speed": 12},
        ],
    },
}


class TestGenerateCourseSpeeds:
    """Golden example and edge case tests."""

    def test_basic_golden_example(self):
        """3-position track: verify course/speed computed and overrides existing values."""
        feature = copy.deepcopy(BASIC_TRACK)
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        assert len(result) == 1
        positions = result[0]["properties"]["positions"]
        assert len(positions) == 3

        # Position 0: bearing from (-5.0, 50.0) to (-4.9, 50.1)
        assert positions[0]["course"] == pytest.approx(32.67, abs=0.01)
        assert positions[0]["speed"] == pytest.approx(7.14, abs=0.01)

        # Position 1: bearing from (-4.9, 50.1) to (-4.8, 50.2)
        assert positions[1]["course"] == pytest.approx(32.61, abs=0.01)
        assert positions[1]["speed"] == pytest.approx(7.13, abs=0.01)

        # Position 2: carries forward from position 1
        assert positions[2]["course"] == positions[1]["course"]
        assert positions[2]["speed"] == positions[1]["speed"]

    def test_override_existing_values(self):
        """Existing course=999/speed=999 are replaced with computed values."""
        feature = copy.deepcopy(BASIC_TRACK)
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        positions = result[0]["properties"]["positions"]
        for pos in positions:
            assert pos["course"] != 999
            assert pos["speed"] != 999

    def test_single_position_unchanged(self):
        """Single-position track returned with no course/speed changes."""
        feature = copy.deepcopy(SINGLE_POSITION_TRACK)
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        assert len(result) == 1
        positions = result[0]["properties"]["positions"]
        assert len(positions) == 1
        # Unchanged
        assert positions[0]["course"] == 45
        assert positions[0]["speed"] == 12

    def test_two_position_track(self):
        """Two-position track: compute for first, last carries forward."""
        feature = {
            "type": "Feature",
            "id": "track-two",
            "geometry": {
                "type": "LineString",
                "coordinates": [[-5.0, 50.0], [-4.9, 50.1]],
            },
            "properties": {
                "kind": "TRACK",
                "positions": [
                    {"time": "2026-01-09T10:00:00Z"},
                    {"time": "2026-01-09T11:00:00Z"},
                ],
            },
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        positions = result[0]["properties"]["positions"]
        assert len(positions) == 2
        assert positions[0]["course"] == pytest.approx(32.67, abs=0.01)
        assert positions[0]["speed"] == pytest.approx(7.14, abs=0.01)
        # Last carries forward
        assert positions[1]["course"] == positions[0]["course"]
        assert positions[1]["speed"] == positions[0]["speed"]

    def test_stationary_vessel(self):
        """Two positions at identical coordinates: course=0, speed=0."""
        feature = {
            "type": "Feature",
            "id": "track-stationary",
            "geometry": {
                "type": "LineString",
                "coordinates": [[-5.0, 50.0], [-5.0, 50.0]],
            },
            "properties": {
                "kind": "TRACK",
                "positions": [
                    {"time": "2026-01-09T10:00:00Z"},
                    {"time": "2026-01-09T11:00:00Z"},
                ],
            },
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        positions = result[0]["properties"]["positions"]
        assert positions[0]["course"] == 0
        assert positions[0]["speed"] == 0
        assert positions[1]["course"] == 0
        assert positions[1]["speed"] == 0

    def test_zero_time_interval(self):
        """Two positions at same time: speed=0, course computed from geometry."""
        feature = {
            "type": "Feature",
            "id": "track-zero-time",
            "geometry": {
                "type": "LineString",
                "coordinates": [[-5.0, 50.0], [-4.9, 50.1]],
            },
            "properties": {
                "kind": "TRACK",
                "positions": [
                    {"time": "2026-01-09T10:00:00Z"},
                    {"time": "2026-01-09T10:00:00Z"},
                ],
            },
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        positions = result[0]["properties"]["positions"]
        # Bearing still computed, speed=0
        assert positions[0]["course"] == pytest.approx(32.67, abs=0.01)
        assert positions[0]["speed"] == 0

    def test_no_track_features_raises(self):
        """FeatureCollection with no TRACK features raises ValueError."""
        feature = {
            "type": "Feature",
            "id": "shape-1",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"kind": "CIRCLE"},
        }
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        with pytest.raises(ValueError, match="No track features found"):
            generate_courses_speeds(context, {})

    def test_course_in_valid_range(self):
        """All computed course values fall within [0, 360)."""
        feature = copy.deepcopy(BASIC_TRACK)
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        for pos in result[0]["properties"]["positions"]:
            assert 0 <= pos["course"] < 360

    def test_speed_non_negative(self):
        """All computed speed values are >= 0."""
        feature = copy.deepcopy(BASIC_TRACK)
        context = SelectionContext(type=ContextType.MULTI, features=[feature])

        result = generate_courses_speeds(context, {})

        for pos in result[0]["properties"]["positions"]:
            assert pos["speed"] >= 0

    def test_skips_non_track_features(self):
        """Non-TRACK features are silently skipped; TRACK features still processed."""
        track = copy.deepcopy(BASIC_TRACK)
        shape = {
            "type": "Feature",
            "id": "circle-1",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"kind": "CIRCLE"},
        }
        context = SelectionContext(type=ContextType.MULTI, features=[shape, track])

        result = generate_courses_speeds(context, {})

        # Only the track feature is returned
        assert len(result) == 1
        assert result[0]["id"] == "track-001"
