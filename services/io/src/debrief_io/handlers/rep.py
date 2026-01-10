"""REP (Replay) format handler.

Parses Debrief's legacy REP file format into GeoJSON features.
The REP format is a line-based text format for storing track data.

Format specification:
    YYMMDD HHMMSS.SSS TRACKNAME SYMBOL DD MM SS.SS H DDD MM SS.SS H CCC.C SSS.S DEPTH [LABEL]

Where:
    - YYMMDD: Date (2-digit year, month, day)
    - HHMMSS.SSS: Time with milliseconds
    - TRACKNAME: Platform/vessel identifier
    - SYMBOL: Display symbol code (e.g., @A, @C)
    - DD MM SS.SS H: Latitude in DMS (N/S hemisphere)
    - DDD MM SS.SS H: Longitude in DMS (E/W hemisphere)
    - CCC.C: Course in degrees (0-360)
    - SSS.S: Speed in knots
    - DEPTH: Depth in meters (0 for surface)
    - LABEL: Optional label text
"""

from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from debrief_io.handlers.base import BaseHandler
from debrief_io.models import ParseResult, ParseWarning


def parse_dms_coordinate(degrees: float, minutes: float, seconds: float, hemisphere: str) -> float:
    """Convert DMS (degrees, minutes, seconds) to decimal degrees.

    Args:
        degrees: Degrees component
        minutes: Minutes component
        seconds: Seconds component
        hemisphere: Hemisphere indicator (N, S, E, W)

    Returns:
        Decimal degrees (negative for S and W)
    """
    decimal = degrees + minutes / 60 + seconds / 3600
    if hemisphere in ("S", "W"):
        decimal = -decimal
    return decimal


def parse_timestamp(date_str: str, time_str: str) -> datetime:
    """Parse REP timestamp into datetime.

    Args:
        date_str: Date in YYMMDD format
        time_str: Time in HHMMSS.SSS format

    Returns:
        datetime object in UTC timezone
    """
    # Parse date
    year = int(date_str[0:2])
    month = int(date_str[2:4])
    day = int(date_str[4:6])

    # Convert 2-digit year (50+ = 1900s, <50 = 2000s)
    if year >= 50:
        year += 1900
    else:
        year += 2000

    # Parse time
    hour = int(time_str[0:2])
    minute = int(time_str[2:4])
    second_part = time_str[4:]

    if "." in second_part:
        sec_str, ms_str = second_part.split(".")
        second = int(sec_str)
        # Convert milliseconds to microseconds
        microsecond = int(ms_str.ljust(6, "0")[:6])
    else:
        second = int(second_part)
        microsecond = 0

    return datetime(year, month, day, hour, minute, second, microsecond, tzinfo=UTC)


@dataclass
class ParsedPosition:
    """Intermediate representation of a parsed position."""

    timestamp: datetime
    lat: float
    lon: float
    course: float
    speed: float
    depth: float
    symbol: str
    platform_id: str = ""
    label: str | None = None
    line_number: int = 0


@dataclass
class TrackBuilder:
    """Builder for accumulating track positions."""

    platform_id: str
    positions: list[ParsedPosition] = field(default_factory=list)

    def add_position(self, pos: ParsedPosition) -> None:
        """Add a position to the track."""
        self.positions.append(pos)

    def build_feature(self, source_file: str) -> dict[str, Any]:
        """Build a GeoJSON Feature from accumulated positions.

        Returns:
            GeoJSON Feature dict with LineString geometry
        """
        # Need at least 2 points for a LineString
        # For single point, duplicate it
        if len(self.positions) == 1:
            self.positions.append(self.positions[0])

        # Sort positions by timestamp
        self.positions.sort(key=lambda p: p.timestamp)

        # Build coordinates array [lon, lat, elevation?, time?]
        coordinates = [[p.lon, p.lat] for p in self.positions]

        # Build positions array with full metadata
        positions_data = [
            {
                "time": p.timestamp.isoformat(),
                "lat": p.lat,
                "lon": p.lon,
                "course": p.course,
                "speed": p.speed,
                "depth": p.depth,
            }
            for p in self.positions
        ]

        return {
            "type": "Feature",
            "id": str(uuid.uuid4()),
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates,
            },
            "properties": {
                "platform_id": self.platform_id,
                "platform_name": self.platform_id,
                "track_type": "CONTACT",  # Default, can be overridden
                "start_time": self.positions[0].timestamp.isoformat(),
                "end_time": self.positions[-1].timestamp.isoformat(),
                "positions": positions_data,
                "source_file": source_file,
            },
        }


