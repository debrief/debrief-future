"""Tests for REP format handler.

Tests cover:
- DMS coordinate parsing
- Timestamp parsing
- Track position parsing
- Track grouping
- Reference location parsing
- Error handling
"""

from pathlib import Path

from debrief_io.handlers.rep import (
    REPHandler,
    calculate_position_style_intervals,
    parse_dms_coordinate,
    parse_timestamp,
)


class TestPositionStyleIntervals:
    """Tests for position style interval calculation."""

    def test_short_track_under_30_minutes(self) -> None:
        """Short tracks get 1 min symbols, 5 min labels."""
        symbol, label = calculate_position_style_intervals(0.25)  # 15 minutes
        assert symbol == "PT1M"
        assert label == "PT5M"

    def test_track_30_min_to_2_hours(self) -> None:
        """Tracks 30 min - 2 hours get 5 min symbols, 15 min labels."""
        symbol, label = calculate_position_style_intervals(1.0)  # 1 hour
        assert symbol == "PT5M"
        assert label == "PT15M"

    def test_track_2_to_6_hours(self) -> None:
        """Tracks 2-6 hours get 10 min symbols, 30 min labels."""
        symbol, label = calculate_position_style_intervals(4.0)  # 4 hours
        assert symbol == "PT10M"
        assert label == "PT30M"

    def test_track_6_to_12_hours(self) -> None:
        """Tracks 6-12 hours get 15 min symbols, 1 hour labels."""
        symbol, label = calculate_position_style_intervals(8.0)  # 8 hours
        assert symbol == "PT15M"
        assert label == "PT1H"

    def test_track_12_to_24_hours(self) -> None:
        """Tracks 12-24 hours get 30 min symbols, 2 hour labels."""
        symbol, label = calculate_position_style_intervals(18.0)  # 18 hours
        assert symbol == "PT30M"
        assert label == "PT2H"

    def test_track_over_24_hours(self) -> None:
        """Tracks over 24 hours get 1 hour symbols, 4 hour labels."""
        symbol, label = calculate_position_style_intervals(48.0)  # 2 days
        assert symbol == "PT1H"
        assert label == "PT4H"

    def test_boundary_at_30_minutes(self) -> None:
        """Test boundary condition at 30 minutes."""
        # Just under 30 minutes
        symbol, label = calculate_position_style_intervals(0.49)
        assert symbol == "PT1M"
        assert label == "PT5M"

        # At 30 minutes
        symbol, label = calculate_position_style_intervals(0.5)
        assert symbol == "PT5M"
        assert label == "PT15M"


class TestDMSCoordinateParsing:
    """Tests for DMS coordinate parsing."""

    def test_parse_latitude_north(self) -> None:
        """Parse northern latitude."""
        lat = parse_dms_coordinate(21, 53, 39.19, "N")
        assert abs(lat - 21.894219) < 0.0001

    def test_parse_latitude_south(self) -> None:
        """Parse southern latitude (negative)."""
        lat = parse_dms_coordinate(21, 53, 39.19, "S")
        assert abs(lat - (-21.894219)) < 0.0001

    def test_parse_longitude_west(self) -> None:
        """Parse western longitude (negative)."""
        lon = parse_dms_coordinate(21, 35, 37.59, "W")
        assert abs(lon - (-21.593775)) < 0.0001

    def test_parse_longitude_east(self) -> None:
        """Parse eastern longitude."""
        lon = parse_dms_coordinate(21, 35, 37.59, "E")
        assert abs(lon - 21.593775) < 0.0001

    def test_parse_zero_minutes_seconds(self) -> None:
        """Parse coordinates with zero minutes and seconds."""
        lat = parse_dms_coordinate(45, 0, 0, "N")
        assert lat == 45.0

    def test_parse_high_seconds(self) -> None:
        """Parse coordinates with seconds near 60."""
        lat = parse_dms_coordinate(45, 30, 59.99, "N")
        assert abs(lat - 45.51666389) < 0.0001


class TestTimestampParsing:
    """Tests for timestamp parsing."""

    def test_parse_timestamp_basic(self) -> None:
        """Parse basic timestamp."""
        dt = parse_timestamp("951212", "050300.000")
        assert dt.year == 1995
        assert dt.month == 12
        assert dt.day == 12
        assert dt.hour == 5
        assert dt.minute == 3
        assert dt.second == 0

    def test_parse_timestamp_with_milliseconds(self) -> None:
        """Parse timestamp with milliseconds."""
        dt = parse_timestamp("951212", "050100.100")
        assert dt.microsecond == 100000

    def test_parse_timestamp_2000s(self) -> None:
        """Parse timestamp from 2000s."""
        dt = parse_timestamp("261012", "120000.000")
        assert dt.year == 2026
        assert dt.month == 10
        assert dt.day == 12

    def test_parse_timestamp_1900s(self) -> None:
        """Parse timestamp from 1900s (year > 50)."""
        dt = parse_timestamp("951212", "120000.000")
        assert dt.year == 1995


