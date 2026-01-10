"""Tests for REP format handler.

Tests cover:
- DMS coordinate parsing
- Timestamp parsing
- Track position parsing
- Track grouping
- Reference location parsing
- Error handling
"""

from debrief_io.handlers.rep import (
    REPHandler,
    parse_dms_coordinate,
    parse_timestamp,
)


class TestDMSCoordinateParsing:
    """Tests for DMS coordinate parsing."""

    def test_parse_latitude_north(self):
        """Parse northern latitude."""
        lat = parse_dms_coordinate(21, 53, 39.19, "N")
        assert abs(lat - 21.894219) < 0.0001

    def test_parse_latitude_south(self):
        """Parse southern latitude (negative)."""
        lat = parse_dms_coordinate(21, 53, 39.19, "S")
        assert abs(lat - (-21.894219)) < 0.0001

    def test_parse_longitude_west(self):
        """Parse western longitude (negative)."""
        lon = parse_dms_coordinate(21, 35, 37.59, "W")
        assert abs(lon - (-21.593775)) < 0.0001

    def test_parse_longitude_east(self):
        """Parse eastern longitude."""
        lon = parse_dms_coordinate(21, 35, 37.59, "E")
        assert abs(lon - 21.593775) < 0.0001

    def test_parse_zero_minutes_seconds(self):
        """Parse coordinates with zero minutes and seconds."""
        lat = parse_dms_coordinate(45, 0, 0, "N")
        assert lat == 45.0

    def test_parse_high_seconds(self):
        """Parse coordinates with seconds near 60."""
        lat = parse_dms_coordinate(45, 30, 59.99, "N")
        assert abs(lat - 45.51666389) < 0.0001


class TestTimestampParsing:
    """Tests for timestamp parsing."""

    def test_parse_timestamp_basic(self):
        """Parse basic timestamp."""
        dt = parse_timestamp("951212", "050300.000")
        assert dt.year == 1995
        assert dt.month == 12
        assert dt.day == 12
        assert dt.hour == 5
        assert dt.minute == 3
        assert dt.second == 0

    def test_parse_timestamp_with_milliseconds(self):
        """Parse timestamp with milliseconds."""
        dt = parse_timestamp("951212", "050100.100")
        assert dt.microsecond == 100000

    def test_parse_timestamp_2000s(self):
        """Parse timestamp from 2000s."""
        dt = parse_timestamp("261012", "120000.000")
        assert dt.year == 2026
        assert dt.month == 10
        assert dt.day == 12

    def test_parse_timestamp_1900s(self):
        """Parse timestamp from 1900s (year > 50)."""
        dt = parse_timestamp("951212", "120000.000")
        assert dt.year == 1995


class TestREPHandler:
    """Tests for REP handler."""

    def test_handler_properties(self):
        """Test handler metadata properties."""
        handler = REPHandler()
        assert handler.name == "Debrief REP Format"
        assert ".rep" in handler.extensions
        assert handler.version

    def test_parse_single_track(self, boat2_content: str, boat2_rep):
        """Parse file with single track."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        assert result.handler == "Debrief REP Format"
        assert len(result.features) == 1
        assert result.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_parse_track_positions(self, boat2_content: str, boat2_rep):
        """Parse track positions correctly."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        positions = track["properties"]["positions"]

        # First position from boat2.rep
        first_pos = positions[0]
        # 21 53 39.19 N = 21.894219...
        assert abs(first_pos["lat"] - 21.894219) < 0.001
        # 21 35 37.59 W = -21.593775
        assert abs(first_pos["lon"] - (-21.593775)) < 0.001

    def test_parse_track_times(self, boat2_content: str, boat2_rep):
        """Parse track start and end times."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        props = track["properties"]

        # First timestamp: 951212 050300.000
        assert "1995-12-12" in props["start_time"]
        assert "05:03:00" in props["start_time"]

    def test_parse_multiple_tracks(self):
        """Parse content with multiple tracks."""
        content = """951212 050000.000 NELSON   @C   22 11 10.63 N 21 41 52.37 W 269.7   2.0      0
951212 050100.000 NELSON   @C   22 11 10.58 N 21 42  2.98 W 269.7   2.0      0
951212 050000.000 COLLINGWOOD @A  21 53 39.19 N 21 35 37.59 W   0.3   3.5      0
951212 050100.000 COLLINGWOOD @A  21 53 43.69 N 21 35 37.55 W 359.6   3.5      0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        assert len(result.features) == 2
        track_names = {f["properties"]["platform_id"] for f in result.features}
        assert track_names == {"NELSON", "COLLINGWOOD"}

    def test_parse_geometry_linestring(self, boat2_content: str, boat2_rep):
        """Verify geometry is LineString with correct coordinates."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        assert track["geometry"]["type"] == "LineString"
        coords = track["geometry"]["coordinates"]
        assert len(coords) > 2
        # GeoJSON coordinates are [lon, lat]
        assert len(coords[0]) >= 2

    def test_parse_empty_content(self):
        """Parse empty content returns empty features."""
        handler = REPHandler()
        result = handler.parse("", "empty.rep")
        assert result.features == []

    def test_parse_comment_lines(self):
        """Comment lines are ignored."""
        content = """;; This is a comment
; Another comment
951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 050100.000 NELSON @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        assert len(result.features) == 1

    def test_parse_with_warnings(self):
        """Parse with unknown record types adds warnings."""
        content = """UNKNOWN_RECORD_TYPE data here
951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 050100.000 NELSON @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        assert len(result.features) == 1
        assert len(result.warnings) >= 1
        assert any(w.code == "UNKNOWN_RECORD" for w in result.warnings)


class TestREPHandlerRealFiles:
    """Integration tests with real REP fixture files."""

    def test_parse_boat1_rep(self, boat1_content: str, boat1_rep):
        """Parse boat1.rep fixture."""
        handler = REPHandler()
        result = handler.parse(boat1_content, str(boat1_rep))

        assert len(result.features) >= 1
        # boat1.rep has NELSON track
        assert result.features[0]["properties"]["platform_id"] == "NELSON"

    def test_parse_boat2_rep(self, boat2_content: str, boat2_rep):
        """Parse boat2.rep fixture."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        assert len(result.features) >= 1
        # boat2.rep has COLLINGWOOD track
        assert result.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_all_positions_have_valid_coordinates(self, boat2_content: str, boat2_rep):
        """All positions should have valid coordinates."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        for feature in result.features:
            for pos in feature["properties"]["positions"]:
                assert -90 <= pos["lat"] <= 90, f"Invalid latitude: {pos['lat']}"
                assert -180 <= pos["lon"] <= 180, f"Invalid longitude: {pos['lon']}"

    def test_positions_are_chronological(self, boat2_content: str, boat2_rep):
        """Positions should be in chronological order."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        for feature in result.features:
            positions = feature["properties"]["positions"]
            for i in range(1, len(positions)):
                assert positions[i]["time"] >= positions[i - 1]["time"]
