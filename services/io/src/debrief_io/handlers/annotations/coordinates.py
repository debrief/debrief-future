"""
DMS (Degrees Minutes Seconds) coordinate parsing for REP annotations.

Handles coordinate parsing in the format: DD MM SS.S H
where H is N/S for latitude, E/W for longitude.
"""

import re
from dataclasses import dataclass

# Pattern for DMS coordinates: DD MM SS.S H
# Note: Degrees can be fractional in some REP files (e.g., 21.8 0 0 N)
DMS_PATTERN = re.compile(r"([\d.]+)\s+(\d+)\s+([\d.]+)\s+([NSEW])")


@dataclass(frozen=True)
class ParsedCoordinate:
    """Parsed DMS coordinate with decimal conversion."""

    degrees: int
    minutes: int
    seconds: float
    hemisphere: str
    decimal: float

    @property
    def is_latitude(self) -> bool:
        """Check if this is a latitude coordinate."""
        return self.hemisphere in ("N", "S")

    @property
    def is_longitude(self) -> bool:
        """Check if this is a longitude coordinate."""
        return self.hemisphere in ("E", "W")


def dms_to_decimal(degrees: float, minutes: int, seconds: float, hemisphere: str) -> float:
    """
    Convert DMS coordinates to decimal degrees.

    Args:
        degrees: Degrees component (can be fractional in some REP files)
        minutes: Minutes component (0-59)
        seconds: Seconds component (0-59.999...)
        hemisphere: N, S, E, or W

    Returns:
        Decimal degrees (negative for S/W)
    """
    decimal = degrees + minutes / 60 + seconds / 3600
    if hemisphere in ("S", "W"):
        decimal = -decimal
    return decimal


def parse_dms(text: str) -> ParsedCoordinate | None:
    """
    Parse a single DMS coordinate from text.

    Args:
        text: String containing DMS coordinate (e.g., "21 30 45.5 N" or "21.8 0 0 N")

    Returns:
        ParsedCoordinate or None if no match
    """
    match = DMS_PATTERN.search(text)
    if not match:
        return None

    degrees = float(match.group(1))
    minutes = int(match.group(2))
    seconds = float(match.group(3))
    hemisphere = match.group(4)

    decimal = dms_to_decimal(degrees, minutes, seconds, hemisphere)

    return ParsedCoordinate(
        degrees=int(degrees),  # Store as int for compatibility
        minutes=minutes,
        seconds=seconds + (degrees % 1) * 3600 / 60
        if degrees % 1
        else seconds,  # Absorb fractional degrees
        hemisphere=hemisphere,
        decimal=decimal,
    )


def parse_lat_lon(text: str) -> tuple[float, float] | None:
    """
    Parse a latitude/longitude pair from text.

    Expects format: LAT_DMS LON_DMS (e.g., "21 30 0 N 45 15 0 W" or "21.8 0 0 N 21.0 0 0 W")

    Args:
        text: String containing both coordinates

    Returns:
        Tuple of (longitude, latitude) in decimal degrees (GeoJSON order),
        or None if parsing fails
    """
    matches = list(DMS_PATTERN.finditer(text))
    if len(matches) < 2:
        return None

    lat_match = matches[0]
    lon_match = matches[1]

    lat_deg = float(lat_match.group(1))
    lat_min = int(lat_match.group(2))
    lat_sec = float(lat_match.group(3))
    lat_hem = lat_match.group(4)

    lon_deg = float(lon_match.group(1))
    lon_min = int(lon_match.group(2))
    lon_sec = float(lon_match.group(3))
    lon_hem = lon_match.group(4)

    lat = dms_to_decimal(lat_deg, lat_min, lat_sec, lat_hem)
    lon = dms_to_decimal(lon_deg, lon_min, lon_sec, lon_hem)

    # GeoJSON uses [longitude, latitude] order
    return (lon, lat)


def parse_multiple_lat_lon(text: str) -> list[tuple[float, float]]:
    """
    Parse multiple latitude/longitude pairs from text.

    Used for POLY and POLYLINE annotations with variable vertex counts.

    Args:
        text: String containing multiple coordinate pairs

    Returns:
        List of (longitude, latitude) tuples in decimal degrees (GeoJSON order)
    """
    matches = list(DMS_PATTERN.finditer(text))
    coordinates = []

    # Process pairs of coordinates (lat, lon)
    for i in range(0, len(matches) - 1, 2):
        lat_match = matches[i]
        lon_match = matches[i + 1]

        lat_deg = float(lat_match.group(1))
        lat_min = int(lat_match.group(2))
        lat_sec = float(lat_match.group(3))
        lat_hem = lat_match.group(4)

        lon_deg = float(lon_match.group(1))
        lon_min = int(lon_match.group(2))
        lon_sec = float(lon_match.group(3))
        lon_hem = lon_match.group(4)

        lat = dms_to_decimal(lat_deg, lat_min, lat_sec, lat_hem)
        lon = dms_to_decimal(lon_deg, lon_min, lon_sec, lon_hem)

        # GeoJSON uses [longitude, latitude] order
        coordinates.append((lon, lat))

    return coordinates


def validate_latitude(lat: float, line_number: int | None = None) -> None:
    """
    Validate latitude is in valid range.

    Args:
        lat: Latitude in decimal degrees
        line_number: Optional line number for error messages

    Raises:
        ValueError: If latitude is out of range [-90, 90]
    """
    if lat < -90 or lat > 90:
        loc = f" at line {line_number}" if line_number else ""
        raise ValueError(f"Invalid latitude {lat}{loc}. Must be between -90 and 90.")


def validate_longitude(lon: float, line_number: int | None = None) -> None:
    """
    Validate longitude is in valid range.

    Args:
        lon: Longitude in decimal degrees
        line_number: Optional line number for error messages

    Raises:
        ValueError: If longitude is out of range [-180, 180]
    """
    if lon < -180 or lon > 180:
        loc = f" at line {line_number}" if line_number else ""
        raise ValueError(f"Invalid longitude {lon}{loc}. Must be between -180 and 180.")
