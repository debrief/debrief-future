"""DSF (Debrief Sensor File) format handler.

Parses Debrief's DSF file format into GeoJSON features.
DSF files contain ;SENSOR: and ;SENSOR2: sensor contact lines.

Real-world DSF files use both tab and space separators, quoted and
unquoted track names, and various NULL field patterns. This handler
parses them directly rather than delegating to the annotation parser.
"""

from __future__ import annotations

import re
import time
from datetime import UTC, datetime
from typing import Any

from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult, ParseWarning

# Normalise tabs/multiple spaces to single spaces
_WHITESPACE = re.compile(r"[\t ]+")


def _parse_timestamp(date_str: str, time_str: str) -> datetime | None:
    """Parse YYMMDD/YYYYMMDD + HHMMSS[.SSS] into datetime."""
    try:
        if len(date_str) == 8:
            year = int(date_str[0:4])
            month = int(date_str[4:6])
            day = int(date_str[6:8])
        elif len(date_str) == 6:
            yy = int(date_str[0:2])
            month = int(date_str[2:4])
            day = int(date_str[4:6])
            year = 1900 + yy if yy >= 50 else 2000 + yy
        else:
            return None

        hour = int(time_str[0:2])
        minute = int(time_str[2:4])
        sec_part = time_str[4:]

        if "." in sec_part:
            sec_str, frac = sec_part.split(".", 1)
            second = int(sec_str)
            microsecond = int(frac.ljust(6, "0")[:6])
        else:
            second = int(sec_part)
            microsecond = 0

        return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=UTC)
    except (ValueError, IndexError):
        return None


def _extract_track_name(token: str) -> str:
    """Extract track name, removing surrounding quotes if present."""
    if token.startswith('"') and token.endswith('"'):
        return token[1:-1]
    return token


def _safe_float(val: str) -> float | None:
    """Parse float, returning None for NULL or unparseable values."""
    if val.upper() == "NULL":
        return None
    try:
        return float(val)
    except ValueError:
        return None


class _SensorContactRecord:
    """Intermediate record for a parsed sensor contact."""

    __slots__ = ("parent_track", "sensor_name", "time", "bearing", "range", "frequency", "label")

    def __init__(
        self,
        parent_track: str,
        sensor_name: str,
        time: str,
        bearing: float | None,
        range: float | None = None,
        frequency: float | None = None,
        label: str | None = None,
    ) -> None:
        self.parent_track = parent_track
        self.sensor_name = sensor_name
        self.time = time
        self.bearing = bearing
        self.range = range
        self.frequency = frequency
        self.label = label

    def to_contact_dict(self) -> dict[str, Any]:
        """Convert to SensorContact schema dict."""
        entry: dict[str, Any] = {"time": self.time}
        if self.bearing is not None:
            entry["bearing"] = self.bearing
        if self.range is not None:
            entry["range"] = self.range
        if self.frequency is not None:
            entry["frequency"] = self.frequency
        if self.label:
            entry["label"] = self.label
        return entry


def _parse_sensor2_line(
    parts: list[str], line_num: int
) -> tuple[_SensorContactRecord | None, ParseWarning | None]:
    """Parse a ;SENSOR2: line into a sensor contact record.

    Format: ;SENSOR2: DATE TIME TRACK SYMBOL NULL BEARING RANGE FREQ SPEED SENSOR LABEL...
    Fields after SYMBOL may be NULL.
    """
    if len(parts) < 8:
        return None, ParseWarning(
            message=f"Incomplete SENSOR2 line ({len(parts)} fields)",
            line_number=line_num,
            code="PARSE_ERROR",
        )

    date_str = parts[0]
    time_str = parts[1]
    track_name = _extract_track_name(parts[2])
    # parts[3] = symbol, parts[4] = NULL (position placeholder)
    bearing = _safe_float(parts[5])
    range_val = _safe_float(parts[6]) if len(parts) > 6 else None
    frequency = _safe_float(parts[7]) if len(parts) > 7 else None
    # parts[8] = speed (not in SensorContact schema, ignored)
    sensor_name = parts[9] if len(parts) > 9 else None
    if sensor_name:
        sensor_name = _extract_track_name(sensor_name)
    label = " ".join(parts[10:]) if len(parts) > 10 else None
    if label:
        label = label.strip('"')

    timestamp = _parse_timestamp(date_str, time_str)
    if timestamp is None:
        return None, ParseWarning(
            message=f"Invalid timestamp {date_str} {time_str}",
            line_number=line_num,
            code="INVALID_TIMESTAMP",
        )

    return _SensorContactRecord(
        parent_track=track_name,
        sensor_name=sensor_name or "Unknown",
        time=timestamp.isoformat(),
        bearing=bearing,
        range=range_val,
        frequency=frequency,
        label=label,
    ), None


