"""Tests for sensor_parser module.

Tests cover:
- SENSOR v1 line parsing (quoted/unquoted names, DMS/NULL location, range conversion)
- SENSOR v2 line parsing (ambiguous bearing, frequency, boolean flags)
- SENSOR v3 line parsing (accuracy fields silently discarded)
- SENSORARC line parsing (DynamicTrackCoverage annotation features)
- NULL/NAN bearing handling (has_bearing flag)
- Contact grouping into SensorData dicts
- Edge cases (malformed lines, missing fields, bearing=360, zero range)
"""

from datetime import UTC, datetime
from pathlib import Path

import pytest

from debrief_io.handlers.sensor_parser import (
    YARDS_TO_METRES,
    ParsedSensorContact,
    group_sensor_contacts,
    is_sensor_line,
    parse_sensor_v1,
    parse_sensor_v2,
    parse_sensor_v3,
    parse_sensorarc,
)

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


# ── is_sensor_line ─────────────────────────────────────────────────────


class TestIsSensorLine:
    def test_sensor_v1(self) -> None:
        assert is_sensor_line(";SENSOR: 951212 050000 NELSON @C NULL 045.0 5000 TOWED")

    def test_sensor_v2(self) -> None:
        assert is_sensor_line(";SENSOR2: 951212 050000 FRIGATE @A NULL 032.8 12000 240 169 NULL S")

    def test_sensor_v3(self) -> None:
        assert is_sensor_line(
            ";SENSOR3: 951212 050000 FRIGATE @A NULL 032.8 12000 240 169 5 2 NULL S"
        )

    def test_sensorarc(self) -> None:
        assert is_sensor_line(";SENSORARC 951212 050000 951212 050500 FRIGATE 270 90 0 5000")

    def test_not_sensor(self) -> None:
        assert not is_sensor_line(";NARRATIVE: 951212 050000 some text")

    def test_not_annotation(self) -> None:
        assert not is_sensor_line("951212 050000 NELSON @C 22 11 10 N 21 41 52 W 269 2 0")


# ── SENSOR v1 ──────────────────────────────────────────────────────────