class REPHandler(BaseHandler):
    """Handler for Debrief REP (Replay) format files.

    Parses REP format track data into GeoJSON TrackFeature objects.
    Supports track positions and collects warnings for unknown record types.
    """

    # Pattern for track position records
    # Format: YYMMDD HHMMSS.SSS TRACKNAME SYMBOL LAT(DMS) LON(DMS) COURSE SPEED DEPTH [LABEL]
    POSITION_PATTERN = re.compile(
        r"^\s*"
        r"(\d{6})\s+"  # Date YYMMDD
        r"(\d{6}(?:\.\d+)?)\s+"  # Time HHMMSS.SSS
        r"(\S+)\s+"  # Track name
        r"(@\w+)\s+"  # Symbol
        r"(\d+)\s+(\d+)\s+([\d.]+)\s+([NS])\s+"  # Lat DMS
        r"(\d+)\s+(\d+)\s+([\d.]+)\s+([EW])\s+"  # Lon DMS
        r"([\d.]+)\s+"  # Course
        r"([\d.]+)\s+"  # Speed
        r"(\d+)"  # Depth
        r"(?:\s+(.+))?"  # Optional label
        r"\s*$"
    )

    @property
    def name(self) -> str:
        return "Debrief REP Format"

    @property
    def description(self) -> str:
        return "Legacy Debrief replay file format for track data"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def extensions(self) -> list[str]:
        return [".rep", ".REP"]

    def parse(self, content: str, source_file: str) -> ParseResult:
        """Parse REP file content into GeoJSON features.

        Args:
            content: File content as string
            source_file: Path to source file (for provenance)

        Returns:
            ParseResult with TrackFeature objects and any warnings
        """
        start_time = time.perf_counter()
        warnings: list[ParseWarning] = []
        tracks: dict[str, TrackBuilder] = {}

        lines = content.splitlines()

        for line_num, line in enumerate(lines, start=1):
            # Skip empty lines
            if not line.strip():
                continue

            # Skip comment lines
            if line.strip().startswith(";"):
                # TODO: Handle special comments like ;NARRATIVE:, ;CIRCLE:, etc.
                continue

            # Try to parse as position record
            match = self.POSITION_PATTERN.match(line)
            if match:
                try:
                    position = self._parse_position(match, line_num)
                    if position:
                        # Validate coordinates
                        if not self._validate_coordinates(position, warnings, line_num):
                            continue

                        # Add to track
                        if position.platform_id not in tracks:
                            tracks[position.platform_id] = TrackBuilder(position.platform_id)
                        tracks[position.platform_id].add_position(position)
                except Exception as e:
                    warnings.append(
                        ParseWarning(
                            message=f"Failed to parse position: {e}",
                            line_number=line_num,
                            code="PARSE_ERROR",
                        )
                    )
                continue

            # Unknown record type
            warnings.append(
                ParseWarning(
                    message=f"Unknown record type: {line[:50]}...",
                    line_number=line_num,
                    code="UNKNOWN_RECORD",
                )
            )

        # Build features from tracks
        features = [track.build_feature(source_file) for track in tracks.values()]

        elapsed_ms = (time.perf_counter() - start_time) * 1000

        return ParseResult(
            features=features,
            warnings=warnings,
            source_file=source_file,
            encoding="utf-8",  # Will be set by caller if different
            parse_time_ms=elapsed_ms,
            handler=self.name,
        )

    def _parse_position(self, match: re.Match[str], line_number: int) -> ParsedPosition | None:
        """Parse a position record match into ParsedPosition.

        Args:
            match: Regex match object
            line_number: Line number for error context

        Returns:
            ParsedPosition or None if parsing fails
        """
        groups = match.groups()

        date_str = groups[0]
        time_str = groups[1]
        track_name = groups[2]
        symbol = groups[3]

        # Parse latitude DMS
        lat_deg = float(groups[4])
        lat_min = float(groups[5])
        lat_sec = float(groups[6])
        lat_hem = groups[7]

        # Parse longitude DMS
        lon_deg = float(groups[8])
        lon_min = float(groups[9])
        lon_sec = float(groups[10])
        lon_hem = groups[11]

        course = float(groups[12])
        speed = float(groups[13])
        depth = float(groups[14])
        label = groups[15].strip() if groups[15] else None

        # Convert DMS to decimal
        lat = parse_dms_coordinate(lat_deg, lat_min, lat_sec, lat_hem)
        lon = parse_dms_coordinate(lon_deg, lon_min, lon_sec, lon_hem)

        # Parse timestamp
        timestamp = parse_timestamp(date_str, time_str)

        return ParsedPosition(
            timestamp=timestamp,
            lat=lat,
            lon=lon,
            course=course,
            speed=speed,
            depth=depth,
            symbol=symbol,
            label=label,
            line_number=line_number,
            platform_id=track_name,
        )

    def _validate_coordinates(
        self, position: ParsedPosition, warnings: list[ParseWarning], line_number: int
    ) -> bool:
        """Validate coordinate ranges.

        Args:
            position: Position to validate
            warnings: List to append warnings to
            line_number: Line number for error context

        Returns:
            True if coordinates are valid
        """
        valid = True

        if not -90 <= position.lat <= 90:
            warnings.append(
                ParseWarning(
                    message=f"Invalid latitude: {position.lat}",
                    line_number=line_number,
                    field="latitude",
                    code="INVALID_COORD",
                )
            )
            valid = False

        if not -180 <= position.lon <= 180:
            warnings.append(
                ParseWarning(
                    message=f"Invalid longitude: {position.lon}",
                    line_number=line_number,
                    field="longitude",
                    code="INVALID_COORD",
                )
            )
            valid = False

        return valid
