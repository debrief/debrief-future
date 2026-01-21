"""
Track regression tests for REP handler with annotations.

Ensures that track parsing is UNCHANGED when annotation support is added.
These tests establish a baseline and verify no regression occurs.
"""

import pytest
from pathlib import Path

from debrief_io.handlers.rep import REPHandler


FIXTURES_DIR = Path(__file__).parent.parent / "fixtures" / "valid"


@pytest.fixture
def rep_handler():
    """Create REP handler instance."""
    return REPHandler()


class TestTrackRegressionBoat1:
    """Regression tests using boat1.rep fixture."""

    @pytest.fixture
    def boat1_content(self):
        """Load boat1.rep fixture."""
        return (FIXTURES_DIR / "boat1.rep").read_text()

    def test_track_count_unchanged(self, rep_handler, boat1_content):
        """Verify exactly one track is parsed from boat1.rep."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert len(tracks) == 1

    def test_track_name_unchanged(self, rep_handler, boat1_content):
        """Verify track name is NELSON."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert tracks[0]["properties"]["platform_id"] == "NELSON"

    def test_position_count_unchanged(self, rep_handler, boat1_content):
        """Verify position count matches expected."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        positions = tracks[0]["properties"]["positions"]
        # boat1.rep has 402 lines = 402 positions
        assert len(positions) == 402

    def test_start_time_unchanged(self, rep_handler, boat1_content):
        """Verify start time is unchanged."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert tracks[0]["properties"]["start_time"] == "1995-12-12T05:00:00+00:00"

    def test_end_time_unchanged(self, rep_handler, boat1_content):
        """Verify end time is unchanged."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert tracks[0]["properties"]["end_time"] == "1995-12-12T11:41:00+00:00"

    def test_geometry_type_unchanged(self, rep_handler, boat1_content):
        """Verify geometry is LineString."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert tracks[0]["geometry"]["type"] == "LineString"

    def test_coordinate_values_unchanged(self, rep_handler, boat1_content):
        """Verify first and last coordinates are unchanged."""
        result = rep_handler.parse(boat1_content, "boat1.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        coords = tracks[0]["geometry"]["coordinates"]

        # First position: 22 11 10.63 N 21 41 52.37 W
        first_lon = coords[0][0]
        first_lat = coords[0][1]
        assert abs(first_lat - 22.18628611) < 0.0001  # 22 + 11/60 + 10.63/3600
        assert abs(first_lon - (-21.69788056)) < 0.0001  # -(21 + 41/60 + 52.37/3600)

        # Last position: 22  8 30.26 N 21 44 48.10 W
        last_lon = coords[-1][0]
        last_lat = coords[-1][1]
        assert abs(last_lat - 22.14173889) < 0.0001
        assert abs(last_lon - (-21.74669444)) < 0.0001


class TestTrackRegressionShapesRep:
    """Regression tests for tracks in shapes.rep (mixed tracks and annotations)."""

    @pytest.fixture
    def shapes_content(self):
        """Load shapes.rep fixture."""
        return (FIXTURES_DIR / "shapes.rep").read_text()

    def test_track_parsing_with_annotations(self, rep_handler, shapes_content):
        """Verify tracks are parsed correctly alongside annotations."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]

        # shapes.rep has multiple tracks with standard symbol formats
        track_names = {t["properties"]["platform_id"] for t in tracks}

        # At least one track should be parsed
        # Note: Some tracks in shapes.rep use extended formats not yet supported
        # (e.g., quoted names, extended symbols like B@@00, symbols with attributes)
        assert len(tracks) >= 1

        # NEL_STYLE4 uses standard @GA20 format and should be parsed
        assert "NEL_STYLE4" in track_names

    def test_track_positions_not_affected_by_annotations(self, rep_handler, shapes_content):
        """Verify annotation lines don't corrupt track position data."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]

        for track in tracks:
            positions = track["properties"]["positions"]
            # All positions should have valid data
            for pos in positions:
                assert "time" in pos
                assert "lat" in pos
                assert "lon" in pos
                assert "course" in pos
                assert "speed" in pos
                # Latitude should be valid
                assert -90 <= pos["lat"] <= 90
                # Longitude should be valid
                assert -180 <= pos["lon"] <= 180


class TestAnnotationCountInShapesRep:
    """Test annotation parsing counts for shapes.rep."""

    @pytest.fixture
    def shapes_content(self):
        """Load shapes.rep fixture."""
        return (FIXTURES_DIR / "shapes.rep").read_text()

    def test_circle_annotations_parsed(self, rep_handler, shapes_content):
        """Verify CIRCLE annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        circles = [f for f in result.features if f["properties"].get("kind") == "CIRCLE"]
        # shapes.rep has 8 CIRCLE entries
        assert len(circles) == 8

    def test_rectangle_annotations_parsed(self, rep_handler, shapes_content):
        """Verify RECT annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        rects = [f for f in result.features if f["properties"].get("kind") == "RECTANGLE"]
        assert len(rects) == 1

    def test_line_annotations_parsed(self, rep_handler, shapes_content):
        """Verify LINE annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        lines = [f for f in result.features if f["properties"].get("kind") == "LINE"]
        assert len(lines) == 1

    def test_vector_annotations_parsed(self, rep_handler, shapes_content):
        """Verify VECTOR annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        vectors = [f for f in result.features if f["properties"].get("kind") == "VECTOR"]
        assert len(vectors) == 1

    def test_text_annotations_parsed(self, rep_handler, shapes_content):
        """Verify TEXT annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        texts = [f for f in result.features if f["properties"].get("kind") == "TEXT"]
        # shapes.rep has many TEXT entries with various symbols and layers
        assert len(texts) >= 40  # At least 40 TEXT entries

    def test_narrative_annotations_parsed(self, rep_handler, shapes_content):
        """Verify NARRATIVE annotations are parsed."""
        result = rep_handler.parse(shapes_content, "shapes.rep")
        narratives = [f for f in result.features if f["properties"].get("kind") == "NARRATIVE"]
        # shapes.rep has 2 NARRATIVE entries (NARRATIVE and NARRATIVE2)
        assert len(narratives) == 2
