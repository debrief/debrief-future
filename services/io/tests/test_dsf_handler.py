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
        assert len(result.features) == 4  # 3 SENSOR2 + 1 SENSOR

    def test_sensor2_with_tabs(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR2:\t951212\t054902.486\tFRIGATE\t@A\tNULL\t032.8\t12000.0\t150.0\tNULL\tSENSOR_A\tfirst contact\n"
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 1
        props = result.features[0]["properties"]
        assert props["kind"] == "SENSOR_CONTACT"
        assert props["parent_track"] == "FRIGATE"
        assert props["bearing"] == 32.8
        assert props["range"] == 12000.0
        assert props["frequency"] == 150.0
        assert props["sensor_name"] == "SENSOR_A"

    def test_sensor2_with_quoted_track(self) -> None:
        handler = DSFHandler()
        content = ';SENSOR2: 20010101 145342.894 "OS" @B NULL 221.5 NULL NULL NULL "FS" "Contact"\n'
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 1
        props = result.features[0]["properties"]
        assert props["parent_track"] == "OS"
        assert props["bearing"] == 221.5
        assert "range" not in props  # NULL
        assert "frequency" not in props  # NULL
        assert props["sensor_name"] == "FS"

    def test_sensor_with_null_position(self) -> None:
        handler = DSFHandler()
        content = (
            ";SENSOR: 951212 055200 SUBMARINE @B NULL 180.5 8000.0 TOWED_ARRAY towed contact\n"
        )
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 1
        props = result.features[0]["properties"]
        assert props["parent_track"] == "SUBMARINE"
        assert props["bearing"] == 180.5

    def test_sensor_with_coordinates(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR: 100112 121314 OWNSHIP @A 0 4 0 S 30 0 10 W 2.4 12000 Plain Cookie\n"
        result = handler.parse(content, "test.dsf")

        assert len(result.features) == 1
        props = result.features[0]["properties"]
        assert props["parent_track"] == "OWNSHIP"

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

        props = result.features[0]["properties"]
        assert "range" not in props
        assert "frequency" not in props
        assert "speed" not in props


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
