"""Array offset calculations for towed-array sensors.

Three array centre modes determine where a sensor's bearing lines originate:
  - PLAIN: backtrack along the vessel's heading by the offset distance
  - WORM: walk backwards along the vessel's track path by the offset distance
  - MEASURED: interpolate from the sensor's measured position time-series,
              with fallback to PLAIN when the contact timestamp falls
              outside the measured range

All calculations are pure functions with identical behaviour to the TypeScript
implementation in shared/components/src/MapView/array-offset.ts. Parity is
verified by cross-language golden tests.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any

# Mean Earth radius in metres (matches TS haversineDistanceMetres)
EARTH_RADIUS_METRES = 6_371_000.0


# ── Time helpers ────────────────────────────────────────────────────


def _parse_iso_to_ms(time_iso: str) -> int:
    """Parse an ISO-8601 timestamp string to epoch milliseconds.

    Accepts trailing "Z" (UTC) and timezone offsets.
    """
    # Python's datetime.fromisoformat accepts +00:00 but not 'Z' before 3.11.
    # On 3.11+ it accepts 'Z' directly. Fallback for older paths:
    if time_iso.endswith("Z"):
        try:
            dt = datetime.fromisoformat(time_iso.replace("Z", "+00:00"))
        except ValueError as exc:
            raise ValueError(f"Invalid ISO-8601 timestamp: {time_iso!r}") from exc
    else:
        try:
            dt = datetime.fromisoformat(time_iso)
        except ValueError as exc:
            raise ValueError(f"Invalid ISO-8601 timestamp: {time_iso!r}") from exc
    return int(dt.timestamp() * 1000)


# ── Geo primitives ──────────────────────────────────────────────────


def haversine_distance_metres(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    """Geodesic distance between two points in metres.

    Uses the haversine formula with the mean Earth radius (6371000m).

    Args:
        lon1: Longitude of point 1 (degrees).
        lat1: Latitude of point 1 (degrees).
        lon2: Longitude of point 2 (degrees).
        lat2: Latitude of point 2 (degrees).

    Returns:
        Distance in metres.
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return EARTH_RADIUS_METRES * c


def _geodesic_destination(
    lon: float, lat: float, bearing_deg: float, distance_metres: float
) -> tuple[float, float]:
    """Destination point from (lon, lat) at given bearing and distance.

    Mirrors the TypeScript `geodesicDestination()` function from sensor-utils.ts
    (spherical Earth, Earth radius 6371000m).

    Returns:
        (lon, lat) of the destination in degrees.
    """
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    brng = math.radians(bearing_deg)
    d = distance_metres / EARTH_RADIUS_METRES

    sin_d = math.sin(d)
    cos_d = math.cos(d)
    sin_lat1 = math.sin(lat1)
    cos_lat1 = math.cos(lat1)

    lat2 = math.asin(sin_lat1 * cos_d + cos_lat1 * sin_d * math.cos(brng))
    lon2 = lon1 + math.atan2(
        math.sin(brng) * sin_d * cos_lat1,
        cos_d - sin_lat1 * math.sin(lat2),
    )

    return (math.degrees(lon2), math.degrees(lat2))


# ── Mode algorithms ─────────────────────────────────────────────────


def compute_plain_offset(
    host_position: tuple[float, float],
    course_deg: float,
    offset_metres: float,
) -> tuple[float, float]:
    """PLAIN mode: backtrack from the vessel's position along its heading.

    The reverse bearing is ``(course_deg + 180) mod 360``. The array centre is
    the geodesic destination from the vessel at that reverse bearing, at the
    offset distance.
    """
    if offset_metres <= 0:
        return host_position
    reverse_bearing = ((course_deg + 180.0) % 360.0 + 360.0) % 360.0
    return _geodesic_destination(host_position[0], host_position[1], reverse_bearing, offset_metres)


