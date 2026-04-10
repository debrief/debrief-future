"""Sensor line parser for REP files.

Parses ;SENSOR: (v1), ;SENSOR2: (v2), ;SENSOR3: (v3), and ;SENSORARC
lines from REP files into intermediate records and grouped SensorData dicts.

Sensor contacts are grouped by parent track and sensor name, then returned
as ``pending_sensor_data`` for the import pipeline to merge into companion
TrackFeature objects. SENSORARC lines produce standalone DynamicTrackCoverage
annotation features.
"""

from __future__ import annotations

import logging
import re
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

from debrief_io.symbology import COLOR_MAP, parse_color_code
from debrief_schemas import SensorContact, SensorData

logger = logging.getLogger(__name__)

# Conversion factor: 1 international yard = 0.9144 metres (exact)
YARDS_TO_METRES: float = 0.9144


def _parse_dms_coordinate(degrees: float, minutes: float, seconds: float, hemisphere: str) -> float:
    """Convert DMS to decimal degrees (negative for S/W)."""
    decimal = degrees + minutes / 60 + seconds / 3600
    if hemisphere in ("S", "W"):
        decimal = -decimal
    return decimal


def _parse_timestamp(date_str: str, time_str: str) -> datetime:
    """Parse YYMMDD/YYYYMMDD + HHMMSS[.SSS] into datetime."""
    if len(date_str) == 8:
        year = int(date_str[0:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])
    else:
        year = int(date_str[0:2])
        month = int(date_str[2:4])
        day = int(date_str[4:6])
        if year >= 50:
            year += 1900
        else:
            year += 2000

    t = time_str.split(".")[0]
    frac = time_str.split(".")[1] if "." in time_str else None
    if len(t) == 5:
        t = "0" + t
    time_str = f"{t}.{frac}" if frac else t

    hour = int(time_str[0:2])
    minute = int(time_str[2:4])
    second_part = time_str[4:]

    if "." in second_part:
        sec_str, ms_str = second_part.split(".")
        second = int(sec_str)
        microsecond = int(ms_str.ljust(6, "0")[:6])
    else:
        second = int(second_part)
        microsecond = 0

    return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=UTC)


# Prefixes for sensor lines in REP files (checked in order — longest first)
SENSOR_PREFIXES: tuple[str, ...] = (";SENSOR3:", ";SENSOR2:", ";SENSORARC", ";SENSOR:")

# Normalise tabs/multiple spaces to single space
_WHITESPACE = re.compile(r"[\t ]+")


@dataclass
class ParsedSensorContact:
    """Intermediate record produced during REP sensor line parsing."""

    parent_track: str
    sensor_name: str
    time: datetime
    bearing: float  # 0 if has_bearing is False
    has_bearing: bool
    range_m: float | None  # metres (converted from yards)
    has_frequency: bool
    has_ambiguous: bool
    frequency: float | None = None
    ambiguous_bearing: float | None = None
    origin: list[float] | None = None  # [lon, lat] GeoJSON order
    label: str | None = None
    color_code: str | None = None  # A-Q
    line_number: int = 0


def is_sensor_line(line: str) -> bool:
    """Check if a stripped line starting with ';' is a sensor format line."""
    upper = line.strip().upper()
    return any(upper.startswith(p) for p in SENSOR_PREFIXES)


def _safe_float(val: str) -> float | None:
    """Parse float, returning None for NULL or NAN values."""
    upper = val.upper()
    if upper in ("NULL", "NAN"):
        return None
    try:
        return float(val)
    except ValueError:
        return None


def _is_null_or_nan(val: str) -> bool:
    """Check if a string represents NULL or NAN."""
    return val.upper() in ("NULL", "NAN")


def _parse_bearing(val: str) -> tuple[float, bool]:
    """Parse bearing value, returning (bearing, has_bearing).

    NULL/NAN -> (0, False); valid float -> (normalised value, True).
    Normalises to 0-360 range (schema constraint).
    """
    if _is_null_or_nan(val):
        return 0.0, False
    try:
        bearing = float(val)
        # Normalise to 0-360 range for schema compliance
        bearing = bearing % 360
        return bearing, True
    except ValueError:
        return 0.0, False


def _extract_track_name(tokens: list[str], start: int) -> tuple[str, int]:
    """Extract track name (quoted or unquoted) starting at index.

    Returns (track_name, next_index).
    """
    if start >= len(tokens):
        return "", start
    token = tokens[start]
    if token.startswith('"'):
        # Quoted: accumulate tokens until closing quote
        name_parts = [token.lstrip('"')]
        idx = start + 1
        while idx < len(tokens):
            part = tokens[idx]
            if part.endswith('"'):
                name_parts.append(part.rstrip('"'))
                return " ".join(name_parts), idx + 1
            name_parts.append(part)
            idx += 1
        # No closing quote found — treat everything as the name
        return " ".join(name_parts), idx
    return token, start + 1


