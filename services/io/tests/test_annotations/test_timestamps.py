"""Tests for timestamp parsing."""

from datetime import UTC

import pytest

from debrief_io.handlers.annotations.timestamps import (
    parse_time_range,
    parse_timestamp,
    validate_timestamp,
)


class TestParseTimestamp:
    """Test timestamp parsing."""

    def test_parse_basic_format(self) -> None:
        """Parse YYMMDD HHMMSS format."""
        result = parse_timestamp("951212 050200")
        assert result is not None
        assert result.date_str == "951212"
        assert result.time_str == "050200"
        assert result.datetime.year == 1995
        assert result.datetime.month == 12
        assert result.datetime.day == 12
        assert result.datetime.hour == 5
        assert result.datetime.minute == 2
        assert result.datetime.second == 0

    def test_parse_with_milliseconds(self) -> None:
        """Parse YYMMDD HHMMSS.SSS format."""
        result = parse_timestamp("951212 050200.123")
        assert result is not None
        assert result.datetime.microsecond == 123000

    def test_year_conversion_90s(self) -> None:
        """Years 50-99 map to 1950-1999."""
        result = parse_timestamp("951212 050200")
        assert result is not None
        assert result.datetime.year == 1995

        result = parse_timestamp("500101 000000")
        assert result is not None
        assert result.datetime.year == 1950

        result = parse_timestamp("991231 235959")
        assert result is not None
        assert result.datetime.year == 1999

    def test_year_conversion_2000s(self) -> None:
        """Years 00-49 map to 2000-2049."""
        result = parse_timestamp("000101 000000")
        assert result is not None
        assert result.datetime.year == 2000

        result = parse_timestamp("261212 050200")
        assert result is not None
        assert result.datetime.year == 2026

        result = parse_timestamp("491231 235959")
        assert result is not None
        assert result.datetime.year == 2049

    def test_iso_string_format(self) -> None:
        """ISO string is properly formatted."""
        result = parse_timestamp("951212 050200")
        assert result is not None
        assert result.iso_string == "1995-12-12T05:02:00+00:00"

    def test_utc_timezone(self) -> None:
        """Timestamps are in UTC."""
        result = parse_timestamp("951212 050200")
        assert result is not None
        assert result.datetime.tzinfo == UTC

    def test_from_text_with_context(self) -> None:
        """Parse timestamp from text with surrounding content."""
        result = parse_timestamp("prefix 951212 050200 suffix")
        assert result is not None
        assert result.datetime.year == 1995

    def test_invalid_returns_none(self) -> None:
        """Invalid format returns None."""
        assert parse_timestamp("invalid") is None
        assert parse_timestamp("") is None
        assert parse_timestamp("12345 123456") is None  # 5-digit date


class TestParseTimeRange:
    """Test time range parsing."""

    def test_parse_range(self) -> None:
        """Parse two timestamps as range."""
        result = parse_time_range("951212 050200 951212 060200")
        assert result is not None
        start, end = result
        assert start.datetime.hour == 5
        assert end.datetime.hour == 6

    def test_single_timestamp_returns_none(self) -> None:
        """Single timestamp returns None for range."""
        assert parse_time_range("951212 050200") is None


class TestValidateTimestamp:
    """Test timestamp validation."""

    def test_valid_timestamp(self) -> None:
        """Valid timestamps pass."""
        validate_timestamp("951212", "050200")
        validate_timestamp("000101", "235959")

    def test_invalid_date_format_raises(self) -> None:
        """Invalid date format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid date format"):
            validate_timestamp("12345", "050200")  # 5 digits

    def test_invalid_time_format_raises(self) -> None:
        """Invalid time format raises ValueError."""
        with pytest.raises(ValueError, match="Invalid time format"):
            validate_timestamp("951212", "12345")  # 5 digits

    def test_invalid_month_raises(self) -> None:
        """Invalid month raises ValueError."""
        with pytest.raises(ValueError, match="Invalid month 13"):
            validate_timestamp("951312", "050200")

    def test_invalid_day_raises(self) -> None:
        """Invalid day raises ValueError."""
        with pytest.raises(ValueError, match="Invalid day 32"):
            validate_timestamp("951232", "050200")

    def test_invalid_hour_raises(self) -> None:
        """Invalid hour raises ValueError."""
        with pytest.raises(ValueError, match="Invalid hour 25"):
            validate_timestamp("951212", "250200")

    def test_invalid_minute_raises(self) -> None:
        """Invalid minute raises ValueError."""
        with pytest.raises(ValueError, match="Invalid minute 65"):
            validate_timestamp("951212", "056500")

    def test_error_includes_line_number(self) -> None:
        """Error message includes line number when provided."""
        with pytest.raises(ValueError, match="at line 42"):
            validate_timestamp("951312", "050200", line_number=42)
