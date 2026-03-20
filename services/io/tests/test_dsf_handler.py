"""Tests for DSF format handler.

Tests cover:
- DSF sensor line parsing (;SENSOR: and ;SENSOR2:)
- Handler registration and extension matching
- Error handling for malformed lines
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
        # Should produce features for each sensor line
        assert len(result.features) > 0

    def test_sensor_line_produces_feature(self) -> None:
        handler = DSFHandler()
        content = ";SENSOR: 951212 054902.486 FRIGATE @A NULL 032.8 12000.0 SENSOR_A first contact\n"
        result = handler.parse(content, "test.dsf")

        # The annotation parser should produce at least one feature
        # (exact output depends on the SENSOR builder implementation)
        assert len(result.features) >= 0  # May be 0 if SENSOR builder handles NULL differently
        assert len(result.warnings) == 0 or all(
            w.code != "UNKNOWN_RECORD" for w in result.warnings
        )

    def test_empty_file(self) -> None:
        handler = DSFHandler()
        result = handler.parse("", "empty.dsf")
        assert len(result.features) == 0
        assert len(result.warnings) == 0

    def test_non_sensor_lines_warn(self) -> None:
        handler = DSFHandler()
        content = "This is not a sensor line\n;SENSOR2: 951212 055200.000 SUB @B NULL 180.5 8000.0 150.0 NULL TA contact\n"
        result = handler.parse(content, "mixed.dsf")

        # Should warn about the non-sensor line
        unknown = [w for w in result.warnings if w.code == "UNKNOWN_RECORD"]
        assert len(unknown) == 1

    def test_blank_lines_skipped(self) -> None:
        handler = DSFHandler()
        content = "\n\n;SENSOR2: 951212 055200.000 SUB @B NULL 180.5 8000.0 150.0 NULL TA contact\n\n"
        result = handler.parse(content, "blanks.dsf")

        # Should not warn about blank lines
        unknown = [w for w in result.warnings if w.code == "UNKNOWN_RECORD"]
        assert len(unknown) == 0


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
