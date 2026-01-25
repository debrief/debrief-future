"""
Integration tests for REP handler with annotations.

Tests that the REP handler correctly parses both track data AND annotations
from the same file, returning them together in the ParseResult.
"""

import pytest

from debrief_io.handlers.rep import REPHandler


@pytest.fixture
def rep_handler():
    """Create REP handler instance."""
    return REPHandler()


class TestTracksAndAnnotations:
    """Test parsing files with both tracks and annotations."""

    def test_parse_tracks_and_narratives(self, rep_handler):
        """Parse a file containing both tracks and NARRATIVE comments."""
        content = """;NARRATIVE: 951212 050200 NELSON POSSUB TRACK 14
951212 050200.000 NELSON @C 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 NELSON @C 22 1 0 N 21 1 0 W 046.0 12.5 0
;NARRATIVE: 951212 050300 NELSON Contact confirmed"""

        result = rep_handler.parse(content, "test.rep")

        # Should have track + narratives
        assert len(result.features) == 3  # 1 track + 2 narratives

        # Find track and narratives
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        narratives = [f for f in result.features if f["properties"]["kind"] == "NARRATIVE"]

        assert len(tracks) == 1
        assert len(narratives) == 2

        # Verify track properties
        track = tracks[0]
        assert track["properties"]["platform_id"] == "NELSON"

        # Verify narrative properties
        assert narratives[0]["properties"]["text"] == "POSSUB TRACK 14"
        assert narratives[0]["properties"]["track_id"] == "NELSON"
        assert narratives[1]["properties"]["text"] == "Contact confirmed"

    def test_parse_tracks_and_shapes(self, rep_handler):
        """Parse a file containing both tracks and shape annotations."""
        content = """;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 search area
951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
;RECT: @A 21.4 0 0 N 21.5 0 0 W 21.5 0 0 N 21.6 0 0 W boundary
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0"""

        result = rep_handler.parse(content, "test.rep")

        # Should have track + annotations
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        circles = [f for f in result.features if f["properties"]["kind"] == "CIRCLE"]
        rectangles = [f for f in result.features if f["properties"]["kind"] == "RECTANGLE"]

        assert len(tracks) == 1
        assert len(circles) == 1
        assert len(rectangles) == 1

        # Verify circle
        circle = circles[0]
        assert circle["properties"]["label"] == "search area"
        assert circle["properties"]["radius"] == 2000
        assert circle["geometry"]["type"] == "Polygon"

        # Verify rectangle
        rect = rectangles[0]
        assert rect["properties"]["label"] == "boundary"
        assert rect["geometry"]["type"] == "Polygon"

    def test_parse_tracks_and_lines(self, rep_handler):
        """Parse a file containing both tracks and LINE annotations."""
        content = """;LINE: @B 20 50 0 N 21 10 0 W 22 0 0 N 21 10 0 W reference line
951212 050200.000 SHIP1 @C 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 SHIP1 @C 22 1 0 N 21 1 0 W 046.0 12.5 0"""

        result = rep_handler.parse(content, "test.rep")

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        lines = [f for f in result.features if f["properties"]["kind"] == "LINE"]

        assert len(tracks) == 1
        assert len(lines) == 1

        line = lines[0]
        assert line["properties"]["label"] == "reference line"
        assert line["geometry"]["type"] == "LineString"

    def test_multiple_tracks_and_annotations(self, rep_handler):
        """Parse file with multiple tracks and multiple annotation types."""
        content = """;NARRATIVE: 951212 050000 BOAT1 Exercise start
;CIRCLE: @D 22 0 0 N 21 0 0 W 5000 op area
951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0
951212 050200.000 BOAT2 @B 22 30 0 N 21 30 0 W 090.0 8.0 0
951212 050300.000 BOAT2 @B 22 31 0 N 21 31 0 W 091.0 8.5 0
;NARRATIVE: 951212 050500 BOAT2 Contact detected
;TEXT: @E 22 15 0 N 21 15 0 W waypoint alpha"""

        result = rep_handler.parse(content, "test.rep")

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        narratives = [f for f in result.features if f["properties"]["kind"] == "NARRATIVE"]
        circles = [f for f in result.features if f["properties"]["kind"] == "CIRCLE"]
        texts = [f for f in result.features if f["properties"]["kind"] == "TEXT"]

        assert len(tracks) == 2
        assert len(narratives) == 2
        assert len(circles) == 1
        assert len(texts) == 1

    def test_annotations_without_tracks(self, rep_handler):
        """Parse file with only annotations (no track data)."""
        content = """;CIRCLE: @A 21 0 0 N 20 0 0 W 1000 circle1
;RECT: @B 22 0 0 N 21 0 0 W 23 0 0 N 22 0 0 W rectangle1
;LINE: @C 24 0 0 N 23 0 0 W 25 0 0 N 24 0 0 W line1"""

        result = rep_handler.parse(content, "test.rep")

        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert len(tracks) == 0
        assert len(result.features) == 3  # 3 annotations

    def test_regular_comments_ignored(self, rep_handler):
        """Verify regular comments (not annotations) are ignored."""
        content = """; This is a regular comment
; Another comment line
;; Double semicolon comment
951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0"""

        result = rep_handler.parse(content, "test.rep")

        # Should only have the track, no warnings about unknown annotation types
        tracks = [f for f in result.features if f["properties"]["kind"] == "TRACK"]
        assert len(tracks) == 1
        assert len(result.features) == 1