def _interpolate_track_position(
    track_coordinates: list[list[float]],
    track_positions: list[dict[str, Any]],
    contact_time_ms: int,
) -> tuple[float, float] | None:
    """Linear interpolation of the track coordinate at a given timestamp.

    Mirrors the TypeScript `interpolateTrackPosition()`.
    Returns None when the contact time lies outside the track's time range.
    """
    if not track_coordinates or not track_positions:
        return None
    if len(track_coordinates) != len(track_positions):
        return None

    timestamps = [_parse_iso_to_ms(p["time"]) for p in track_positions]

    if contact_time_ms < timestamps[0] or contact_time_ms > timestamps[-1]:
        return None

    # Find bracketing pair
    for i in range(len(timestamps) - 1):
        t0 = timestamps[i]
        t1 = timestamps[i + 1]
        if t0 <= contact_time_ms <= t1:
            if t1 == t0:
                coord = track_coordinates[i]
                return (float(coord[0]), float(coord[1]))
            fraction = (contact_time_ms - t0) / (t1 - t0)
            lon0, lat0 = track_coordinates[i][0], track_coordinates[i][1]
            lon1, lat1 = track_coordinates[i + 1][0], track_coordinates[i + 1][1]
            return (
                lon0 + (lon1 - lon0) * fraction,
                lat0 + (lat1 - lat0) * fraction,
            )

    coord = track_coordinates[-1]
    return (float(coord[0]), float(coord[1]))


def backtrack_along_track(
    track_coordinates: list[list[float]],
    track_positions: list[dict[str, Any]],
    contact_time_iso: str,
    offset_metres: float,
) -> tuple[float, float]:
    """WORM mode: walk backward along the vessel's track path.

    Starts at the interpolated vessel position at the contact time, then walks
    backward through track segments accumulating haversine distances until the
    offset distance is reached. If the track is exhausted before reaching the
    offset, the array centre is placed at the earliest available track point.

    Args:
        track_coordinates: Track geometry coordinates as a list of [lon, lat] pairs.
        track_positions: Track positions, each with an ISO-8601 ``time`` field.
        contact_time_iso: Contact timestamp (ISO-8601 string).
        offset_metres: Distance to walk backward along the track path.

    Returns:
        Array centre (lon, lat) on the track path.
    """
    if not track_coordinates:
        raise ValueError("backtrack_along_track: empty track coordinates")
    if len(track_coordinates) == 1 or offset_metres <= 0:
        first = track_coordinates[0]
        return (float(first[0]), float(first[1]))

    contact_time_ms = _parse_iso_to_ms(contact_time_iso)
    timestamps = [_parse_iso_to_ms(p["time"]) for p in track_positions]

    start_point = _interpolate_track_position(track_coordinates, track_positions, contact_time_ms)
    if start_point is None:
        first = track_coordinates[0]
        start_point = (float(first[0]), float(first[1]))

    # Determine starting segment index
    if contact_time_ms >= timestamps[-1]:
        start_idx = len(track_coordinates) - 1
    elif contact_time_ms <= timestamps[0]:
        first = track_coordinates[0]
        return (float(first[0]), float(first[1]))
    else:
        # Find largest index i where timestamps[i] <= contact_time_ms
        start_idx = 0
        for i, t in enumerate(timestamps):
            if t <= contact_time_ms:
                start_idx = i
            else:
                break

    remaining = offset_metres
    current_point = (start_point[0], start_point[1])

    for i in range(start_idx, 0, -1):
        prev_point = track_coordinates[i - 1]
        seg_len = haversine_distance_metres(
            current_point[0], current_point[1], prev_point[0], prev_point[1]
        )

        if seg_len == 0:
            current_point = (float(prev_point[0]), float(prev_point[1]))
            continue

        if remaining <= seg_len:
            fraction = remaining / seg_len
            return (
                current_point[0] + (prev_point[0] - current_point[0]) * fraction,
                current_point[1] + (prev_point[1] - current_point[1]) * fraction,
            )

        remaining -= seg_len
        current_point = (float(prev_point[0]), float(prev_point[1]))

    # Track exhausted: return the earliest point on the track
    first = track_coordinates[0]
    return (float(first[0]), float(first[1]))