def _parse_sensor_line(
    parts: list[str], line_num: int
) -> tuple[_SensorContactRecord | None, ParseWarning | None]:
    """Parse a ;SENSOR: line into a sensor contact record.

    Format: ;SENSOR: DATE TIME TRACK SYMBOL LAT_OR_NULL BEARING RANGE SENSOR LABEL...
    Location can be DMS coordinates or NULL.
    """
    if len(parts) < 7:
        return None, ParseWarning(
            message=f"Incomplete SENSOR line ({len(parts)} fields)",
            line_number=line_num,
            code="PARSE_ERROR",
        )

    date_str = parts[0]
    time_str = parts[1]
    track_name = _extract_track_name(parts[2])
    # parts[3] = symbol

    timestamp = _parse_timestamp(date_str, time_str)
    if timestamp is None:
        return None, ParseWarning(
            message=f"Invalid timestamp {date_str} {time_str}",
            line_number=line_num,
            code="INVALID_TIMESTAMP",
        )

    # After symbol, we have either NULL or 8 coordinate tokens, then bearing, range, sensor, label
    remaining = parts[4:]

    if not remaining:
        return None, ParseWarning(
            message="Incomplete SENSOR line after symbol",
            line_number=line_num,
            code="PARSE_ERROR",
        )

    # Check if position is NULL
    bearing: float | None = None
    range_val: float | None = None
    sensor_name: str | None = None
    label: str | None = None

    if remaining[0].upper() == "NULL":
        # NULL position: remaining = [NULL, BEARING, RANGE, SENSOR, LABEL...]
        bearing = _safe_float(remaining[1]) if len(remaining) > 1 else None
        range_val = _safe_float(remaining[2]) if len(remaining) > 2 else None
        sensor_name = remaining[3] if len(remaining) > 3 else None
        label = " ".join(remaining[4:]) if len(remaining) > 4 else None
    else:
        # DMS coordinates: 8 tokens (deg min sec hem for lat and lon)
        # then BEARING, RANGE, SENSOR, LABEL
        if len(remaining) >= 10:
            bearing = _safe_float(remaining[8]) if len(remaining) > 8 else None
            range_val = _safe_float(remaining[9]) if len(remaining) > 9 else None
            sensor_name = remaining[10] if len(remaining) > 10 else None
            label = " ".join(remaining[11:]) if len(remaining) > 11 else None
        else:
            # Try to extract bearing from whatever we have
            bearing = _safe_float(remaining[-2]) if len(remaining) >= 2 else None
            range_val = _safe_float(remaining[-1]) if len(remaining) >= 1 else None

    if sensor_name:
        sensor_name = _extract_track_name(sensor_name)
    if label:
        label = label.strip('"')

    return _SensorContactRecord(
        parent_track=track_name,
        sensor_name=sensor_name or "Unknown",
        time=timestamp.isoformat(),
        bearing=bearing,
        range=range_val,
        label=label,
    ), None


def _group_contacts(
    records: list[_SensorContactRecord],
) -> dict[str, list[dict[str, Any]]]:
    """Group sensor contact records into SensorData dicts keyed by parent track.

    Returns: {parent_track_name: [SensorData, ...]}
    where SensorData = {name: str, contacts: [SensorContact, ...]}
    """
    # Group by (parent_track, sensor_name)
    grouped: dict[str, dict[str, list[dict[str, Any]]]] = {}
    for rec in records:
        track_sensors = grouped.setdefault(rec.parent_track, {})
        contacts = track_sensors.setdefault(rec.sensor_name, [])
        contacts.append(rec.to_contact_dict())

    # Convert to {parent_track: [SensorData, ...]}
    result: dict[str, list[dict[str, Any]]] = {}
    for track_name, sensors in grouped.items():
        sensor_list = [{"name": sname, "contacts": contacts} for sname, contacts in sensors.items()]
        result[track_name] = sensor_list

    return result


class DSFHandler(BaseHandler):
    """Handler for Debrief DSF (Sensor File) format.

    DSF files contain ;SENSOR: and ;SENSOR2: lines with sensor
    contact data. Handles both tab and space delimiters, quoted
    and unquoted track names, and NULL position fields.
    """

    @property
    def name(self) -> str:
        return "Debrief DSF Format"

    @property
    def description(self) -> str:
        return "Handler for Debrief Sensor File format"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def extensions(self) -> list[str]:
        return [".dsf", ".DSF"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse DSF sensor contact lines into grouped SensorData.

        DSF files contain sensor contacts for tracks defined in companion
        files (typically REP). Instead of producing standalone SENSOR_CONTACT
        features, contacts are grouped by parent track and sensor name into
        SensorData structures via ``pending_sensor_data``. The import pipeline
        merges these into the companion track features.
        """
        start = time.perf_counter()
        warnings: list[ParseWarning] = []
        records: list[_SensorContactRecord] = []

        for line_num, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith(";;"):
                continue

            # Normalise whitespace
            normalised = _WHITESPACE.sub(" ", stripped)

            if normalised.startswith(";SENSOR2:"):
                after = normalised[len(";SENSOR2:") :].strip()
                parts = after.split()
                record, warning = _parse_sensor2_line(parts, line_num)
            elif normalised.startswith(";SENSOR:"):
                after = normalised[len(";SENSOR:") :].strip()
                parts = after.split()
                record, warning = _parse_sensor_line(parts, line_num)
            else:
                warnings.append(
                    ParseWarning(
                        message=f"Non-sensor line: {stripped[:50]}",
                        line_number=line_num,
                        code="UNKNOWN_RECORD",
                    )
                )
                continue

            if warning:
                warnings.append(warning)
            if record:
                records.append(record)

        # Group contacts into SensorData dicts keyed by parent track
        pending = _group_contacts(records)

        elapsed_ms = (time.perf_counter() - start) * 1000

        return ParseResult(
            features=[],
            warnings=warnings,
            source_file=source_file,
            parse_time_ms=elapsed_ms,
            handler=self.name,
            handler_version=self.version,
            pending_sensor_data=pending,
        )