class TestREPHandler:
    """Tests for REP handler."""

    def test_handler_properties(self) -> None:
        """Test handler metadata properties."""
        handler = REPHandler()
        assert handler.name == "Debrief REP Format"
        assert ".rep" in handler.extensions
        assert handler.version

    def test_parse_single_track(self, boat2_content: str, boat2_rep: Path) -> None:
        """Parse file with single track."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        assert result.handler == "Debrief REP Format"
        assert len(result.features) == 1
        assert result.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_parse_track_positions(self, boat2_content: str, boat2_rep: Path) -> None:
        """Parse track positions correctly - coordinates in geometry, not positions."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        positions = track["properties"]["positions"]
        coords = track["geometry"]["coordinates"]

        # Positions should NOT have lat/lon - only temporal/kinematic data
        first_pos = positions[0]
        assert "lat" not in first_pos
        assert "lon" not in first_pos
        assert "time" in first_pos

        # Coordinates should be in geometry.coordinates[i] (parallel to positions[i])
        # GeoJSON format is [lon, lat]
        first_coord = coords[0]
        # 21 35 37.59 W = -21.593775 (longitude)
        assert abs(first_coord[0] - (-21.593775)) < 0.001
        # 21 53 39.19 N = 21.894219... (latitude)
        assert abs(first_coord[1] - 21.894219) < 0.001

        # Verify parallel array constraint: len(coords) == len(positions)
        assert len(coords) == len(positions)

    def test_parse_track_times(self, boat2_content: str, boat2_rep: Path) -> None:
        """Parse track start and end times."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        props = track["properties"]

        # First timestamp: 951212 050300.000
        assert "1995-12-12" in props["start_time"]
        assert "05:03:00" in props["start_time"]

    def test_parse_multiple_tracks(self) -> None:
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

    def test_parse_geometry_linestring(self, boat2_content: str, boat2_rep: Path) -> None:
        """Verify geometry is LineString with correct coordinates."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        track = result.features[0]
        assert track["geometry"]["type"] == "LineString"
        coords = track["geometry"]["coordinates"]
        assert len(coords) > 2
        # GeoJSON coordinates are [lon, lat]
        assert len(coords[0]) >= 2

    def test_parse_empty_content(self) -> None:
        """Parse empty content returns empty features."""
        handler = REPHandler()
        result = handler.parse("", "empty.rep")
        assert result.features == []

    def test_parse_comment_lines(self) -> None:
        """Comment lines are ignored."""
        content = """;; This is a comment
; Another comment
951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 050100.000 NELSON @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        assert len(result.features) == 1

    def test_parse_with_warnings(self) -> None:
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

    def test_parse_boat1_rep(self, boat1_content: str, boat1_rep: Path) -> None:
        """Parse boat1.rep fixture."""
        handler = REPHandler()
        result = handler.parse(boat1_content, str(boat1_rep))

        assert len(result.features) >= 1
        # boat1.rep has NELSON track
        assert result.features[0]["properties"]["platform_id"] == "NELSON"

    def test_parse_boat2_rep(self, boat2_content: str, boat2_rep: Path) -> None:
        """Parse boat2.rep fixture."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        assert len(result.features) >= 1
        # boat2.rep has COLLINGWOOD track
        assert result.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_all_coordinates_in_geometry_are_valid(
        self, boat2_content: str, boat2_rep: Path
    ) -> None:
        """All coordinates in geometry should be valid (not in positions)."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        for feature in result.features:
            coords = feature["geometry"]["coordinates"]
            positions = feature["properties"]["positions"]

            # Verify parallel array constraint
            assert len(coords) == len(positions), "Coordinates and positions must have same length"

            # Check geometry coordinates are valid [lon, lat] pairs
            for coord in coords:
                lon, lat = coord[0], coord[1]
                assert -90 <= lat <= 90, f"Invalid latitude: {lat}"
                assert -180 <= lon <= 180, f"Invalid longitude: {lon}"

            # Verify positions don't have lat/lon
            for pos in positions:
                assert "lat" not in pos, "Position should not have 'lat'"
                assert "lon" not in pos, "Position should not have 'lon'"

    def test_default_position_style_present(self, boat2_content: str, boat2_rep: Path) -> None:
        """Track should have default_position_style."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        for feature in result.features:
            props = feature["properties"]
            assert "default_position_style" in props
            style = props["default_position_style"]
            assert "show_symbol" in style
            assert "symbol" in style
            assert "show_label" in style

    def test_positions_are_chronological(self, boat2_content: str, boat2_rep: Path) -> None:
        """Positions should be in chronological order."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        for feature in result.features:
            positions = feature["properties"]["positions"]
            for i in range(1, len(positions)):
                assert positions[i]["time"] >= positions[i - 1]["time"]

    def test_smart_intervals_set_for_6_hour_track(
        self, boat2_content: str, boat2_rep: Path
    ) -> None:
        """Track spanning ~6.7 hours should get 6-12 hour tier intervals."""
        handler = REPHandler()
        result = handler.parse(boat2_content, str(boat2_rep))

        # boat2.rep spans from 05:03 to 11:45 (~6.7 hours)
        track = result.features[0]
        props = track["properties"]

        assert "symbol_interval" in props
        assert "label_interval" in props
        # 6-12 hour tracks get PT15M symbols, PT1H labels
        assert props["symbol_interval"] == "PT15M"
        assert props["label_interval"] == "PT1H"


class TestSmartIntervalsIntegration:
    """Integration tests for smart interval calculation in parsed tracks."""

    def test_short_track_intervals(self) -> None:
        """Short 15-minute track should get 1 min symbols, 5 min labels."""
        # Create a track spanning 15 minutes
        content = """951212 050000.000 TESTSHIP @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 050500.000 TESTSHIP @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