def interpolate_measured_position(
    measured_positions: list[dict[str, Any]],
    contact_time_iso: str,
) -> tuple[float, float] | None:
    """MEASURED mode: interpolate from the sensor's measured position time-series.

    If the contact time is outside the measured range, returns ``None`` so the
    caller can fall back to PLAIN mode (FR-004).

    Measured positions are sorted by time before lookup to handle unordered input.
    """
    if not measured_positions:
        return None

    parsed: list[tuple[int, float, float]] = []
    for p in measured_positions:
        try:
            t_ms = _parse_iso_to_ms(p["time"])
        except (ValueError, KeyError):
            continue
        loc = p.get("location")
        if not loc or len(loc) < 2:
            continue
        parsed.append((t_ms, float(loc[0]), float(loc[1])))

    if not parsed:
        return None

    parsed.sort(key=lambda x: x[0])

    contact_time_ms = _parse_iso_to_ms(contact_time_iso)
    first_t = parsed[0][0]
    last_t = parsed[-1][0]

    if contact_time_ms < first_t or contact_time_ms > last_t:
        return None

    if contact_time_ms == first_t:
        return (parsed[0][1], parsed[0][2])
    if contact_time_ms == last_t:
        return (parsed[-1][1], parsed[-1][2])

    for i in range(len(parsed) - 1):
        t0, lon0, lat0 = parsed[i]
        t1, lon1, lat1 = parsed[i + 1]
        if t0 <= contact_time_ms <= t1:
            if t1 == t0:
                return (lon0, lat0)
            fraction = (contact_time_ms - t0) / (t1 - t0)
            return (
                lon0 + (lon1 - lon0) * fraction,
                lat0 + (lat1 - lat0) * fraction,
            )

    return None


# ── Course interpolation helper ─────────────────────────────────────


def interpolate_track_course(
    track_positions: list[dict[str, Any]],
    contact_time_iso: str,
) -> float | None:
    """Resolve the vessel course at a contact timestamp.

    Uses nearest-neighbour lookup among the track positions (matches the
    TypeScript `interpolateTrackCourse` behaviour). Returns ``None`` when the
    contact time is outside the track's time range or no course is available.
    """
    if not track_positions:
        return None
    timestamps = [_parse_iso_to_ms(p["time"]) for p in track_positions]
    contact_time_ms = _parse_iso_to_ms(contact_time_iso)

    if contact_time_ms < timestamps[0] or contact_time_ms > timestamps[-1]:
        return None

    # Nearest-neighbour by absolute timestamp difference
    best_idx = 0
    best_diff = abs(timestamps[0] - contact_time_ms)
    for i, t in enumerate(timestamps):
        diff = abs(t - contact_time_ms)
        if diff < best_diff:
            best_diff = diff
            best_idx = i

    course = track_positions[best_idx].get("course")
    if course is None:
        return None
    return float(course)


# ── Dispatcher ──────────────────────────────────────────────────────


def compute_array_centre(
    host_position: tuple[float, float],
    course_deg: float | None,
    offset_metres: float | None,
    array_centre_mode: str | None,
    measured_positions: list[dict[str, Any]] | None,
    contact_time_iso: str,
    track_coordinates: list[list[float]],
    track_positions: list[dict[str, Any]],
) -> tuple[float, float]:
    """Primary dispatch: compute the array centre for a sensor contact.

    Resolution order:
      1. If ``offset_metres`` is None/0 → return host position unchanged
      2. If ``array_centre_mode`` is None → return host position unchanged
      3. Otherwise dispatch on mode:
         - PLAIN: compute_plain_offset()
         - WORM: backtrack_along_track()
         - MEASURED: interpolate_measured_position(); on None, fall back to PLAIN

    Args:
        host_position: Interpolated vessel position (lon, lat).
        course_deg: Vessel course at contact time (degrees) or None.
        offset_metres: Sensor offset distance in metres.
        array_centre_mode: "PLAIN", "WORM", "MEASURED", or None.
        measured_positions: Sensor's measured position list (for MEASURED mode).
        contact_time_iso: Contact timestamp (ISO-8601 string).
        track_coordinates: Vessel track coordinates.
        track_positions: Vessel track positions (with timestamps).

    Returns:
        Array centre (lon, lat).
    """
    if offset_metres is None or offset_metres <= 0:
        return host_position
    if array_centre_mode is None:
        return host_position

    if array_centre_mode == "PLAIN":
        if course_deg is None:
            return host_position
        return compute_plain_offset(host_position, course_deg, offset_metres)

    if array_centre_mode == "WORM":
        if not track_coordinates:
            return host_position
        return backtrack_along_track(
            track_coordinates, track_positions, contact_time_iso, offset_metres
        )

    if array_centre_mode == "MEASURED":
        if measured_positions:
            interp = interpolate_measured_position(measured_positions, contact_time_iso)
            if interp is not None:
                return interp
        # Fallback to PLAIN
        if course_deg is None:
            return host_position
        return compute_plain_offset(host_position, course_deg, offset_metres)

    # Unknown mode — behave as if no offset applies
    return host_position
