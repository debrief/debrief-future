"""
Timestamp parsing for REP file annotations.

Handles timestamp parsing in formats:
- YYMMDD HHMMSS (basic)
- YYMMDD HHMMSS.SSS (with milliseconds)
"""

import re
from dataclasses import dataclass
from datetime import UTC, datetime

# Pattern for timestamps: YYMMDD HHMMSS or YYMMDD HHMMSS.SSS
TIMESTAMP_PATTERN = re.compile(r"(\d{6})\s+(\d{6}(?:\.\d+)?)")


@dataclass(frozen=True)
class ParsedTimestamp:
    """Parsed timestamp with datetime conversion."""

    date_str: str  # YYMMDD
    time_str: str  # HHMMSS or HHMMSS.SSS
    datetime: datetime  # Parsed datetime in UTC
    iso_string: str  # ISO 8601 format string


def _convert_year(yy: int) -> int:
    """
    Convert 2-digit year to 4-digit year.

    - 50-99 -> 1950-1999
    - 00-49 -> 2000-2049

    Args:
        yy: Two-digit year

    Returns:
        Four-digit year
    """
    if yy >= 50:
        return 1900 + yy
    return 2000 + yy


def parse_timestamp(text: str) -> ParsedTimestamp | None:
    """
    Parse a timestamp from text.

    Args:
        text: String containing timestamp (e.g., "951212 050200" or "951212 050200.123")

    Returns:
        ParsedTimestamp or None if no match
    """
    match = TIMESTAMP_PATTERN.search(text)
    if not match:
        return None

    date_str = match.group(1)
    time_str = match.group(2)

    # Parse date components: YYMMDD
    yy = int(date_str[0:2])
    mm = int(date_str[2:4])
    dd = int(date_str[4:6])

    year = _convert_year(yy)

    # Parse time components: HHMMSS or HHMMSS.SSS
    hh = int(time_str[0:2])
    mi = int(time_str[2:4])

    # Handle seconds with optional milliseconds
    if "." in time_str:
        sec_parts = time_str[4:].split(".")
        ss = int(sec_parts[0])
        # Convert milliseconds to microseconds
        ms_str = sec_parts[1] if len(sec_parts) > 1 else "0"
        # Pad or truncate to 6 digits for microseconds
        ms_str = (ms_str + "000000")[:6]
        us = int(ms_str)
    else:
        ss = int(time_str[4:6])
        us = 0

    dt = datetime(year, mm, dd, hh, mi, ss, us, tzinfo=UTC)

    return ParsedTimestamp(
        date_str=date_str,
        time_str=time_str,
        datetime=dt,
        iso_string=dt.isoformat(),
    )


def parse_time_range(text: str) -> tuple[ParsedTimestamp, ParsedTimestamp] | None:
    """
    Parse a time range (start and end timestamps) from text.

    Used for ELLIPSE2 and PERIODTEXT annotations.

    Args:
        text: String containing two timestamps

    Returns:
        Tuple of (start, end) ParsedTimestamp, or None if parsing fails
    """
    matches = list(TIMESTAMP_PATTERN.finditer(text))
    if len(matches) < 2:
        return None

    start_match = matches[0]
    end_match = matches[1]

    start = _parse_match(start_match)
    end = _parse_match(end_match)

    if start is None or end is None:
        return None

    return (start, end)


def _parse_match(match: re.Match) -> ParsedTimestamp | None:
    """Parse a regex match into a ParsedTimestamp."""
    date_str = match.group(1)
    time_str = match.group(2)

    # Parse date components: YYMMDD
    yy = int(date_str[0:2])
    mm = int(date_str[2:4])
    dd = int(date_str[4:6])

    year = _convert_year(yy)

    # Parse time components: HHMMSS or HHMMSS.SSS
    hh = int(time_str[0:2])
    mi = int(time_str[2:4])

    # Handle seconds with optional milliseconds
    if "." in time_str:
        sec_parts = time_str[4:].split(".")
        ss = int(sec_parts[0])
        ms_str = sec_parts[1] if len(sec_parts) > 1 else "0"
        ms_str = (ms_str + "000000")[:6]
        us = int(ms_str)
    else:
        ss = int(time_str[4:6])
        us = 0

    try:
        dt = datetime(year, mm, dd, hh, mi, ss, us, tzinfo=UTC)
    except ValueError:
        return None

    return ParsedTimestamp(
        date_str=date_str,
        time_str=time_str,
        datetime=dt,
        iso_string=dt.isoformat(),
    )


def validate_timestamp(date_str: str, time_str: str, line_number: int | None = None) -> None:
    """
    Validate timestamp components.

    Args:
        date_str: Date string in YYMMDD format
        time_str: Time string in HHMMSS or HHMMSS.SSS format
        line_number: Optional line number for error messages

    Raises:
        ValueError: If timestamp is invalid
    """
    loc = f" at line {line_number}" if line_number else ""

    # Validate date format
    if not re.match(r"^\d{6}$", date_str):
        raise ValueError(f"Invalid date format '{date_str}'{loc}. Expected YYMMDD.")

    # Validate time format
    if not re.match(r"^\d{6}(?:\.\d+)?$", time_str):
        raise ValueError(f"Invalid time format '{time_str}'{loc}. Expected HHMMSS or HHMMSS.SSS.")

    # Parse and validate date components
    mm = int(date_str[2:4])
    dd = int(date_str[4:6])

    if mm < 1 or mm > 12:
        raise ValueError(f"Invalid month {mm}{loc}. Must be between 1 and 12.")

    if dd < 1 or dd > 31:
        raise ValueError(f"Invalid day {dd}{loc}. Must be between 1 and 31.")

    # Parse and validate time components
    hh = int(time_str[0:2])
    mi = int(time_str[2:4])
    ss = int(time_str[4:6])

    if hh > 23:
        raise ValueError(f"Invalid hour {hh}{loc}. Must be between 0 and 23.")

    if mi > 59:
        raise ValueError(f"Invalid minute {mi}{loc}. Must be between 0 and 59.")

    if ss > 59:
        raise ValueError(f"Invalid second {ss}{loc}. Must be between 0 and 59.")