951212 051000.000 TESTSHIP @C 22 11 10.51 N 21 42 14.81 W 269.9 2.0 0
951212 051500.000 TESTSHIP @C 22 11 10.51 N 21 42 27.27 W 268.7 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        track = result.features[0]
        props = track["properties"]

        # < 30 minute tracks get PT1M symbols, PT5M labels
        assert props["symbol_interval"] == "PT1M"
        assert props["label_interval"] == "PT5M"

    def test_1_hour_track_intervals(self) -> None:
        """1-hour track should get 5 min symbols, 15 min labels."""
        # Create a track spanning 1 hour
        content = """951212 050000.000 TESTSHIP @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 053000.000 TESTSHIP @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
951212 060000.000 TESTSHIP @C 22 11 10.51 N 21 42 14.81 W 269.9 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        track = result.features[0]
        props = track["properties"]

        # 30 min - 2 hour tracks get PT5M symbols, PT15M labels
        assert props["symbol_interval"] == "PT5M"
        assert props["label_interval"] == "PT15M"

    def test_12_hour_track_intervals(self) -> None:
        """12-hour track should get 30 min symbols, 2 hour labels."""
        # Create a track spanning 12 hours
        content = """951212 050000.000 TESTSHIP @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0
951212 110000.000 TESTSHIP @C 22 11 10.58 N 21 42 2.98 W 269.7 2.0 0
951212 170000.000 TESTSHIP @C 22 11 10.51 N 21 42 14.81 W 269.9 2.0 0
"""
        handler = REPHandler()
        result = handler.parse(content, "test.rep")

        track = result.features[0]
        props = track["properties"]

        # 12-24 hour tracks get PT30M symbols, PT2H labels
        assert props["symbol_interval"] == "PT30M"
        assert props["label_interval"] == "PT2H"


# ── Sensor Integration Tests (#117) ───────────────────────────────────

SENSOR_FIXTURES = Path(__file__).parent / "fixtures" / "valid"


class TestSensorIntegration:
    """Integration tests for REP sensor line parsing (#117).

    Tests T005-T007 (Phase 2), T024 (Phase 3), T036 (Phase 5),
    T042 (Phase 6), T048 (Phase 7).
    """

    def test_no_standalone_sensor_features(self) -> None:
        """T005: REP parse produces no standalone SENSOR/SENSOR_CONTACT features."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        for feature in result.features:
            kind = feature["properties"].get("kind", "")
            assert kind not in ("SENSOR", "SENSOR_CONTACT", "SENSOR2"), (
                f"Found standalone sensor feature with kind={kind}"
            )

    def test_sensor_lines_populate_pending_sensor_data(self) -> None:
        """T006: sensor lines populate pending_sensor_data on ParseResult."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        assert len(result.pending_sensor_data) > 0
        # NELSON should have TOWED_ARRAY sensor data
        assert "NELSON" in result.pending_sensor_data
        nelson_sensors = result.pending_sensor_data["NELSON"]
        sensor_names = {s.name for s in nelson_sensors}
        assert "TOWED_ARRAY" in sensor_names

    def test_orphaned_sensor_emits_warning(self) -> None:
        """T007: orphaned sensor data emits ORPHANED_SENSOR warning."""
        content = (SENSOR_FIXTURES / "sensor_edge_cases.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_edge_cases.rep")

        orphan_warnings = [w for w in result.warnings if w.code == "ORPHANED_SENSOR"]
        assert len(orphan_warnings) >= 1
        assert any("PHANTOM" in w.message for w in orphan_warnings)

    def test_full_rep_parse_with_sensor_v1(self) -> None:
        """T024: full REP parse with SENSOR v1 lines produces correct embedded sensors."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        # NELSON should have TOWED_ARRAY with 3 contacts
        nelson_sensors = result.pending_sensor_data["NELSON"]
        towed = next(s for s in nelson_sensors if s.name == "TOWED_ARRAY")
        assert len(towed.contacts) == 3
        # First contact should have explicit origin (DMS coords)
        assert towed.contacts[0].origin is not None
        # Second/third contacts should have no origin (NULL location)
        assert towed.contacts[1].origin is None
        assert towed.contacts[2].origin is None

    def test_sensor2_integration(self) -> None:
        """T036: SENSOR2 lines produce correct embedded sensor data."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        # FRIGATE should have SENSOR_A
        frigate_sensors = result.pending_sensor_data["FRIGATE"]
        sensor_a = next(s for s in frigate_sensors if s.name == "SENSOR_A")
        # 2 SENSOR2 + 1 SENSOR3 = 3 contacts for SENSOR_A
        assert len(sensor_a.contacts) == 3

    def test_sensor3_mixed_format_integration(self) -> None:
        """T042: SENSOR3 lines in mixed-format REP file produce correct output."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        frigate_sensors = result.pending_sensor_data["FRIGATE"]
        sensor_a = next(s for s in frigate_sensors if s.name == "SENSOR_A")
        # Third contact (from SENSOR3 line) should have ambiguous bearing
        contacts = sensor_a.contacts
        # Sorted by time — the SENSOR3 line is 050200.000 (3rd chronologically)
        third = contacts[2]
        assert third.ambiguous_bearing is not None

    def test_sensorarc_produces_coverage_annotation(self) -> None:
        """T048: SENSORARC lines produce coverage annotations alongside embedded sensors."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        # Find DYNAMIC_TRACK_COVERAGE features
        coverage_features = [
            f for f in result.features if f["properties"].get("kind") == "DYNAMIC_TRACK_COVERAGE"
        ]
        assert len(coverage_features) == 1
        cov = coverage_features[0]
        assert cov["properties"]["track_id"] == "FRIGATE"
        assert cov["properties"]["left_bearing"] == 270.0
        assert cov["properties"]["right_bearing"] == 90.0

    def test_quoted_track_name_in_sensor(self) -> None:
        """Quoted track names in SENSOR lines are correctly parsed."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        # "NEL STYLE" should be in pending_sensor_data
        assert "NEL STYLE" in result.pending_sensor_data
        nel_sensors = result.pending_sensor_data["NEL STYLE"]
        assert nel_sensors[0].name == "HULL_SONAR"

    def test_mixed_format_merge(self) -> None:
        """Sensor contacts from SENSOR/SENSOR2/SENSOR3 merge into one SensorData."""
        content = (SENSOR_FIXTURES / "sensor_edge_cases.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_edge_cases.rep")

        testship_sensors = result.pending_sensor_data["TESTSHIP"]
        merge_sensor = next((s for s in testship_sensors if s.name == "MERGE_SENSOR"), None)
        assert merge_sensor is not None
        assert len(merge_sensor.contacts) == 3

    def test_track_features_still_valid(self) -> None:
        """Track features are still correctly produced alongside sensor data."""
        content = (SENSOR_FIXTURES / "sensor_all_formats.rep").read_text()
        handler = REPHandler()
        result = handler.parse(content, "sensor_all_formats.rep")

        track_features = [f for f in result.features if f["properties"].get("kind") == "TRACK"]
        assert len(track_features) == 2
        track_names = {f["properties"]["platform_id"] for f in track_features}
        assert track_names == {"NELSON", "FRIGATE"}