class TestAnnotationProvenance:
    """Test that annotations have correct provenance information."""

    def test_annotation_source_file(self, rep_handler):
        """Verify annotations include source file in properties."""
        content = ";CIRCLE: @A 21 0 0 N 20 0 0 W 1000 test"

        result = rep_handler.parse(content, "data/shapes.rep")

        assert len(result.features) == 1
        assert result.features[0]["properties"]["source_file"] == "data/shapes.rep"

    def test_annotation_line_number(self, rep_handler):
        """Verify annotations include correct line number."""
        content = """; Header comment
; Another comment
;CIRCLE: @A 21 0 0 N 20 0 0 W 1000 test"""

        result = rep_handler.parse(content, "test.rep")

        assert len(result.features) == 1
        assert result.features[0]["properties"]["line_number"] == 3


class TestTrackRegressionWithAnnotations:
    """Test that track parsing is unchanged when annotations are present."""

    def test_track_positions_unchanged(self, rep_handler):
        """Verify track positions are identical with or without annotations."""
        track_only = """951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0"""

        track_with_annotations = """;CIRCLE: @A 21 0 0 N 20 0 0 W 1000 test
951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
;NARRATIVE: 951212 050230 BOAT1 status update
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0
;LINE: @B 20 0 0 N 19 0 0 W 21 0 0 N 20 0 0 W marker"""

        result_track_only = rep_handler.parse(track_only, "test.rep")
        result_with_annotations = rep_handler.parse(track_with_annotations, "test.rep")

        # Extract just the track features
        track1 = [f for f in result_track_only.features if f["properties"]["kind"] == "TRACK"][0]
        track2 = [
            f for f in result_with_annotations.features if f["properties"]["kind"] == "TRACK"
        ][0]

        # Coordinates should be identical
        assert track1["geometry"]["coordinates"] == track2["geometry"]["coordinates"]

        # Positions data should be identical
        assert track1["properties"]["positions"] == track2["properties"]["positions"]

        # Platform info should be identical
        assert track1["properties"]["platform_id"] == track2["properties"]["platform_id"]

    def test_track_times_unchanged(self, rep_handler):
        """Verify track timing is identical with or without annotations."""
        track_only = """951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0"""

        track_with_annotations = """;NARRATIVE: 951212 050100 BOAT1 start
951212 050200.000 BOAT1 @A 22 0 0 N 21 0 0 W 045.0 12.0 0
951212 050300.000 BOAT1 @A 22 1 0 N 21 1 0 W 046.0 12.5 0
;NARRATIVE: 951212 050400 BOAT1 end"""

        result_track_only = rep_handler.parse(track_only, "test.rep")
        result_with_annotations = rep_handler.parse(track_with_annotations, "test.rep")

        track1 = [f for f in result_track_only.features if f["properties"]["kind"] == "TRACK"][0]
        track2 = [
            f for f in result_with_annotations.features if f["properties"]["kind"] == "TRACK"
        ][0]

        assert track1["properties"]["start_time"] == track2["properties"]["start_time"]
        assert track1["properties"]["end_time"] == track2["properties"]["end_time"]
