"""Tests for DSF format handler.

Tests cover:
- SENSOR2 line parsing (with tabs, spaces, NULL fields)
- SENSOR line parsing (with NULL position, DMS coordinates)
- Handler registration and extension matching
- Error handling for malformed lines
- Comment and blank line skipping
"""

from pathlib import Path

from debrief_io.handlers.dsf import DSFHandler

FIXTURES = Path(__file__).parent / "fixtures" / "valid"


class TestDSFHandlerBasic:
    """Tests for DSFHandler basic properties."""

    def test_handler_properties(self) -> None:
        handler = DSFHandler()
        assert handler.name == "Debrief DSF Format"
        assert ".dsf" in handler.extensions
        assert handler.version == "1.0.0"


class TestDSFParsing:
    """Tests for DSF file parsing."""

    def test_parse_dsf_file(self) -> None:
        handler = DSFHandler()
        content = (FIXTURES / "sen_frig_sensor.dsf").read_text()
        result = handler.parse(content, str(FIXTURES / "sen_frig_sensor.dsf"))

        assert result.handler == "Debrief DSF Format"
        # DSF produces no standalone features; contacts go to pending_sensor_data
        assert len(result.features) == 0
        assert len(result.pending_sensor_data) > 0
        # Count total contacts across all tracks/sensors
        total_contacts = sum(
            len(s.contacts) for sensors in result.pending_sensor_data.values() for s in sensors
        )
        assert total_contacts == 4  # 3 SENSOR2 + 1 SENSOR

    def test_sensor2_with_tabs(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR2:\t951212\t054902.486\tFRIGATE\t@A\tNULL\t032.8\t12000.0\t150.0\tNULL\tSENSOR_A\tfirst contact\n"
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 0
        assert "FRIGATE" in result.pending_sensor_data
        sensors = result.pending_sensor_data["FRIGATE"]
        assert len(sensors) == 1
        assert sensors[0].name == "SENSOR_A"
        contact = sensors[0].contacts[0]
        assert contact.bearing == 32.8
        assert contact.range == 12000.0
        assert contact.frequency == 150.0

    def test_sensor2_with_quoted_track(self) -> None:
        handler = DSFHandler()
        content = ';SENSOR2: 20010101 145342.894 "OS" @B NULL 221.5 NULL NULL NULL "FS" "Contact"\n'
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 0
        assert "OS" in result.pending_sensor_data
        sensors = result.pending_sensor_data["OS"]
        assert len(sensors) == 1
        assert sensors[0].name == "FS"
        contact = sensors[0].contacts[0]
        assert contact.bearing == 221.5
        assert contact.range is None  # NULL
        assert contact.frequency is None  # NULL

    def test_sensor_with_null_position(self) -> None:
        handler = DSFHandler()
        content = (
            ";SENSOR: 951212 055200 SUBMARINE @B NULL 180.5 8000.0 TOWED_ARRAY towed contact\n"
        )
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 0
        assert "SUBMARINE" in result.pending_sensor_data
        contact = result.pending_sensor_data["SUBMARINE"][0].contacts[0]
        assert contact.bearing == 180.5

    def test_sensor_with_coordinates(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR: 100112 121314 OWNSHIP @A 0 4 0 S 30 0 10 W 2.4 12000 Plain Cookie\n"
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 0
        assert "OWNSHIP" in result.pending_sensor_data

    def test_empty_file(self) -> None:
        handler = DSFHandler()
        result = handler.parse("", "empty.dsf")
        assert len(result.features) == 0
        assert len(result.warnings) == 0

    def test_comments_skipped(self) -> None:
        handler = DSFHandler()
        content = ";; This is a comment\n;; Another comment\n"
        result = handler.parse(content, "comments.dsf")
        assert len(result.features) == 0
        assert len(result.warnings) == 0

    def test_non_sensor_lines_warn(self) -> None:
        handler = DSFHandler()
        content = "This is not a sensor line\n;SENSOR2: 951212 055200.000 SUB @B NULL 180.5 8000.0 150.0 NULL TA contact\n"
        result = handler.parse(content, "mixed.dsf")

        unknown = [w for w in result.warnings if w.code == "UNKNOWN_RECORD"]
        assert len(unknown) == 1

    def test_blank_lines_skipped(self) -> None:
        handler = DSFHandler()
        content = (
            "\n\n;SENSOR2: 951212 055200.000 SUB @B NULL 180.5 8000.0 150.0 NULL TA contact\n\n"
        )
        result = handler.parse(content, "blanks.dsf")

        unknown = [w for w in result.warnings if w.code == "UNKNOWN_RECORD"]
        assert len(unknown) == 0

    def test_null_fields_excluded(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR2: 951212 055200.000 SUB @B NULL 180.5 NULL NULL NULL TA label\n"
        result = handler.parse(content, "test.dsf")

        contact = result.pending_sensor_data["SUB"][0].contacts[0]
        assert contact.range is None
        assert contact.frequency is None


class TestDSFRegistration:
    """Tests for DSF handler registration via debrief_io."""

    def test_dsf_registered(self) -> None:
        from debrief_io import get_handler

        handler = get_handler("test.dsf")
        assert handler is not None
        assert handler.name == "Debrief DSF Format"

    def test_dpf_registered(self) -> None:
        from debrief_io import get_handler

        handler = get_handler("test.dpf")
        assert handler is not None
        assert handler.name == "Debrief DPF Format"