class TestParseSensorV1:
    """T013-T020: SENSOR v1 line parsing tests."""

    def test_extracts_all_fields(self) -> None:
        """T013: parse_sensor_v1 extracts all fields from a valid line."""
        line = ";SENSOR: 951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 045.0 5000 TOWED_ARRAY contact_1"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.parent_track == "NELSON"
        assert result.sensor_name == "TOWED_ARRAY"
        assert result.bearing == 45.0
        assert result.has_bearing is True
        assert result.range_m == pytest.approx(5000 * YARDS_TO_METRES)
        assert result.label == "contact_1"
        assert result.color_code == "C"
        assert result.origin is not None
        assert len(result.origin) == 2
        assert result.line_number == 1
        assert result.time.year == 1995
        assert result.time.month == 12
        assert result.time.day == 12

    def test_quoted_track_name(self) -> None:
        """T014: parse_sensor_v1 handles quoted track name."""
        line = ';SENSOR: 951212 050000.000 "NEL STYLE" @C NULL 090.0 3000 HULL_SONAR bow_contact'
        result = parse_sensor_v1(line, 5)
        assert result is not None
        assert result.parent_track == "NEL STYLE"
        assert result.sensor_name == "HULL_SONAR"
        assert result.bearing == 90.0
        assert result.label == "bow_contact"

    def test_null_location(self) -> None:
        """T015: parse_sensor_v1 handles NULL location (origin is None)."""
        line = ";SENSOR: 951212 050100.000 NELSON @C NULL 050.0 5500 TOWED_ARRAY contact_2"
        result = parse_sensor_v1(line, 2)
        assert result is not None
        assert result.origin is None
        assert result.bearing == 50.0

    def test_explicit_dms_location(self) -> None:
        """T016: parse_sensor_v1 handles explicit DMS location (origin is [lon, lat])."""
        line = ";SENSOR: 951212 050000.000 NELSON @C 22 11 10.63 N 21 41 52.37 W 045.0 5000 TOWED_ARRAY test"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.origin is not None
        lon, lat = result.origin
        # Lat should be ~22.186 N, Lon should be ~-21.698 W
        assert lat == pytest.approx(22.186286, abs=0.001)
        assert lon == pytest.approx(-21.697881, abs=0.001)

    def test_range_conversion_yards_to_metres(self) -> None:
        """T017: range conversion from yards to metres (5000 yds -> 4572.0 m)."""
        line = ";SENSOR: 951212 050000.000 NELSON @C NULL 045.0 5000 TEST range_test"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.range_m == pytest.approx(5000 * 0.9144)
        assert result.range_m == pytest.approx(4572.0)

    def test_symbology_code_color(self) -> None:
        """T018: symbology code @C produces correct color code."""
        line = ";SENSOR: 951212 050000.000 NELSON @C NULL 045.0 5000 TEST test"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.color_code == "C"  # Red

    def test_contacts_merge_into_single_sensor_data(self) -> None:
        """T019: contacts with same sensor name merge into single SensorData entry."""
        records = [
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=45.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                color_code="C",
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 1, 0, tzinfo=UTC),
                bearing=50.0,
                has_bearing=True,
                range_m=5029.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="C",
                line_number=2,
            ),
        ]
        grouped = group_sensor_contacts(records)
        assert "NELSON" in grouped
        sensors = grouped["NELSON"]
        assert len(sensors) == 1
        assert sensors[0].name == "TOWED"
        assert len(sensors[0].contacts) == 2

    def test_contacts_ordered_by_timestamp(self) -> None:
        """T020: contacts within SensorData are ordered by timestamp."""
        records = [
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 2, 0, tzinfo=UTC),
                bearing=55.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                line_number=3,
            ),
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=45.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 1, 0, tzinfo=UTC),
                bearing=50.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                line_number=2,
            ),
        ]
        grouped = group_sensor_contacts(records)
        contacts = grouped["NELSON"][0].contacts
        times = [c.time for c in contacts]
        assert times == sorted(times)
        assert contacts[0].bearing == 45.0
        assert contacts[1].bearing == 50.0
        assert contacts[2].bearing == 55.0


# ── NULL/NAN Bearing (US5) ─────────────────────────────────────────────


class TestNullNanBearing:
    """T025-T027: NULL and NAN bearing value handling."""

    def test_null_bearing_produces_has_bearing_false(self) -> None:
        """T025: bearing 'NULL' produces has_bearing=false, bearing=0."""
        line = ";SENSOR: 951212 060000.000 TESTSHIP @A NULL NULL 5000 PASSIVE null_brg"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.has_bearing is False
        assert result.bearing == 0.0

    def test_nan_bearing_produces_has_bearing_false(self) -> None:
        """T026: bearing 'NAN' produces has_bearing=false, bearing=0."""
        line = ";SENSOR: 951212 060100.000 TESTSHIP @A NULL NAN 5000 PASSIVE nan_brg"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.has_bearing is False
        assert result.bearing == 0.0

    def test_zero_bearing_true_north_is_valid(self) -> None:
        """T027: bearing 0.0 (true north) produces has_bearing=true, bearing=0.0."""
        line = ";SENSOR: 951212 060200.000 TESTSHIP @A NULL 0.0 5000 PASSIVE zero_brg"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.has_bearing is True
        assert result.bearing == 0.0


# ── SENSOR v2 ──────────────────────────────────────────────────────────


