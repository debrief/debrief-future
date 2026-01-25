"""
Annotation builders for converting parsed annotation data to GeoJSON features.

Each builder function takes a line of text and produces a GeoJSON Feature dictionary.
Uses fail-fast error handling - invalid data raises AnnotationParseError immediately.
"""

import math
from typing import Any

from debrief_io.exceptions import AnnotationParseError, ErrorCode

from .coordinates import (
    parse_lat_lon,
    parse_multiple_lat_lon,
    validate_latitude,
    validate_longitude,
)
from .parser import generate_feature_id
from .symbols import get_dash_array, parse_symbol
from .timestamps import parse_timestamp


def _extract_content_after_prefix(line: str) -> str:
    """Extract content after the annotation type prefix."""
    # Find the colon and get everything after it
    if ":" in line:
        return line.split(":", 1)[1].strip()
    # For TRACKSPLIT which has no colon
    parts = line.split(None, 1)
    return parts[1].strip() if len(parts) > 1 else ""


def _build_point_style(
    symbol,
    default_shape: str = "circle",
    default_radius: float = 5.0,
) -> dict[str, Any]:
    """Build PointProperties style from parsed symbol."""
    style = {
        "shape": default_shape,
        "radius": default_radius,
        "fill": True,
        "fill_color": symbol.css_color,
        "fill_opacity": 0.8 if symbol.fill_style == "semi-transparent" else 1.0,
        "stroke": True,
        "color": symbol.css_color,
        "weight": symbol.thickness if symbol.thickness else 1,
        "opacity": 1.0,
    }
    if symbol.symbol_name:
        style["legacy_style"] = symbol.symbol_name
    return style


def _build_line_style(symbol) -> dict[str, Any]:
    """Build LineProperties style from parsed symbol."""
    style = {
        "stroke": True,
        "color": symbol.css_color,
        "weight": symbol.thickness if symbol.thickness else 1,
        "opacity": 1.0,
    }
    dash_array = get_dash_array(symbol.line_style)
    if dash_array:
        style["dash_array"] = dash_array
    return style


def _build_polygon_style(symbol) -> dict[str, Any]:
    """Build PolygonProperties style from parsed symbol."""
    fill_opacity = 0.3  # Default semi-transparent
    if symbol.fill_style == "solid":
        fill_opacity = 0.8
    elif symbol.fill_style is None:
        fill_opacity = 0.0  # No fill

    style = {
        "fill": fill_opacity > 0,
        "fill_color": symbol.css_color,
        "fill_opacity": fill_opacity,
        "stroke": True,
        "color": symbol.css_color,
        "weight": symbol.thickness if symbol.thickness else 1,
        "opacity": 1.0,
    }
    dash_array = get_dash_array(symbol.line_style)
    if dash_array:
        style["dash_array"] = dash_array
    return style


def _approximate_circle(
    center_lon: float,
    center_lat: float,
    radius_m: float,
    num_points: int = 32,
) -> list[list[float]]:
    """
    Approximate a circle as a polygon.

    Args:
        center_lon: Center longitude
        center_lat: Center latitude
        radius_m: Radius in meters
        num_points: Number of points to use

    Returns:
        GeoJSON polygon coordinates (ring as list of [lon, lat] pairs)
    """
    # Approximate meters to degrees (rough conversion at equator)
    # More accurate: should use proper geodesic calculation
    meters_per_degree_lat = 111320
    meters_per_degree_lon = 111320 * math.cos(math.radians(center_lat))

    radius_lat = radius_m / meters_per_degree_lat
    radius_lon = radius_m / meters_per_degree_lon if meters_per_degree_lon > 0 else radius_lat

    coordinates = []
    for i in range(num_points + 1):  # +1 to close the ring
        angle = 2 * math.pi * i / num_points
        lon = center_lon + radius_lon * math.cos(angle)
        lat = center_lat + radius_lat * math.sin(angle)
        coordinates.append([lon, lat])

    return coordinates


# =============================================================================
# P1 Builders - NARRATIVE, CIRCLE, RECT, LINE
# =============================================================================


