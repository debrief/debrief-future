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


def _approximate_ellipse(
    center_lon: float,
    center_lat: float,
    semi_major_m: float,
    semi_minor_m: float,
    orientation_deg: float,
    num_points: int = 32,
) -> list[list[float]]:
    """
    Approximate an ellipse as a polygon with rotation.

    Args:
        center_lon: Center longitude
        center_lat: Center latitude
        semi_major_m: Semi-major axis in meters
        semi_minor_m: Semi-minor axis in meters
        orientation_deg: Orientation in degrees (0=North, clockwise)
        num_points: Number of points to use

    Returns:
        GeoJSON polygon coordinates (ring as list of [lon, lat] pairs)
    """
    # Convert meters to degrees at center latitude
    meters_per_degree_lat = 111320
    meters_per_degree_lon = 111320 * math.cos(math.radians(center_lat))

    # Convert orientation to radians (0=North, clockwise -> math convention)
    # Math convention: 0=East, counter-clockwise
    # So: orientation_deg 0 (North) = 90 degrees in math, and we flip direction
    orientation_rad = math.radians(90 - orientation_deg)

    coordinates = []
    for i in range(num_points + 1):  # +1 to close the ring
        angle = 2 * math.pi * i / num_points

        # Generate ellipse point (not rotated)
        x = semi_major_m * math.cos(angle)
        y = semi_minor_m * math.sin(angle)

        # Apply rotation
        x_rot = x * math.cos(orientation_rad) - y * math.sin(orientation_rad)
        y_rot = x * math.sin(orientation_rad) + y * math.cos(orientation_rad)

        # Convert to degrees
        lon_offset = x_rot / meters_per_degree_lon if meters_per_degree_lon > 0 else 0
        lat_offset = y_rot / meters_per_degree_lat

        lon = center_lon + lon_offset
        lat = center_lat + lat_offset
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