class TestParseSensorV2:
    """T030-T033: SENSOR2 line parsing tests."""

    def test_extracts_ambiguous_bearing_and_frequency(self) -> None:
        """T030: parse_sensor_v2 extracts ambiguous_bearing and frequency."""
        line = ";SENSOR2: 951212 050000.000 FRIGATE @A NULL 032.8 12000 240.5 169.4 NULL SENSOR_A first contact"
        result = parse_sensor_v2(line, 1)
        assert result is not None
        assert result.parent_track == "FRIGATE"
        assert result.bearing == pytest.approx(32.8)
        assert result.has_bearing is True
        assert result.ambiguous_bearing == pytest.approx(240.5)
        assert result.has_ambiguous is True
        assert result.frequency == pytest.approx(169.4)
        assert result.has_frequency is True
        assert result.sensor_name == "SENSOR_A"
        assert result.label == "first contact"

    def test_null_ambiguous_bearing(self) -> None:
        """T031: parse_sensor_v2 with NULL ambiguous bearing sets has_ambiguous=false."""
        line = (
            ";SENSOR2: 951212 050100.000 FRIGATE @A NULL 035.2 11500 NULL NULL NULL SENSOR_A second"
        )
        result = parse_sensor_v2(line, 2)
        assert result is not None
        assert result.ambiguous_bearing is None
        assert result.has_ambiguous is False

    def test_null_frequency(self) -> None:
        """T032: parse_sensor_v2 with NULL frequency sets has_frequency=false."""
        line = (
            ";SENSOR2: 951212 050100.000 FRIGATE @A NULL 035.2 11500 NULL NULL NULL SENSOR_A second"
        )
        result = parse_sensor_v2(line, 2)
        assert result is not None
        assert result.frequency is None
        assert result.has_frequency is False

    def test_multiple_contacts_merge(self) -> None:
        """T033: multiple SENSOR2 contacts merge into one SensorData entry."""
        records = [
            ParsedSensorContact(
                parent_track="FRIGATE",
                sensor_name="SENSOR_A",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=32.8,
                has_bearing=True,
                range_m=10972.8,
                has_frequency=True,
                has_ambiguous=True,
                frequency=169.4,
                ambiguous_bearing=240.5,
                color_code="A",
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="FRIGATE",
                sensor_name="SENSOR_A",
                time=datetime(1995, 12, 12, 5, 1, 0, tzinfo=UTC),
                bearing=35.2,
                has_bearing=True,
                range_m=10516.8,
                has_frequency=False,
                has_ambiguous=False,
                color_code="A",
                line_number=2,
            ),
        ]
        grouped = group_sensor_contacts(records)
        assert len(grouped["FRIGATE"]) == 1
        sensor = grouped["FRIGATE"][0]
        assert sensor.name == "SENSOR_A"
        assert len(sensor.contacts) == 2

    def test_v2_nan_bearing(self) -> None:
        """SENSOR2 with NAN bearing produces has_bearing=false."""
        line = ";SENSOR2: 951212 060100.000 TESTSHIP @A NULL NAN 5000 NULL NULL NULL TEST nan_brg"
        result = parse_sensor_v2(line, 1)
        assert result is not None
        assert result.has_bearing is False
        assert result.bearing == 0.0


# ── SENSOR v3 ──────────────────────────────────────────────────────────


