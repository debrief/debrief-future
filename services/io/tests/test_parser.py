"""Tests for main parser module."""

import pytest

from debrief_io import parse, parse_rep
from debrief_io.exceptions import UnsupportedFormatError


class TestParse:
    """Tests for main parse function."""

    def test_parse_rep_file(self, boat2_rep):
        """Parse a REP file using main parse function."""
        result = parse(boat2_rep)

        assert len(result.features) >= 1
        assert result.handler == "Debrief REP Format"
        assert result.encoding == "utf-8"

    def test_parse_string_path(self, boat2_rep):
        """Accept string path."""
        result = parse(str(boat2_rep))
        assert len(result.features) >= 1

    def test_parse_file_not_found(self):
        """Raise FileNotFoundError for missing file."""
        with pytest.raises(FileNotFoundError):
            parse("/nonexistent/file.rep")

    def test_parse_unsupported_format(self, tmp_path):
        """Raise UnsupportedFormatError for unknown extension."""
        unknown_file = tmp_path / "test.unknown"
        unknown_file.write_text("test content")

        with pytest.raises(UnsupportedFormatError) as exc_info:
            parse(unknown_file)

        assert ".unknown" in str(exc_info.value)


class TestParseRep:
    """Tests for parse_rep convenience function."""

    def test_parse_rep_basic(self, boat2_rep):
        """Parse REP file directly."""
        result = parse_rep(boat2_rep)

        assert len(result.features) >= 1
        assert result.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_parse_rep_string_path(self, boat2_rep):
        """Accept string path."""
        result = parse_rep(str(boat2_rep))
        assert len(result.features) >= 1

    def test_parse_rep_file_not_found(self):
        """Raise FileNotFoundError for missing file."""
        with pytest.raises(FileNotFoundError):
            parse_rep("/nonexistent/file.rep")

    def test_parse_rep_returns_correct_handler(self, boat2_rep):
        """Result includes correct handler name."""
        result = parse_rep(boat2_rep)
        assert result.handler == "Debrief REP Format"


class TestParseIntegration:
    """Integration tests for the full parsing pipeline."""

    def test_parse_boat1_and_boat2(self, boat1_rep, boat2_rep):
        """Parse both boat files successfully."""
        result1 = parse(boat1_rep)
        result2 = parse(boat2_rep)

        assert result1.features[0]["properties"]["platform_id"] == "NELSON"
        assert result2.features[0]["properties"]["platform_id"] == "COLLINGWOOD"

    def test_parsed_features_have_required_fields(self, boat2_rep):
        """All required fields are present in features."""
        result = parse(boat2_rep)

        for feature in result.features:
            assert feature["type"] == "Feature"
            assert "id" in feature
            assert "geometry" in feature
            assert "properties" in feature

            props = feature["properties"]
            assert "platform_id" in props
            assert "start_time" in props
            assert "end_time" in props
            assert "positions" in props

    def test_parse_result_metadata(self, boat2_rep):
        """ParseResult includes all metadata."""
        result = parse(boat2_rep)

        assert result.source_file.endswith("boat2.rep")
        assert result.encoding in ("utf-8", "latin-1")
        assert result.parse_time_ms >= 0
        assert result.handler == "Debrief REP Format"