def build_narrative(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build NarrativeEntry feature from NARRATIVE or NARRATIVE2 line.

    Format: ;NARRATIVE: YYMMDD HHMMSS TRACK_NAME TEXT
    """
    content = _extract_content_after_prefix(line)

    # Parse timestamp
    ts = parse_timestamp(content)
    if ts is None:
        raise AnnotationParseError(
            "Missing or invalid timestamp",
            line_number=line_number,
            code=ErrorCode.INVALID_TIMESTAMP,
            filename=filename,
            annotation_type="NARRATIVE",
        )

    # Extract remaining content after timestamp
    # Format: YYMMDD HHMMSS TRACK_NAME TEXT
    parts = content.split()
    if len(parts) < 3:
        raise AnnotationParseError(
            "Incomplete NARRATIVE entry - expected timestamp, track name, and text",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="NARRATIVE",
        )

    track_name = parts[2]
    text = " ".join(parts[3:]) if len(parts) > 3 else ""

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {"type": "Point", "coordinates": []},  # Empty point - no spatial location
        "properties": {
            "kind": "NARRATIVE",
            "time": ts.iso_string,
            "text": text,
            "track_id": track_name,
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_circle(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build CircleAnnotation feature from CIRCLE line.

    Format: ;CIRCLE: @D LAT_DMS LON_DMS RADIUS_M LABEL
    Example: ;CIRCLE: @D 21.8 0 0 N 21.0 0 0 W 2000 test circle
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 9:  # symbol + 4 lat parts + 4 lon parts + radius minimum
        raise AnnotationParseError(
            "Incomplete CIRCLE - expected symbol, coordinates, radius, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="CIRCLE",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse coordinates (skip symbol)
    coord_text = " ".join(parts[1:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in CIRCLE",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="CIRCLE",
        )

    center_lon, center_lat = coords
    validate_latitude(center_lat, line_number)
    validate_longitude(center_lon, line_number)

    # Find radius (first number after coordinates)
    # Coordinates use 8 parts: 4 for lat + 4 for lon
    radius_index = 9  # symbol + 8 coord parts
    if radius_index >= len(parts):
        raise AnnotationParseError(
            "Missing radius in CIRCLE",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="CIRCLE",
        )

    try:
        radius = float(parts[radius_index])
    except ValueError as err:
        raise AnnotationParseError(
            f"Invalid radius value '{parts[radius_index]}'",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="CIRCLE",
        ) from err

    if radius < 0:
        raise AnnotationParseError(
            f"Negative radius {radius} not allowed",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="CIRCLE",
        )

    # Label is everything after radius
    label = " ".join(parts[radius_index + 1 :]) if len(parts) > radius_index + 1 else None

    # Approximate circle as polygon
    ring = _approximate_circle(center_lon, center_lat, radius)

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "CIRCLE",
            "center": [center_lon, center_lat],
            "radius": radius,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_rectangle(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build RectangleAnnotation feature from RECT line.

    Format: ;RECT: @A CORNER1_LAT CORNER1_LON CORNER2_LAT CORNER2_LON LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 17:  # symbol + 8 coords for corner1 + 8 coords for corner2
        raise AnnotationParseError(
            "Incomplete RECT - expected symbol, two corners, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="RECT",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse coordinates for both corners
    coord_text = " ".join(parts[1:])
    all_coords = parse_multiple_lat_lon(coord_text)
    if len(all_coords) < 2:
        raise AnnotationParseError(
            "Invalid coordinates in RECT - need two corners",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="RECT",
        )

    corner1 = all_coords[0]  # (lon, lat)
    corner2 = all_coords[1]  # (lon, lat)

    # Validate coordinates
    validate_latitude(corner1[1], line_number)
    validate_longitude(corner1[0], line_number)
    validate_latitude(corner2[1], line_number)
    validate_longitude(corner2[0], line_number)

    # Build rectangle polygon (closed ring)
    lon1, lat1 = corner1
    lon2, lat2 = corner2
    ring = [
        [lon1, lat1],
        [lon2, lat1],
        [lon2, lat2],
        [lon1, lat2],
        [lon1, lat1],  # Close the ring
    ]

    # Label is after coordinates (17th position onward)
    label = " ".join(parts[17:]) if len(parts) > 17 else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "RECTANGLE",
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_line(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build LineAnnotation feature from LINE line.

    Format: ;LINE: @B START_LAT START_LON END_LAT END_LON LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 17:  # symbol + 8 coords for start + 8 coords for end
        raise AnnotationParseError(
            "Incomplete LINE - expected symbol, start point, end point, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="LINE",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse coordinates for both points
    coord_text = " ".join(parts[1:])
    all_coords = parse_multiple_lat_lon(coord_text)
    if len(all_coords) < 2:
        raise AnnotationParseError(
            "Invalid coordinates in LINE - need start and end points",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="LINE",
        )

    start = all_coords[0]
    end = all_coords[1]

    # Validate coordinates
    validate_latitude(start[1], line_number)
    validate_longitude(start[0], line_number)
    validate_latitude(end[1], line_number)
    validate_longitude(end[0], line_number)

    # Label is after coordinates
    label = " ".join(parts[17:]) if len(parts) > 17 else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "LineString",
            "coordinates": [list(start), list(end)],
        },
        "properties": {
            "kind": "LINE",
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_line_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_vector(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build VectorAnnotation feature from VECTOR line.

    Format: ;VECTOR: @C ORIGIN_LAT ORIGIN_LON RANGE_M BEARING_DEG LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 11:  # symbol + 8 coord parts + range + bearing
        raise AnnotationParseError(
            "Incomplete VECTOR - expected symbol, origin, range, bearing, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="VECTOR",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse origin coordinates
    coord_text = " ".join(parts[1:9])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid origin coordinates in VECTOR",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="VECTOR",
        )

    origin_lon, origin_lat = coords
    validate_latitude(origin_lat, line_number)
    validate_longitude(origin_lon, line_number)

    # Parse range and bearing
    try:
        range_m = float(parts[9])
    except (IndexError, ValueError) as err:
        raise AnnotationParseError(
            "Invalid or missing range in VECTOR",
            line_number=line_number,
            code=ErrorCode.INVALID_RANGE,
            filename=filename,
            annotation_type="VECTOR",
        ) from err

    try:
        bearing = float(parts[10])
    except (IndexError, ValueError) as err:
        raise AnnotationParseError(
            "Invalid or missing bearing in VECTOR",
            line_number=line_number,
            code=ErrorCode.INVALID_BEARING,
            filename=filename,
            annotation_type="VECTOR",
        ) from err

    if bearing < 0 or bearing > 360:
        raise AnnotationParseError(
            f"Bearing {bearing} out of range (0-360)",
            line_number=line_number,
            code=ErrorCode.INVALID_BEARING,
            filename=filename,
            annotation_type="VECTOR",
        )

    # Compute endpoint from origin, range, and bearing
    # Approximate: convert range to degrees
    meters_per_degree = 111320
    range_deg = range_m / meters_per_degree

    # Convert bearing to radians (bearing is from north, clockwise)
    bearing_rad = math.radians(bearing)

    # Calculate endpoint
    end_lat = origin_lat + range_deg * math.cos(bearing_rad)
    end_lon = origin_lon + range_deg * math.sin(bearing_rad) / math.cos(math.radians(origin_lat))

    # Label is after range and bearing
    label = " ".join(parts[11:]) if len(parts) > 11 else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "LineString",
            "coordinates": [[origin_lon, origin_lat], [end_lon, end_lat]],
        },
        "properties": {
            "kind": "VECTOR",
            "origin": [origin_lon, origin_lat],
            "range": range_m,
            "bearing": bearing,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_line_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_text(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build TextAnnotation feature from TEXT line.

    Format: ;TEXT: @E LAT_DMS LON_DMS TEXT
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 9:  # symbol + 8 coord parts
        raise AnnotationParseError(
            "Incomplete TEXT - expected symbol, coordinates, and text",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="TEXT",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse coordinates
    coord_text = " ".join(parts[1:9])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in TEXT",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="TEXT",
        )

    lon, lat = coords
    validate_latitude(lat, line_number)
    validate_longitude(lon, line_number)

    # Text is everything after coordinates
    text = " ".join(parts[9:]) if len(parts) > 9 else ""

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat],
        },
        "properties": {
            "kind": "TEXT",
            "text": text,
            "symbol": symbol.color_code,
            "style": _build_point_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


# =============================================================================
# P2 Builders - POLY, POLYLINE, ELLIPSE, TIMETEXT, PERIODTEXT, WHEEL
# =============================================================================


def build_polygon(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build PolygonAnnotation feature from POLY line."""
    # TODO: Implement in P2
    return None


def build_polyline(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build PolylineAnnotation feature from POLYLINE line."""
    # TODO: Implement in P2
    return None


def build_ellipse(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build EllipseAnnotation feature from ELLIPSE or ELLIPSE2 line."""
    # TODO: Implement in P2
    return None


def build_timetext(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build TimeTextAnnotation feature from TIMETEXT line."""
    # TODO: Implement in P2
    return None


def build_periodtext(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build PeriodTextAnnotation feature from PERIODTEXT line."""
    # TODO: Implement in P2
    return None


def build_wheel(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build WheelAnnotation feature from WHEEL line."""
    # TODO: Implement in P2
    return None


# =============================================================================
# P3 Builders - DYNAMIC_*, SENSOR, TMA
# =============================================================================


def build_dynamic_rect(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build DynamicRectAnnotation feature from DYNAMIC_RECT line."""
    # TODO: Implement in P3
    return None


def build_dynamic_circle(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build DynamicCircleAnnotation feature from DYNAMIC_CIRCLE line."""
    # TODO: Implement in P3
    return None


def build_dynamic_poly(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build DynamicPolyAnnotation feature from DYNAMIC_POLY line."""
    # TODO: Implement in P3
    return None


def build_sensor(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build SensorAnnotation feature from SENSOR or SENSOR2 line."""
    # TODO: Implement in P3
    return None


def build_tma(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build TMAAnnotation feature from TMA_POS or TMA_RB line."""
    # TODO: Implement in P3
    return None


def build_tracksplit(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """Build TracksplitAnnotation feature from TRACKSPLIT line."""
    # TODO: Implement in P3
    return None