def _extract_sensor_name_and_label(tokens: list[str], start: int) -> tuple[str, str | None]:
    """Extract sensor name (quoted or unquoted) and trailing label."""
    if start >= len(tokens):
        return "Unknown", None
    token = tokens[start]
    if token.startswith('"'):
        # Quoted sensor name
        name_parts = [token.lstrip('"')]
        idx = start + 1
        while idx < len(tokens):
            part = tokens[idx]
            if part.endswith('"'):
                name_parts.append(part.rstrip('"'))
                label = " ".join(tokens[idx + 1 :]).strip() or None
                return " ".join(name_parts), label
            name_parts.append(part)
            idx += 1
        return " ".join(name_parts), None
    label = " ".join(tokens[start + 1 :]).strip() or None
    return token, label


def parse_sensor_v1(line: str, line_number: int) -> ParsedSensorContact | None:
    """Parse a ;SENSOR: (v1) line into a ParsedSensorContact.

    Field order (per ImportSensor.java):
      ;SENSOR: DATE TIME TRACK SYMBOL LOCATION BEARING RANGE SENSOR LABEL
    Where LOCATION is either NULL or 8 DMS tokens.
    """
    normalised = _WHITESPACE.sub(" ", line.strip())
    after = normalised[len(";SENSOR:") :].strip()
    tokens = after.split()

    if len(tokens) < 7:
        logger.warning("Line %d: incomplete SENSOR line (%d fields)", line_number, len(tokens))
        return None

    try:
        date_str = tokens[0]
        time_str = tokens[1]
        track_name, idx = _extract_track_name(tokens, 2)

        # Symbol
        if idx >= len(tokens):
            logger.warning("Line %d: SENSOR line missing symbol", line_number)
            return None
        symbol_str = tokens[idx]
        color_code = parse_color_code(symbol_str)
        idx += 1

        # Location: NULL or 8 DMS tokens
        origin: list[float] | None = None
        if idx < len(tokens) and tokens[idx].upper() == "NULL":
            idx += 1  # skip NULL
        else:
            # 8 DMS tokens: deg min sec hem (lat) + deg min sec hem (lon)
            if idx + 8 > len(tokens):
                logger.warning("Line %d: SENSOR line incomplete DMS coordinates", line_number)
                return None
            lat_deg = float(tokens[idx])
            lat_min = float(tokens[idx + 1])
            lat_sec = float(tokens[idx + 2])
            lat_hem = tokens[idx + 3]
            lon_deg = float(tokens[idx + 4])
            lon_min = float(tokens[idx + 5])
            lon_sec = float(tokens[idx + 6])
            lon_hem = tokens[idx + 7]
            lat = _parse_dms_coordinate(lat_deg, lat_min, lat_sec, lat_hem)
            lon = _parse_dms_coordinate(lon_deg, lon_min, lon_sec, lon_hem)
            origin = [lon, lat]
            idx += 8

        # Bearing
        if idx >= len(tokens):
            logger.warning("Line %d: SENSOR line missing bearing", line_number)
            return None
        bearing, has_bearing = _parse_bearing(tokens[idx])
        idx += 1

        # Range (yards)
        range_m: float | None = None
        if idx < len(tokens):
            raw_range = _safe_float(tokens[idx])
            if raw_range is not None:
                range_m = raw_range * YARDS_TO_METRES
            idx += 1

        # Sensor name and label
        sensor_name, label = _extract_sensor_name_and_label(tokens, idx)

        timestamp = _parse_timestamp(date_str, time_str)

        return ParsedSensorContact(
            parent_track=track_name,
            sensor_name=sensor_name,
            time=timestamp,
            bearing=bearing,
            has_bearing=has_bearing,
            range_m=range_m,
            has_frequency=False,
            has_ambiguous=False,
            origin=origin,
            label=label,
            color_code=color_code,
            line_number=line_number,
        )
    except (ValueError, IndexError) as e:
        logger.warning("Line %d: failed to parse SENSOR line: %s", line_number, e)
        return None