class TestParseSensorV3:
    """T037-T039: SENSOR3 line parsing tests."""

    def test_extracts_sensor2_equivalent_fields(self) -> None:
        """T037: parse_sensor_v3 extracts all SENSOR2-equivalent fields correctly."""
        line = ";SENSOR3: 951212 050200.000 FRIGATE @A NULL 038.0 11000 242.0 170.0 5.0 2.0 NULL SENSOR_A third contact"
        result = parse_sensor_v3(line, 1)
        assert result is not None
        assert result.parent_track == "FRIGATE"
        assert result.bearing == pytest.approx(38.0)
        assert result.has_bearing is True
        assert result.range_m == pytest.approx(11000 * YARDS_TO_METRES)
        assert result.ambiguous_bearing == pytest.approx(242.0)
        assert result.has_ambiguous is True
        assert result.frequency == pytest.approx(170.0)
        assert result.has_frequency is True
        assert result.sensor_name == "SENSOR_A"
        assert result.label == "third contact"

    def test_discards_accuracy_fields(self) -> None:
        """T038: parse_sensor_v3 silently discards bearing accuracy and frequency accuracy."""
        line = ";SENSOR3: 951212 050200.000 FRIGATE @A NULL 038.0 11000 242.0 170.0 5.0 2.0 NULL SENSOR_A test"
        result = parse_sensor_v3(line, 1)
        assert result is not None
        # Accuracy fields are not stored anywhere on ParsedSensorContact
        assert not hasattr(result, "bearing_accuracy")
        assert not hasattr(result, "frequency_accuracy")
        # Core fields are still correct
        assert result.bearing == pytest.approx(38.0)
        assert result.frequency == pytest.approx(170.0)

    def test_mixed_formats_merge_into_single_sensor_data(self) -> None:
        """T039: mixed SENSOR/SENSOR2/SENSOR3 lines merge into single SensorData."""
        records = [
            ParsedSensorContact(
                parent_track="TESTSHIP",
                sensor_name="MERGE",
                time=datetime(1995, 12, 12, 6, 6, 0, tzinfo=UTC),
                bearing=100.0,
                has_bearing=True,
                range_m=2743.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="D",
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="TESTSHIP",
                sensor_name="MERGE",
                time=datetime(1995, 12, 12, 6, 7, 0, tzinfo=UTC),
                bearing=110.0,
                has_bearing=True,
                range_m=2743.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="D",
                line_number=2,
            ),
            ParsedSensorContact(
                parent_track="TESTSHIP",
                sensor_name="MERGE",
                time=datetime(1995, 12, 12, 6, 8, 0, tzinfo=UTC),
                bearing=120.0,
                has_bearing=True,
                range_m=2743.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="D",
                line_number=3,
            ),
        ]
        grouped = group_sensor_contacts(records)
        assert len(grouped["TESTSHIP"]) == 1
        sensor = grouped["TESTSHIP"][0]
        assert sensor.name == "MERGE"
        assert len(sensor.contacts) == 3

    def test_v3_null_accuracy_produces_same_as_v2(self) -> None:
        """SENSOR3 with NULL accuracy fields produces identical output to SENSOR2."""
        v2_line = (
            ";SENSOR2: 951212 050200.000 FRIGATE @A NULL 038.0 11000 242.0 170.0 NULL SENSOR_A test"
        )
        v3_line = ";SENSOR3: 951212 050200.000 FRIGATE @A NULL 038.0 11000 242.0 170.0 NULL NULL NULL SENSOR_A test"
        v2 = parse_sensor_v2(v2_line, 1)
        v3 = parse_sensor_v3(v3_line, 2)
        assert v2 is not None
        assert v3 is not None
        assert v2.bearing == v3.bearing
        assert v2.range_m == v3.range_m
        assert v2.ambiguous_bearing == v3.ambiguous_bearing
        assert v2.frequency == v3.frequency
        assert v2.has_bearing == v3.has_bearing
        assert v2.has_ambiguous == v3.has_ambiguous
        assert v2.has_frequency == v3.has_frequency


# ── SENSORARC ──────────────────────────────────────────────────────────


class TestParseSensorarc:
    """T043-T045: SENSORARC line parsing tests."""

    def test_extracts_all_fields(self) -> None:
        """T043: parse_sensorarc extracts all fields correctly."""
        line = ";SENSORARC 951212 050000.000 951212 050500.000 FRIGATE 270 90 0 5000"
        result = parse_sensorarc(line, 1)
        assert result is not None
        assert result["properties"]["kind"] == "DYNAMIC_TRACK_COVERAGE"
        assert result["properties"]["track_id"] == "FRIGATE"
        assert result["properties"]["left_bearing"] == 270.0
        assert result["properties"]["right_bearing"] == 90.0
        assert result["properties"]["inner_range"] == 0.0
        assert result["properties"]["outer_range"] == 5000.0
        assert "1995-12-12T05:00:00" in result["properties"]["start_time"]
        assert "1995-12-12T05:05:00" in result["properties"]["end_time"]

    def test_produces_dynamic_track_coverage_not_sensor_contact(self) -> None:
        """T044: SENSORARC produces DynamicTrackCoverage feature, not SensorContact."""
        line = ";SENSORARC 951212 050000.000 951212 050500.000 FRIGATE 270 90 0 5000"
        result = parse_sensorarc(line, 1)
        assert result is not None
        assert result["type"] == "Feature"
        assert result["properties"]["kind"] == "DYNAMIC_TRACK_COVERAGE"
        assert result["geometry"] is None

    def test_track_id_association(self) -> None:
        """T045: SENSORARC track_id correctly associates with parent track."""
        line = ";SENSORARC 951212 050000.000 951212 050500.000 DESTROYER 180 360 100 8000"
        result = parse_sensorarc(line, 1)
        assert result is not None
        assert result["properties"]["track_id"] == "DESTROYER"

    def test_degenerate_sensorarc_inner_equals_outer(self) -> None:
        """Degenerate SENSORARC with inner range == outer range is accepted."""
        line = ";SENSORARC 951212 060000.000 951212 060500.000 TESTSHIP 0 360 5000 5000"
        result = parse_sensorarc(line, 1)
        assert result is not None
        assert result["properties"]["inner_range"] == 5000.0
        assert result["properties"]["outer_range"] == 5000.0