def build_polygon(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build PolygonAnnotation feature from POLY line.

    Format: ;POLY: @A LAT1 LON1 LAT2 LON2 ... LATN LONN LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 25:  # symbol + at least 3 coords (3 * 8 = 24)
        raise AnnotationParseError(
            "Incomplete POLY - expected symbol, at least 3 coordinate pairs, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="POLY",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse all coordinates
    coord_text = " ".join(parts[1:])
    all_coords = parse_multiple_lat_lon(coord_text)

    if len(all_coords) < 3:
        raise AnnotationParseError(
            "POLY requires at least 3 coordinate pairs",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="POLY",
        )

    # Validate all coordinates
    for lon, lat in all_coords:
        validate_latitude(lat, line_number)
        validate_longitude(lon, line_number)

    # Build ring (auto-close if needed)
    ring = [[lon, lat] for lon, lat in all_coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    # Label is after coordinates (each coord is 8 parts: deg min sec N/S deg min sec E/W)
    coord_parts_count = 1 + len(all_coords) * 8  # symbol + coords
    label_parts = parts[coord_parts_count:] if len(parts) > coord_parts_count else []
    label = " ".join(label_parts).replace("\\n", "\n") if label_parts else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "POLY",
            "vertex_count": len(all_coords),
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_polyline(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build PolylineAnnotation feature from POLYLINE line.

    Format: ;POLYLINE: @A LAT1 LON1 LAT2 LON2 ... LATN LONN LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 17:  # symbol + at least 2 coords (2 * 8 = 16)
        raise AnnotationParseError(
            "Incomplete POLYLINE - expected symbol, at least 2 coordinate pairs, and optional label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="POLYLINE",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse all coordinates
    coord_text = " ".join(parts[1:])
    all_coords = parse_multiple_lat_lon(coord_text)

    if len(all_coords) < 2:
        raise AnnotationParseError(
            "POLYLINE requires at least 2 coordinate pairs",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="POLYLINE",
        )

    # Validate all coordinates
    for lon, lat in all_coords:
        validate_latitude(lat, line_number)
        validate_longitude(lon, line_number)

    # Build line (open, not closed)
    line_coords = [[lon, lat] for lon, lat in all_coords]

    # Label is after coordinates
    coord_parts_count = 1 + len(all_coords) * 8
    label_parts = parts[coord_parts_count:] if len(parts) > coord_parts_count else []
    label = " ".join(label_parts).replace("\\n", "\n") if label_parts else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "LineString",
            "coordinates": line_coords,
        },
        "properties": {
            "kind": "POLYLINE",
            "vertex_count": len(all_coords),
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_line_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_ellipse(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build EllipseAnnotation feature from ELLIPSE or ELLIPSE2 line.

    Format ELLIPSE: ;ELLIPSE: @A YYMMDD HHMMSS LAT LON ORIENTATION SEMI_MAJOR SEMI_MINOR LABEL
    Format ELLIPSE2: ;ELLIPSE2: @A YYMMDD HHMMSS YYMMDD HHMMSS LAT LON ORIENTATION SEMI_MAJOR SEMI_MINOR LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    # Detect ELLIPSE vs ELLIPSE2 based on line content
    is_ellipse2 = line.upper().startswith(";ELLIPSE2:")

    if is_ellipse2:
        # ELLIPSE2: symbol + date1 + time1 + date2 + time2 + 8 coord parts + orientation + semi_major + semi_minor
        min_parts = 1 + 2 + 2 + 8 + 3  # 16
        if len(parts) < min_parts:
            raise AnnotationParseError(
                "Incomplete ELLIPSE2 - expected symbol, time range, coords, orientation, axes, and label",
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type="ELLIPSE2",
            )

        symbol_str = parts[0]
        symbol = parse_symbol(symbol_str, line_number)

        # Parse time range
        time_start_str = f"{parts[1]} {parts[2]}"
        time_end_str = f"{parts[3]} {parts[4]}"
        time_start = parse_timestamp(time_start_str)
        time_end = parse_timestamp(time_end_str)

        # Parse coordinates (starts at index 5)
        coord_text = " ".join(parts[5:])
        coords = parse_lat_lon(coord_text)
        if coords is None:
            raise AnnotationParseError(
                "Invalid coordinates in ELLIPSE2",
                line_number=line_number,
                code=ErrorCode.INVALID_COORD,
                filename=filename,
                annotation_type="ELLIPSE2",
            )

        center_lon, center_lat = coords
        validate_latitude(center_lat, line_number)
        validate_longitude(center_lon, line_number)

        # Parse orientation and axes (after 5 + 8 = 13 parts)
        ellipse_params_start = 13
        orientation = float(parts[ellipse_params_start])
        semi_major = float(parts[ellipse_params_start + 1])
        semi_minor = float(parts[ellipse_params_start + 2])

        # Label is after ellipse params
        label_start = ellipse_params_start + 3
        label = " ".join(parts[label_start:]) if len(parts) > label_start else None

        # Generate ellipse polygon
        ring = _approximate_ellipse(center_lon, center_lat, semi_major, semi_minor, orientation)

        return {
            "type": "Feature",
            "id": generate_feature_id(),
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
            "properties": {
                "kind": "ELLIPSE2",
                "center": [center_lon, center_lat],
                "semi_major": semi_major,
                "semi_minor": semi_minor,
                "orientation": orientation,
                "time_start": time_start.iso_string if time_start else None,
                "time_end": time_end.iso_string if time_end else None,
                "label": label,
                "symbol": symbol.color_code,
                "style": _build_polygon_style(symbol),
                "source_file": filename,
                "line_number": line_number,
            },
        }
    else:
        # ELLIPSE: symbol + date + time + 8 coord parts + orientation + semi_major + semi_minor
        min_parts = 1 + 2 + 8 + 3  # 14
        if len(parts) < min_parts:
            raise AnnotationParseError(
                "Incomplete ELLIPSE - expected symbol, timestamp, coords, orientation, axes, and label",
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type="ELLIPSE",
            )

        symbol_str = parts[0]
        symbol = parse_symbol(symbol_str, line_number)

        # Parse timestamp
        time_str = f"{parts[1]} {parts[2]}"
        timestamp = parse_timestamp(time_str)

        # Parse coordinates (starts at index 3)
        coord_text = " ".join(parts[3:])
        coords = parse_lat_lon(coord_text)
        if coords is None:
            raise AnnotationParseError(
                "Invalid coordinates in ELLIPSE",
                line_number=line_number,
                code=ErrorCode.INVALID_COORD,
                filename=filename,
                annotation_type="ELLIPSE",
            )

        center_lon, center_lat = coords
        validate_latitude(center_lat, line_number)
        validate_longitude(center_lon, line_number)

        # Parse orientation and axes (after 3 + 8 = 11 parts)
        ellipse_params_start = 11
        orientation = float(parts[ellipse_params_start])
        semi_major = float(parts[ellipse_params_start + 1])
        semi_minor = float(parts[ellipse_params_start + 2])

        # Label is after ellipse params
        label_start = ellipse_params_start + 3
        label = " ".join(parts[label_start:]) if len(parts) > label_start else None

        # Generate ellipse polygon
        ring = _approximate_ellipse(center_lon, center_lat, semi_major, semi_minor, orientation)

        return {
            "type": "Feature",
            "id": generate_feature_id(),
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
            "properties": {
                "kind": "ELLIPSE",
                "center": [center_lon, center_lat],
                "semi_major": semi_major,
                "semi_minor": semi_minor,
                "orientation": orientation,
                "timestamp": timestamp.iso_string if timestamp else None,
                "label": label,
                "symbol": symbol.color_code,
                "style": _build_polygon_style(symbol),
                "source_file": filename,
                "line_number": line_number,
            },
        }


def build_timetext(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build TimeTextAnnotation feature from TIMETEXT line.

    Format: ;TIMETEXT: @A YYMMDD HHMMSS LAT LON TEXT
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    # symbol + date + time + 8 coord parts = 11 minimum
    if len(parts) < 11:
        raise AnnotationParseError(
            "Incomplete TIMETEXT - expected symbol, timestamp, coords, and text",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="TIMETEXT",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse timestamp
    time_str = f"{parts[1]} {parts[2]}"
    timestamp = parse_timestamp(time_str)

    # Parse coordinates (starts at index 3)
    coord_text = " ".join(parts[3:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in TIMETEXT",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="TIMETEXT",
        )

    lon, lat = coords
    validate_latitude(lat, line_number)
    validate_longitude(lon, line_number)

    # Text is after coordinates (3 + 8 = 11)
    text = " ".join(parts[11:]) if len(parts) > 11 else ""

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat],
        },
        "properties": {
            "kind": "TIMETEXT",
            "text": text,
            "timestamp": timestamp.iso_string if timestamp else None,
            "symbol": symbol.color_code,
            "style": _build_point_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_periodtext(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build PeriodTextAnnotation feature from PERIODTEXT line.

    Format: ;PERIODTEXT: @A YYMMDD HHMMSS YYMMDD HHMMSS LAT LON TEXT
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    # symbol + date1 + time1 + date2 + time2 + 8 coord parts = 13 minimum
    if len(parts) < 13:
        raise AnnotationParseError(
            "Incomplete PERIODTEXT - expected symbol, time range, coords, and text",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="PERIODTEXT",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse time range
    time_start_str = f"{parts[1]} {parts[2]}"
    time_end_str = f"{parts[3]} {parts[4]}"
    time_start = parse_timestamp(time_start_str)
    time_end = parse_timestamp(time_end_str)

    # Parse coordinates (starts at index 5)
    coord_text = " ".join(parts[5:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in PERIODTEXT",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="PERIODTEXT",
        )

    lon, lat = coords
    validate_latitude(lat, line_number)
    validate_longitude(lon, line_number)

    # Text is after coordinates (5 + 8 = 13)
    text_parts = parts[13:] if len(parts) > 13 else []
    text = " ".join(text_parts).replace("\\n", "\n") if text_parts else ""

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Point",
            "coordinates": [lon, lat],
        },
        "properties": {
            "kind": "PERIODTEXT",
            "text": text,
            "time_start": time_start.iso_string if time_start else None,
            "time_end": time_end.iso_string if time_end else None,
            "symbol": symbol.color_code,
            "style": _build_point_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_wheel(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build WheelAnnotation feature from WHEEL line (annular/donut shape).

    Format: ;WHEEL: @A YYMMDD HHMMSS LAT LON INNER_RADIUS OUTER_RADIUS LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    # symbol + date + time + 8 coord parts + inner_radius + outer_radius = 13 minimum
    if len(parts) < 13:
        raise AnnotationParseError(
            "Incomplete WHEEL - expected symbol, timestamp, coords, inner radius, outer radius, and label",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="WHEEL",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse timestamp
    time_str = f"{parts[1]} {parts[2]}"
    timestamp = parse_timestamp(time_str)

    # Parse coordinates (starts at index 3)
    coord_text = " ".join(parts[3:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in WHEEL",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="WHEEL",
        )

    center_lon, center_lat = coords
    validate_latitude(center_lat, line_number)
    validate_longitude(center_lon, line_number)

    # Parse radii (after 3 + 8 = 11)
    try:
        inner_radius = float(parts[11])
        outer_radius = float(parts[12])
    except (ValueError, IndexError) as err:
        raise AnnotationParseError(
            "Invalid radius values in WHEEL",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="WHEEL",
        ) from err

    if inner_radius < 0 or outer_radius < 0:
        raise AnnotationParseError(
            "Negative radius not allowed in WHEEL",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="WHEEL",
        )

    if inner_radius >= outer_radius:
        raise AnnotationParseError(
            f"Inner radius ({inner_radius}) must be less than outer radius ({outer_radius})",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="WHEEL",
        )

    # Label is after radii
    label = " ".join(parts[13:]) if len(parts) > 13 else None

    # Generate outer ring (counter-clockwise) and inner ring (clockwise for hole)
    outer_ring = _approximate_circle(center_lon, center_lat, outer_radius)
    inner_ring = _approximate_circle(center_lon, center_lat, inner_radius)
    # Reverse inner ring for GeoJSON hole winding order
    inner_ring = inner_ring[::-1]

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [outer_ring, inner_ring],
        },
        "properties": {
            "kind": "WHEEL",
            "center": [center_lon, center_lat],
            "inner_radius": inner_radius,
            "outer_radius": outer_radius,
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


# =============================================================================
# P3 Builders - DYNAMIC_*, SENSOR, TMA
# =============================================================================


def build_dynamic_rect(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build DynamicRectAnnotation feature from DYNAMIC_RECT line.

    Format: ;DYNAMIC_RECT: @A "GROUP_NAME" YYMMDD HHMMSS.SSS LAT1 LON1 LAT2 LON2 LABEL
    """
    content = _extract_content_after_prefix(line)

    # Extract quoted group name
    if '"' not in content:
        raise AnnotationParseError(
            "DYNAMIC_RECT requires quoted group name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_RECT",
        )

    # Split on quotes to get group name
    before_quote = content.split('"')[0].strip()
    group_name = content.split('"')[1]
    after_quote = '"'.join(content.split('"')[2:]).strip()

    symbol_str = before_quote
    symbol = parse_symbol(symbol_str, line_number)

    parts = after_quote.split()
    if len(parts) < 18:  # date + time + 8 coords + 8 coords = 18
        raise AnnotationParseError(
            "Incomplete DYNAMIC_RECT - expected timestamp and two corner coordinates",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_RECT",
        )

    # Parse timestamp (with milliseconds)
    time_str = f"{parts[0]} {parts[1]}"
    timestamp = parse_timestamp(time_str)

    # Parse coordinates for both corners
    coord_text = " ".join(parts[2:])
    all_coords = parse_multiple_lat_lon(coord_text)
    if len(all_coords) < 2:
        raise AnnotationParseError(
            "Invalid coordinates in DYNAMIC_RECT",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="DYNAMIC_RECT",
        )

    corner1 = all_coords[0]
    corner2 = all_coords[1]

    # Validate coordinates
    validate_latitude(corner1[1], line_number)
    validate_longitude(corner1[0], line_number)
    validate_latitude(corner2[1], line_number)
    validate_longitude(corner2[0], line_number)

    # Build rectangle polygon
    lon1, lat1 = corner1
    lon2, lat2 = corner2
    ring = [
        [lon1, lat1],
        [lon2, lat1],
        [lon2, lat2],
        [lon1, lat2],
        [lon1, lat1],
    ]

    # Label is after coordinates
    label = " ".join(parts[18:]) if len(parts) > 18 else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "DYNAMIC_RECT",
            "group_name": group_name,
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_dynamic_circle(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build DynamicCircleAnnotation feature from DYNAMIC_CIRCLE line.

    Format: ;DYNAMIC_CIRCLE: @A "GROUP_NAME" YYMMDD HHMMSS.SSS LAT LON RADIUS LABEL
    """
    content = _extract_content_after_prefix(line)

    # Extract quoted group name
    if '"' not in content:
        raise AnnotationParseError(
            "DYNAMIC_CIRCLE requires quoted group name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_CIRCLE",
        )

    before_quote = content.split('"')[0].strip()
    group_name = content.split('"')[1]
    after_quote = '"'.join(content.split('"')[2:]).strip()

    symbol_str = before_quote
    symbol = parse_symbol(symbol_str, line_number)

    parts = after_quote.split()
    if len(parts) < 11:  # date + time + 8 coords + radius = 11
        raise AnnotationParseError(
            "Incomplete DYNAMIC_CIRCLE - expected timestamp, coords, and radius",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_CIRCLE",
        )

    # Parse timestamp
    time_str = f"{parts[0]} {parts[1]}"
    timestamp = parse_timestamp(time_str)

    # Parse coordinates
    coord_text = " ".join(parts[2:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in DYNAMIC_CIRCLE",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="DYNAMIC_CIRCLE",
        )

    center_lon, center_lat = coords
    validate_latitude(center_lat, line_number)
    validate_longitude(center_lon, line_number)

    # Parse radius (after 2 + 8 = 10)
    try:
        radius = float(parts[10])
    except (ValueError, IndexError) as err:
        raise AnnotationParseError(
            "Invalid radius in DYNAMIC_CIRCLE",
            line_number=line_number,
            code=ErrorCode.INVALID_RADIUS,
            filename=filename,
            annotation_type="DYNAMIC_CIRCLE",
        ) from err

    # Label is after radius
    label = " ".join(parts[11:]) if len(parts) > 11 else None

    # Generate circle polygon
    ring = _approximate_circle(center_lon, center_lat, radius)

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "DYNAMIC_CIRCLE",
            "group_name": group_name,
            "center": [center_lon, center_lat],
            "radius": radius,
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_dynamic_poly(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build DynamicPolyAnnotation feature from DYNAMIC_POLY line.

    Format: ;DYNAMIC_POLY: @A "GROUP_NAME" YYMMDD HHMMSS.SSS LAT1 LON1 LAT2 LON2 ... LABEL
    """
    content = _extract_content_after_prefix(line)

    # Extract quoted group name
    if '"' not in content:
        raise AnnotationParseError(
            "DYNAMIC_POLY requires quoted group name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_POLY",
        )

    before_quote = content.split('"')[0].strip()
    group_name = content.split('"')[1]
    after_quote = '"'.join(content.split('"')[2:]).strip()

    symbol_str = before_quote
    symbol = parse_symbol(symbol_str, line_number)

    parts = after_quote.split()
    if len(parts) < 26:  # date + time + at least 3 coords (3 * 8 = 24) = 26
        raise AnnotationParseError(
            "Incomplete DYNAMIC_POLY - expected timestamp and at least 3 coordinate pairs",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="DYNAMIC_POLY",
        )

    # Parse timestamp
    time_str = f"{parts[0]} {parts[1]}"
    timestamp = parse_timestamp(time_str)

    # Parse all coordinates
    coord_text = " ".join(parts[2:])
    all_coords = parse_multiple_lat_lon(coord_text)

    if len(all_coords) < 3:
        raise AnnotationParseError(
            "DYNAMIC_POLY requires at least 3 coordinate pairs",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="DYNAMIC_POLY",
        )

    # Validate all coordinates
    for lon, lat in all_coords:
        validate_latitude(lat, line_number)
        validate_longitude(lon, line_number)

    # Build ring (auto-close if needed)
    ring = [[lon, lat] for lon, lat in all_coords]
    if ring[0] != ring[-1]:
        ring.append(ring[0])

    # Label is after coordinates
    coord_parts_count = 2 + len(all_coords) * 8  # timestamp + coords
    label_parts = parts[coord_parts_count:] if len(parts) > coord_parts_count else []
    label = " ".join(label_parts) if label_parts else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "DYNAMIC_POLY",
            "group_name": group_name,
            "vertex_count": len(all_coords),
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_polygon_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_sensor(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build SensorAnnotation feature from SENSOR line.

    Format: ;SENSOR: YYMMDD HHMMSS "TRACK_NAME" @A LAT LON BEARING RANGE SENSOR_TYPE LABEL
    """
    content = _extract_content_after_prefix(line)

    # Extract quoted track name
    if '"' not in content:
        raise AnnotationParseError(
            "SENSOR requires quoted track name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="SENSOR",
        )

    before_quote = content.split('"')[0].strip()
    track_id = content.split('"')[1]
    after_quote = '"'.join(content.split('"')[2:]).strip()

    # Parse timestamp from before quote
    time_parts = before_quote.split()
    if len(time_parts) < 2:
        raise AnnotationParseError(
            "SENSOR requires timestamp before track name",
            line_number=line_number,
            code=ErrorCode.INVALID_TIMESTAMP,
            filename=filename,
            annotation_type="SENSOR",
        )

    time_str = f"{time_parts[0]} {time_parts[1]}"
    timestamp = parse_timestamp(time_str)

    parts = after_quote.split()
    if len(parts) < 11:  # symbol + 8 coords + bearing + range = 11
        raise AnnotationParseError(
            "Incomplete SENSOR - expected symbol, coords, bearing, range",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="SENSOR",
        )

    # Parse symbol
    symbol_str = parts[0]
    symbol = parse_symbol(symbol_str, line_number)

    # Parse observer coordinates
    coord_text = " ".join(parts[1:])
    coords = parse_lat_lon(coord_text)
    if coords is None:
        raise AnnotationParseError(
            "Invalid coordinates in SENSOR",
            line_number=line_number,
            code=ErrorCode.INVALID_COORD,
            filename=filename,
            annotation_type="SENSOR",
        )

    observer_lon, observer_lat = coords
    validate_latitude(observer_lat, line_number)
    validate_longitude(observer_lon, line_number)

    # Parse bearing and range (after symbol + 8 coords = 9)
    try:
        bearing = float(parts[9])
        range_m = float(parts[10])
    except (ValueError, IndexError) as err:
        raise AnnotationParseError(
            "Invalid bearing or range in SENSOR",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="SENSOR",
        ) from err

    # Calculate contact position from bearing and range
    # Using simple flat-earth approximation
    meters_per_degree_lat = 111320
    meters_per_degree_lon = 111320 * math.cos(math.radians(observer_lat))

    # Convert bearing to math angle (0=East, counter-clockwise)
    bearing_rad = math.radians(90 - bearing)
    dx = range_m * math.cos(bearing_rad)
    dy = range_m * math.sin(bearing_rad)

    contact_lon = observer_lon + dx / meters_per_degree_lon if meters_per_degree_lon > 0 else observer_lon
    contact_lat = observer_lat + dy / meters_per_degree_lat

    # Sensor type and label after bearing/range
    sensor_type = parts[11] if len(parts) > 11 else None
    label = " ".join(parts[12:]) if len(parts) > 12 else None

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": {
            "type": "LineString",
            "coordinates": [[observer_lon, observer_lat], [contact_lon, contact_lat]],
        },
        "properties": {
            "kind": "SENSOR",
            "track_id": track_id,
            "bearing": bearing,
            "range": range_m,
            "sensor_type": sensor_type,
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_line_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_sensor2(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build Sensor2Annotation feature from SENSOR2 line.

    Format: ;SENSOR2: YYMMDD HHMMSS.SSS TRACK_NAME @B NULL BEARING RANGE FREQUENCY SPEED SENSOR LABEL
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 8:  # date + time + track + symbol + null + bearing + range + frequency
        raise AnnotationParseError(
            "Incomplete SENSOR2",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="SENSOR2",
        )

    # Parse timestamp
    time_str = f"{parts[0]} {parts[1]}"
    timestamp = parse_timestamp(time_str)

    # Track name (not quoted in SENSOR2)
    track_id = parts[2]

    # Symbol
    symbol_str = parts[3]
    symbol = parse_symbol(symbol_str, line_number)

    # NULL field (position placeholder - no coordinates in SENSOR2)
    # Parse bearing and range
    try:
        bearing = float(parts[5])
        range_m = float(parts[6])
    except (ValueError, IndexError) as err:
        raise AnnotationParseError(
            "Invalid bearing or range in SENSOR2",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="SENSOR2",
        ) from err

    # Parse optional fields (may be NULL)
    frequency = None
    speed = None
    if len(parts) > 7:
        try:
            frequency = float(parts[7]) if parts[7] != "NULL" else None
        except ValueError:
            frequency = None

    if len(parts) > 8:
        try:
            speed = float(parts[8]) if parts[8] != "NULL" else None
        except ValueError:
            speed = None

    # Sensor type and label
    sensor_type = parts[9] if len(parts) > 9 else None
    label = " ".join(parts[10:]) if len(parts) > 10 else None

    # SENSOR2 has no position, so geometry is null-ish
    # We'll create a degenerate line from origin
    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": None,  # No position in SENSOR2
        "properties": {
            "kind": "SENSOR2",
            "track_id": track_id,
            "bearing": bearing,
            "range": range_m,
            "frequency": frequency,
            "speed": speed,
            "sensor_type": sensor_type,
            "timestamp": timestamp.iso_string if timestamp else None,
            "label": label,
            "symbol": symbol.color_code,
            "style": _build_line_style(symbol),
            "source_file": filename,
            "line_number": line_number,
        },
    }


def build_tma(line: str, line_number: int, filename: str) -> dict[str, Any] | None:
    """
    Build TMAAnnotation feature from TMA_POS or TMA_RB line.

    TMA_POS Format: ;TMA_POS: YYMMDD HHMMSS "TRACK" @A LAT LON TARGET ORIENTATION SEMI_MAJOR SEMI_MINOR COURSE SPEED DEPTH LABEL
    TMA_RB Format: ;TMA_RB: YYMMDD HHMMSS "TRACK" @A BEARING RANGE ...
    """
    content = _extract_content_after_prefix(line)
    is_tma_rb = line.upper().startswith(";TMA_RB:")

    # Extract quoted track name
    if '"' not in content:
        raise AnnotationParseError(
            "TMA requires quoted track name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="TMA_RB" if is_tma_rb else "TMA_POS",
        )

    before_quote = content.split('"')[0].strip()
    track_id = content.split('"')[1]
    after_quote = '"'.join(content.split('"')[2:]).strip()

    # Parse timestamp from before quote
    time_parts = before_quote.split()
    if len(time_parts) < 2:
        raise AnnotationParseError(
            "TMA requires timestamp",
            line_number=line_number,
            code=ErrorCode.INVALID_TIMESTAMP,
            filename=filename,
            annotation_type="TMA_RB" if is_tma_rb else "TMA_POS",
        )

    time_str = f"{time_parts[0]} {time_parts[1]}"
    timestamp = parse_timestamp(time_str)

    parts = after_quote.split()

    if is_tma_rb:
        # TMA_RB: symbol bearing range track_name ... label
        if len(parts) < 3:
            raise AnnotationParseError(
                "Incomplete TMA_RB",
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type="TMA_RB",
            )

        symbol_str = parts[0]
        try:
            symbol = parse_symbol(symbol_str, line_number)
        except ValueError:
            # Skip features with invalid symbols
            return None

        try:
            bearing = float(parts[1])
            range_m = float(parts[2])
        except (ValueError, IndexError) as err:
            raise AnnotationParseError(
                "Invalid bearing or range in TMA_RB",
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type="TMA_RB",
            ) from err

        label = " ".join(parts[3:]) if len(parts) > 3 else None

        # TMA_RB has bearing/range but no ownship position, so geometry is null
        return {
            "type": "Feature",
            "id": generate_feature_id(),
            "geometry": None,
            "properties": {
                "kind": "TMA_RB",
                "track_id": track_id,
                "bearing": bearing,
                "range": range_m,
                "timestamp": timestamp.iso_string if timestamp else None,
                "label": label,
                "symbol": symbol.color_code,
                "style": _build_line_style(symbol),
                "source_file": filename,
                "line_number": line_number,
            },
        }
    else:
        # TMA_POS: symbol lat lon target_name orientation semi_major semi_minor course speed depth label
        # Note: target_name can be quoted or unquoted
        symbol_str = parts[0]
        try:
            symbol = parse_symbol(symbol_str, line_number)
        except ValueError:
            # Skip features with invalid symbols
            return None

        # Parse coordinates
        coord_text = " ".join(parts[1:])
        coords = parse_lat_lon(coord_text)
        if coords is None:
            raise AnnotationParseError(
                "Invalid coordinates in TMA_POS",
                line_number=line_number,
                code=ErrorCode.INVALID_COORD,
                filename=filename,
                annotation_type="TMA_POS",
            )

        center_lon, center_lat = coords
        validate_latitude(center_lat, line_number)
        validate_longitude(center_lon, line_number)

        # After coords (1 + 8 = 9): target_name (possibly quoted), orientation, semi_major, semi_minor, course, speed, depth
        # Skip past the parts we've already processed (symbol + 8 coord parts)
        remaining_after_coords = " ".join(parts[9:])

        # Check for quoted target name
        if remaining_after_coords.startswith('"'):
            # Extract quoted target name
            quote_end = remaining_after_coords.find('"', 1)
            if quote_end == -1:
                target_name = remaining_after_coords[1:]  # No closing quote
                numeric_parts = []
            else:
                target_name = remaining_after_coords[1:quote_end]
                numeric_str = remaining_after_coords[quote_end + 1:].strip()
                numeric_parts = numeric_str.split()
        else:
            # Unquoted target name - first word
            remaining_parts = remaining_after_coords.split()
            target_name = remaining_parts[0] if remaining_parts else ""
            numeric_parts = remaining_parts[1:] if len(remaining_parts) > 1 else []

        # Parse numeric parameters
        try:
            if len(numeric_parts) < 6:
                raise AnnotationParseError(
                    "Incomplete TMA_POS - missing numeric parameters",
                    line_number=line_number,
                    code=ErrorCode.PARSE_ERROR,
                    filename=filename,
                    annotation_type="TMA_POS",
                )
            orientation = float(numeric_parts[0])
            semi_major = float(numeric_parts[1])
            semi_minor = float(numeric_parts[2])
            course = float(numeric_parts[3])
            speed = float(numeric_parts[4])
            depth = float(numeric_parts[5]) if len(numeric_parts) > 5 else 0
        except (ValueError, IndexError) as err:
            raise AnnotationParseError(
                "Invalid TMA_POS parameters",
                line_number=line_number,
                code=ErrorCode.PARSE_ERROR,
                filename=filename,
                annotation_type="TMA_POS",
            ) from err

        # Label is after all params
        label = " ".join(numeric_parts[6:]) if len(numeric_parts) > 6 else None

        # Generate ellipse polygon
        ring = _approximate_ellipse(center_lon, center_lat, semi_major, semi_minor, orientation)

        return {
            "type": "Feature",
            "id": generate_feature_id(),
            "geometry": {
                "type": "Polygon",
                "coordinates": [ring],
            },
            "properties": {
                "kind": "TMA_POS",
                "track_id": track_id,
                "target_name": target_name,
                "center": [center_lon, center_lat],
                "orientation": orientation,
                "semi_major": semi_major,
                "semi_minor": semi_minor,
                "course": course,
                "speed": speed,
                "depth": depth,
                "timestamp": timestamp.iso_string if timestamp else None,
                "label": label,
                "symbol": symbol.color_code,
                "style": _build_polygon_style(symbol),
                "source_file": filename,
                "line_number": line_number,
            },
        }


def build_tracksplit(line: str, line_number: int, filename: str) -> dict[str, Any]:
    """
    Build TracksplitAnnotation feature from TRACKSPLIT line.

    Format: ;TRACKSPLIT YYMMDD HHMMSS.SSS TRACK_NAME
    Note: TRACKSPLIT has no colon after the keyword
    """
    content = _extract_content_after_prefix(line)
    parts = content.split()

    if len(parts) < 3:  # date + time + track_name
        raise AnnotationParseError(
            "Incomplete TRACKSPLIT - expected timestamp and track name",
            line_number=line_number,
            code=ErrorCode.PARSE_ERROR,
            filename=filename,
            annotation_type="TRACKSPLIT",
        )

    # Parse timestamp
    time_str = f"{parts[0]} {parts[1]}"
    timestamp = parse_timestamp(time_str)

    # Track name
    track_id = parts[2]

    return {
        "type": "Feature",
        "id": generate_feature_id(),
        "geometry": None,  # TRACKSPLIT has no geometry
        "properties": {
            "kind": "TRACKSPLIT",
            "track_id": track_id,
            "timestamp": timestamp.iso_string if timestamp else None,
            "source_file": filename,
            "line_number": line_number,
        },
    }