def parse_sensor_v2(line: str, line_number: int) -> ParsedSensorContact | None:
    """Parse a ;SENSOR2: (v2) line into a ParsedSensorContact.

    Field order (per ImportSensor2.java):
      ;SENSOR2: DATE TIME TRACK SYMBOL NULL BEARING RANGE AMBIG_BRG FREQ SPEED SENSOR LABEL
    """
    normalised = _WHITESPACE.sub(" ", line.strip())
    after = normalised[len(";SENSOR2:") :].strip()
    tokens = after.split()

    if len(tokens) < 8:
        logger.warning("Line %d: incomplete SENSOR2 line (%d fields)", line_number, len(tokens))
        return None

    try:
        date_str = tokens[0]
        time_str = tokens[1]
        track_name = tokens[2]  # SENSOR2 track names are unquoted
        symbol_str = tokens[3]
        color_code = parse_color_code(symbol_str)
        # tokens[4] = NULL (position placeholder)
        # idx 5 onwards: bearing, range, ambig_brg, freq, speed, sensor, label

        bearing, has_bearing = _parse_bearing(tokens[5])

        raw_range = _safe_float(tokens[6]) if len(tokens) > 6 else None
        range_m = raw_range * YARDS_TO_METRES if raw_range is not None else None

        # Ambiguous bearing
        ambiguous_bearing: float | None = None
        has_ambiguous = False
        if len(tokens) > 7:
            ambiguous_bearing = _safe_float(tokens[7])
            has_ambiguous = ambiguous_bearing is not None

        # Frequency
        frequency: float | None = None
        has_frequency = False
        if len(tokens) > 8:
            frequency = _safe_float(tokens[8])
            has_frequency = frequency is not None

        # tokens[9] = speed (parsed but not stored)
        # Sensor name and label
        sensor_idx = 10
        sensor_name, label = _extract_sensor_name_and_label(tokens, sensor_idx)

        timestamp = _parse_timestamp(date_str, time_str)

        return ParsedSensorContact(
            parent_track=track_name,
            sensor_name=sensor_name,
            time=timestamp,
            bearing=bearing,
            has_bearing=has_bearing,
            range_m=range_m,
            has_frequency=has_frequency,
            has_ambiguous=has_ambiguous,
            frequency=frequency,
            ambiguous_bearing=ambiguous_bearing,
            origin=None,  # SENSOR2 has no explicit position
            label=label,
            color_code=color_code,
            line_number=line_number,
        )
    except (ValueError, IndexError) as e:
        logger.warning("Line %d: failed to parse SENSOR2 line: %s", line_number, e)
        return None


def parse_sensor_v3(line: str, line_number: int) -> ParsedSensorContact | None:
    """Parse a ;SENSOR3: (v3) line into a ParsedSensorContact.

    Field order (per ImportSensor3.java):
      ;SENSOR3: DATE TIME TRACK SYMBOL NULL BEARING RANGE AMBIG_BRG FREQ
                BRG_ACC FREQ_ACC SPEED SENSOR LABEL
    Accuracy fields are parsed but discarded per #116 decision.
    """
    normalised = _WHITESPACE.sub(" ", line.strip())
    after = normalised[len(";SENSOR3:") :].strip()
    tokens = after.split()

    if len(tokens) < 10:
        logger.warning("Line %d: incomplete SENSOR3 line (%d fields)", line_number, len(tokens))
        return None

    try:
        date_str = tokens[0]
        time_str = tokens[1]
        track_name = tokens[2]  # SENSOR3 track names are unquoted
        symbol_str = tokens[3]
        color_code = parse_color_code(symbol_str)
        # tokens[4] = NULL (position placeholder)

        bearing, has_bearing = _parse_bearing(tokens[5])

        raw_range = _safe_float(tokens[6]) if len(tokens) > 6 else None
        range_m = raw_range * YARDS_TO_METRES if raw_range is not None else None

        # Ambiguous bearing
        ambiguous_bearing: float | None = None
        has_ambiguous = False
        if len(tokens) > 7:
            ambiguous_bearing = _safe_float(tokens[7])
            has_ambiguous = ambiguous_bearing is not None

        # Frequency
        frequency: float | None = None
        has_frequency = False
        if len(tokens) > 8:
            frequency = _safe_float(tokens[8])
            has_frequency = frequency is not None

        # tokens[9] = bearing accuracy (parsed, discarded)
        # tokens[10] = frequency accuracy (parsed, discarded)
        # tokens[11] = speed (parsed, not stored)

        # Sensor name and label
        sensor_idx = 12
        sensor_name, label = _extract_sensor_name_and_label(tokens, sensor_idx)

        timestamp = _parse_timestamp(date_str, time_str)

        return ParsedSensorContact(
            parent_track=track_name,
            sensor_name=sensor_name,
            time=timestamp,
            bearing=bearing,
            has_bearing=has_bearing,
            range_m=range_m,
            has_frequency=has_frequency,
            has_ambiguous=has_ambiguous,
            frequency=frequency,
            ambiguous_bearing=ambiguous_bearing,
            origin=None,  # SENSOR3 has no explicit position
            label=label,
            color_code=color_code,
            line_number=line_number,
        )
    except (ValueError, IndexError) as e:
        logger.warning("Line %d: failed to parse SENSOR3 line: %s", line_number, e)
        return None