# ── group_sensor_contacts ─────────────────────────────────────────────


class TestGroupSensorContacts:
    """Tests for contact grouping logic."""

    def test_groups_by_track_and_sensor_name(self) -> None:
        records = [
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=45.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                color_code="C",
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="HULL",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=90.0,
                has_bearing=True,
                range_m=2743.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="A",
                line_number=2,
            ),
            ParsedSensorContact(
                parent_track="FRIGATE",
                sensor_name="SONAR",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=32.8,
                has_bearing=True,
                range_m=10972.8,
                has_frequency=False,
                has_ambiguous=False,
                color_code="A",
                line_number=3,
            ),
        ]
        grouped = group_sensor_contacts(records)
        assert len(grouped) == 2
        assert "NELSON" in grouped
        assert "FRIGATE" in grouped
        assert len(grouped["NELSON"]) == 2  # TOWED + HULL
        assert len(grouped["FRIGATE"]) == 1

    def test_color_from_first_contact(self) -> None:
        """SensorData color derived from first contact's symbology code."""
        records = [
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=45.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                color_code="C",
                line_number=1,
            ),
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 1, 0, tzinfo=UTC),
                bearing=50.0,
                has_bearing=True,
                range_m=5029.2,
                has_frequency=False,
                has_ambiguous=False,
                color_code="A",
                line_number=2,
            ),
        ]
        grouped = group_sensor_contacts(records)
        sensor = grouped["NELSON"][0]
        assert sensor.color == "#FF0000"  # C = Red (from first contact)

    def test_contact_dict_includes_boolean_flags(self) -> None:
        """Contact dicts include has_bearing=false when bearing is absent."""
        records = [
            ParsedSensorContact(
                parent_track="SHIP",
                sensor_name="PASSIVE",
                time=datetime(1995, 12, 12, 6, 0, 0, tzinfo=UTC),
                bearing=0.0,
                has_bearing=False,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                line_number=1,
            ),
        ]
        grouped = group_sensor_contacts(records)
        contact = grouped["SHIP"][0].contacts[0]
        assert contact.has_bearing is False
        assert contact.bearing == 0.0

    def test_contact_dict_includes_origin(self) -> None:
        """Contact dicts include origin when explicit coordinates are provided."""
        records = [
            ParsedSensorContact(
                parent_track="NELSON",
                sensor_name="TOWED",
                time=datetime(1995, 12, 12, 5, 0, 0, tzinfo=UTC),
                bearing=45.0,
                has_bearing=True,
                range_m=4572.0,
                has_frequency=False,
                has_ambiguous=False,
                origin=[-21.698, 22.186],
                line_number=1,
            ),
        ]
        grouped = group_sensor_contacts(records)
        contact = grouped["NELSON"][0].contacts[0]
        assert contact.origin == [-21.698, 22.186]

    def test_empty_records_produces_empty_dict(self) -> None:
        grouped = group_sensor_contacts([])
        assert grouped == {}


# ── Edge Cases / Malformed Lines ───────────────────────────────────────


