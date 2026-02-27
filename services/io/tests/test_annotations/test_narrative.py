"""Tests for NARRATIVE annotation parsing."""

import pytest

from debrief_io.exceptions import AnnotationParseError
from debrief_io.handlers.annotations.builders import build_narrative


class TestBuildNarrative:
    """Test NARRATIVE annotation parsing."""

    def test_parse_basic_narrative(self) -> None:
        """Parse a basic NARRATIVE line."""
        line = ";NARRATIVE: 951212 050200 NEL_STYLE comment text here"
        result = build_narrative(line, 1, "test.rep")

        assert result["type"] == "Feature"
        assert result["geometry"] == {"type": "Point", "coordinates": []}
        assert result["properties"]["kind"] == "NARRATIVE"
        assert result["properties"]["time"] == "1995-12-12T05:02:00+00:00"
        assert result["properties"]["track_id"] == "NEL_STYLE"
        assert result["properties"]["text"] == "comment text here"
        assert result["properties"]["source_file"] == "test.rep"
        assert result["properties"]["line_number"] == 1

    def test_parse_narrative_empty_text(self) -> None:
        """Parse NARRATIVE with no text content."""
        line = ";NARRATIVE: 951212 050200 TRACK_NAME"
        result = build_narrative(line, 1, "test.rep")

        assert result["properties"]["track_id"] == "TRACK_NAME"
        assert result["properties"]["text"] == ""

    def test_parse_narrative_multiword_text(self) -> None:
        """Parse NARRATIVE with multi-word text."""
        line = ";NARRATIVE: 951212 050200 TRACK POSSUB TRACK 14 held on bearing"
        result = build_narrative(line, 1, "test.rep")

        assert result["properties"]["track_id"] == "TRACK"
        assert result["properties"]["text"] == "POSSUB TRACK 14 held on bearing"

    def test_parse_narrative2(self) -> None:
        """Parse NARRATIVE2 line (same format)."""
        line = ";NARRATIVE2: 951212 050500 NEL_STYLE2 GenComment2 Mk Rge BAAA R121212"
        result = build_narrative(line, 1, "test.rep")

        assert result["properties"]["kind"] == "NARRATIVE"
        assert result["properties"]["track_id"] == "NEL_STYLE2"
        assert result["properties"]["text"] == "GenComment2 Mk Rge BAAA R121212"

    def test_has_unique_id(self) -> None:
        """Each parsed narrative has a unique ID."""
        line = ";NARRATIVE: 951212 050200 TRACK text"
        result1 = build_narrative(line, 1, "test.rep")
        result2 = build_narrative(line, 2, "test.rep")

        assert result1["id"] != result2["id"]
        assert len(result1["id"]) == 36  # UUID format

    def test_missing_timestamp_raises(self) -> None:
        """Missing timestamp raises AnnotationParseError."""
        line = ";NARRATIVE: invalid timestamp"
        with pytest.raises(AnnotationParseError, match="Missing or invalid timestamp"):
            build_narrative(line, 1, "test.rep")

    def test_incomplete_narrative_raises(self) -> None:
        """Incomplete NARRATIVE raises AnnotationParseError."""
        line = ";NARRATIVE: 951212 050200"
        with pytest.raises(AnnotationParseError, match="Incomplete NARRATIVE"):
            build_narrative(line, 1, "test.rep")

    def test_error_includes_line_number(self) -> None:
        """Error includes line number context."""
        line = ";NARRATIVE: invalid"
        with pytest.raises(AnnotationParseError) as exc_info:
            build_narrative(line, 42, "test.rep")
        assert exc_info.value.line_number == 42
        assert exc_info.value.filename == "test.rep"

    def test_timestamp_year_conversion(self) -> None:
        """2-digit years are converted correctly."""
        # 95 -> 1995
        line = ";NARRATIVE: 951212 050200 TRACK text"
        result = build_narrative(line, 1, "test.rep")
        assert "1995" in result["properties"]["time"]

        # 26 -> 2026
        line = ";NARRATIVE: 261212 050200 TRACK text"
        result = build_narrative(line, 1, "test.rep")
        assert "2026" in result["properties"]["time"]