def parse_sensorarc(line: str, line_number: int) -> dict[str, Any] | None:
    """Parse a ;SENSORARC line into a DynamicTrackCoverage GeoJSON feature dict.

    Field order (per ImportSensorArc.java):
      ;SENSORARC START_DATE START_TIME END_DATE END_TIME TRACK
                 LEFT_BRG RIGHT_BRG INNER_RANGE OUTER_RANGE
    Range values are already in metres (no conversion needed).
    """
    normalised = _WHITESPACE.sub(" ", line.strip())
    after = normalised[len(";SENSORARC") :].lstrip(":").strip()
    tokens = after.split()

    if len(tokens) < 9:
        logger.warning("Line %d: incomplete SENSORARC line (%d fields)", line_number, len(tokens))
        return None

    try:
        start_date = tokens[0]
        start_time_str = tokens[1]
        end_date = tokens[2]
        end_time_str = tokens[3]
        track_name = tokens[4]

        left_bearing = float(tokens[5])
        right_bearing = float(tokens[6])
        inner_range = float(tokens[7])
        outer_range = float(tokens[8])

        start_dt = _parse_timestamp(start_date, start_time_str)
        end_dt = _parse_timestamp(end_date, end_time_str)

        return {
            "type": "Feature",
            "id": str(uuid.uuid4()),
            "geometry": None,
            "properties": {
                "kind": "DYNAMIC_TRACK_COVERAGE",
                "track_id": track_name,
                "start_time": start_dt.isoformat(),
                "end_time": end_dt.isoformat(),
                "left_bearing": left_bearing,
                "right_bearing": right_bearing,
                "inner_range": inner_range,
                "outer_range": outer_range,
                "line_number": line_number,
            },
        }
    except (ValueError, IndexError) as e:
        logger.warning("Line %d: failed to parse SENSORARC line: %s", line_number, e)
        return None


def group_sensor_contacts(
    records: list[ParsedSensorContact],
) -> dict[str, list[SensorData]]:
    """Group parsed sensor contacts into SensorData models keyed by parent track.

    Returns: {parent_track_name: [SensorData, ...]}
    Contacts within each SensorData are sorted by time.
    """
    # Group by (parent_track, sensor_name) preserving insertion order
    grouped: dict[str, dict[str, list[ParsedSensorContact]]] = {}
    # Track first color_code per (track, sensor)
    first_color: dict[tuple[str, str], str | None] = {}

    for rec in records:
        track_sensors = grouped.setdefault(rec.parent_track, {})
        recs = track_sensors.setdefault(rec.sensor_name, [])
        recs.append(rec)
        key = (rec.parent_track, rec.sensor_name)
        if key not in first_color:
            first_color[key] = rec.color_code

    result: dict[str, list[SensorData]] = {}
    for track_name, sensors in grouped.items():
        sensor_list: list[SensorData] = []
        for sensor_name, contact_records in sensors.items():
            # Sort contacts by time
            contact_records.sort(key=lambda r: r.time)

            # Build typed SensorContact models
            contacts: list[SensorContact] = []
            for rec in contact_records:
                contact = SensorContact(
                    time=rec.time,
                    bearing=rec.bearing,
                    has_bearing=False if not rec.has_bearing else None,
                    range=rec.range_m,
                    ambiguous_bearing=rec.ambiguous_bearing,
                    has_ambiguous=False if not rec.has_ambiguous else None,
                    frequency=rec.frequency,
                    has_frequency=False if not rec.has_frequency else None,
                    origin=rec.origin,
                    label=rec.label if rec.label else None,
                )
                contacts.append(contact)

            # Resolve color from first contact's symbology code
            cc = first_color.get((track_name, sensor_name))
            color = COLOR_MAP.get(cc, None) if cc else None

            sensor_data = SensorData(
                name=sensor_name,
                contacts=contacts,
                color=color,
            )
            sensor_list.append(sensor_data)
        result[track_name] = sensor_list

    return result