class TestEdgeCases:
    """T049-T051: Edge case and malformed line tests."""

    def test_malformed_sensor_v1_too_few_fields(self) -> None:
        """Malformed SENSOR line with too few fields returns None."""
        line = ";SENSOR: 951212 050000"
        result = parse_sensor_v1(line, 1)
        assert result is None

    def test_malformed_sensor_v2_too_few_fields(self) -> None:
        line = ";SENSOR2: 951212 050000"
        result = parse_sensor_v2(line, 1)
        assert result is None

    def test_malformed_sensor_v3_too_few_fields(self) -> None:
        line = ";SENSOR3: 951212 050000"
        result = parse_sensor_v3(line, 1)
        assert result is None

    def test_malformed_sensorarc_too_few_fields(self) -> None:
        line = ";SENSORARC 951212 050000"
        result = parse_sensorarc(line, 1)
        assert result is None

    def test_bearing_360_normalises_to_0(self) -> None:
        """Bearing of 360 is accepted and normalised to 0 (schema range 0-360)."""
        line = ";SENSOR: 951212 060300.000 TESTSHIP @A NULL 360.0 5000 TEST bearing_360"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.has_bearing is True
        assert result.bearing == 0.0  # 360 % 360 = 0

    def test_zero_range(self) -> None:
        """Zero range is accepted."""
        line = ";SENSOR: 951212 060400.000 TESTSHIP @A NULL 045.0 0 TEST zero_range"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.range_m == pytest.approx(0.0)

    def test_sensor_name_defaults_to_unknown(self) -> None:
        """Missing sensor name defaults to 'Unknown'."""
        line = ";SENSOR: 951212 060000.000 TESTSHIP @A NULL 045.0 5000"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.sensor_name == "Unknown"

    def test_tabs_normalised(self) -> None:
        """Tab-separated SENSOR line is correctly parsed."""
        line = ";SENSOR:\t951212\t050000.000\tNELSON\t@C\tNULL\t045.0\t5000\tTOWED\ttab_test"
        result = parse_sensor_v1(line, 1)
        assert result is not None
        assert result.parent_track == "NELSON"
        assert result.sensor_name == "TOWED"
        assert result.label == "tab_test"

    def test_provenance_line_number(self) -> None:
        """Parsed contacts include the source line number for provenance."""
        line = ";SENSOR: 951212 050000.000 NELSON @C NULL 045.0 5000 TOWED test"
        result = parse_sensor_v1(line, 42)
        assert result is not None
        assert result.line_number == 42


# ── Performance ────────────────────────────────────────────────────────


class TestPerformance:
    """T051: Performance test for SC-008."""

    def test_10000_line_rep_parses_under_1_second(self) -> None:
        """10,000-line REP file with mixed sensor formats parses in under 1 second."""
        import time

        from debrief_io.handlers.rep import REPHandler

        # Generate a 10k-line REP file with mixed formats
        lines = []
        # 5000 track positions
        for i in range(5000):
            minutes = i % 60
            seconds = (i * 0.1) % 60
            lines.append(
                f"951212 05{minutes:02d}{seconds:04.1f} NELSON @C 22 11 10.63 N 21 41 52.37 W 269.7 2.0 0"
            )
        # 2500 SENSOR v1 lines
        for i in range(2500):
            minutes = i % 60
            lines.append(
                f";SENSOR: 951212 05{minutes:02d}00.000 NELSON @C NULL {i % 360}.0 5000 TOWED contact_{i}"
            )
        # 1500 SENSOR2 lines
        for i in range(1500):
            minutes = i % 60
            lines.append(
                f";SENSOR2: 951212 05{minutes:02d}00.000 NELSON @A NULL {i % 360}.0 5000 200.0 150.0 NULL SONAR2 label_{i}"
            )
        # 500 SENSOR3 lines
        for i in range(500):
            minutes = i % 60
            lines.append(
                f";SENSOR3: 951212 05{minutes:02d}00.000 NELSON @A NULL {i % 360}.0 5000 200.0 150.0 3.0 1.0 NULL SONAR3 label_{i}"
            )
        # 500 SENSORARC lines
        for i in range(500):
            minutes = i % 60
            lines.append(
                f";SENSORARC 951212 05{minutes:02d}00.000 951212 05{minutes:02d}30.000 NELSON 270 90 0 5000"
            )

        content = "\n".join(lines)
        assert len(lines) == 10000

        handler = REPHandler()
        start = time.perf_counter()
        result = handler.parse(content, "perf_test.rep")
        elapsed = time.perf_counter() - start

        assert elapsed < 1.0, f"Parsing took {elapsed:.2f}s (must be under 1s)"
        assert len(result.pending_sensor_data) > 0
        assert len(result.features) > 0
