"""Buffer Zone Generator tool — generate detection likelihood zones around a track."""

from __future__ import annotations

import math
import uuid
from typing import Any

from debrief_calc.models import ContextType, SelectionContext, ToolParameter
from debrief_calc.registry import tool
from debrief_calc.tools.sensor.detection.sensor_model import (
    SensorModel,
    SensorModelZone,
    StubSensorModel,
)

EARTH_RADIUS_KM = 6371.0
NM_TO_KM = 1.852
NUM_BEARINGS = 36
BEARING_STEP = 360.0 / NUM_BEARINGS


# ============================================================
# GEOMETRY HELPERS
# ============================================================


def translate_point(
    lat_deg: float, lon_deg: float, bearing_deg: float, distance_km: float
) -> tuple[float, float]:
    """Compute destination point given start, bearing, and distance on a sphere.

    Uses the Vincenty destination formula (spherical approximation).
    Same algorithm as move_shape.translate_point.

    Args:
        lat_deg: Start latitude in degrees.
        lon_deg: Start longitude in degrees.
        bearing_deg: Compass bearing in degrees (0=North, 90=East).
        distance_km: Distance in kilometres.

    Returns:
        Tuple of (latitude, longitude) in degrees.
    """
    lat1 = math.radians(lat_deg)
    lon1 = math.radians(lon_deg)
    brng = math.radians(bearing_deg)
    d = distance_km / EARTH_RADIUS_KM

    sin_lat1 = math.sin(lat1)
    cos_lat1 = math.cos(lat1)
    sin_d = math.sin(d)
    cos_d = math.cos(d)

    lat2 = math.asin(sin_lat1 * cos_d + cos_lat1 * sin_d * math.cos(brng))
    lon2 = lon1 + math.atan2(
        math.sin(brng) * sin_d * cos_lat1,
        cos_d - sin_lat1 * math.sin(lat2),
    )

    lon2_deg = math.degrees(lon2)
    lon2_deg = ((lon2_deg + 180) % 360) - 180

    return (math.degrees(lat2), lon2_deg)


def convex_hull(points: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Compute the convex hull of a set of 2D points using Andrew's monotone chain.

    Args:
        points: List of (x, y) tuples. For our use: (longitude, latitude).

    Returns:
        List of hull vertices in counter-clockwise order (not closed — caller
        must append first point to close the ring if needed for GeoJSON).
    """
    pts = sorted(set(points))
    if len(pts) <= 1:
        return list(pts)

    def cross(o: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    # Build lower hull
    lower: list[tuple[float, float]] = []
    for p in pts:
        while len(lower) >= 2 and cross(lower[-2], lower[-1], p) <= 0:
            lower.pop()
        lower.append(p)

    # Build upper hull
    upper: list[tuple[float, float]] = []
    for p in reversed(pts):
        while len(upper) >= 2 and cross(upper[-2], upper[-1], p) <= 0:
            upper.pop()
        upper.append(p)

    # Concatenation of lower and upper, excluding last point of each (duplicate)
    return lower[:-1] + upper[:-1]


def _normalise_longitude(lon: float) -> float:
    """Normalise longitude to [-180, 180]."""
    return ((lon + 180) % 360) - 180


def _needs_antimeridian_shift(coords: list[list[float]]) -> bool:
    """Check if coordinates span the antimeridian (large longitude gap)."""
    lons = [c[0] for c in coords]
    return (max(lons) - min(lons)) > 180


def _shift_lon(lon: float) -> float:
    """Shift longitude to [0, 360] range for antimeridian handling."""
    return lon % 360


# ============================================================
# ZONE GENERATION
# ============================================================


def generate_buffer_polygon(
    track_coords: list[list[float]], distance_nm: float
) -> list[list[float]]:
    """Generate a buffer polygon around track coordinates at a given distance.

    For each track vertex, compute offset points at NUM_BEARINGS evenly-spaced
    bearings, then compute the convex hull of all offset points.

    Args:
        track_coords: List of [lon, lat, ...] coordinate tuples from the track.
        distance_nm: Buffer distance in nautical miles.

    Returns:
        Closed GeoJSON polygon ring as list of [lon, lat] pairs.
    """
    distance_km = distance_nm * NM_TO_KM

    antimeridian = _needs_antimeridian_shift(track_coords)

    # Generate offset point cloud
    offset_points: list[tuple[float, float]] = []
    for coord in track_coords:
        lon, lat = coord[0], coord[1]
        for i in range(NUM_BEARINGS):
            bearing = i * BEARING_STEP
            new_lat, new_lon = translate_point(lat, lon, bearing, distance_km)
            if antimeridian:
                new_lon = _shift_lon(new_lon)
            offset_points.append((new_lon, new_lat))

    # Compute convex hull
    hull = convex_hull(offset_points)

    # Convert to GeoJSON coordinate format and close the ring
    if antimeridian:
        ring = [[_normalise_longitude(p[0]), p[1]] for p in hull]
    else:
        ring = [[p[0], p[1]] for p in hull]

    # Close the ring (first == last)
    if ring and ring[0] != ring[-1]:
        ring.append(list(ring[0]))

    return ring


def _find_track_feature(features: list[dict[str, Any]]) -> dict[str, Any]:
    """Find the first TRACK feature in the input list.

    Args:
        features: List of GeoJSON Feature dicts.

    Returns:
        The first feature with kind=TRACK.

    Raises:
        ValueError: If no TRACK features are found or input is empty.
    """
    if not features:
        raise ValueError("No track features found in input")

    for feature in features:
        props = feature.get("properties", {})
        if props.get("kind") == "TRACK":
            return feature

    raise ValueError("No track features found in input")


def _validate_distances(distances: list[float]) -> list[float]:
    """Validate and sort distances.

    Args:
        distances: List of buffer distances in nm.

    Returns:
        Sorted list of distances (ascending).

    Raises:
        ValueError: If any distance is <= 0.
    """
    for d in distances:
        if d <= 0:
            raise ValueError("All buffer distances must be positive")
    return sorted(distances)


def _build_zone_feature(
    ring: list[list[float]], zone: SensorModelZone
) -> dict[str, Any]:
    """Build a GeoJSON Feature for a detection zone.

    Args:
        ring: Closed polygon ring coordinates.
        zone: SensorModelZone definition.

    Returns:
        GeoJSON Feature dict.
    """
    return {
        "type": "Feature",
        "id": f"zone-{uuid.uuid4()}",
        "geometry": {
            "type": "Polygon",
            "coordinates": [ring],
        },
        "properties": {
            "kind": "ZONE",
            "name": zone.name,
            "detection_likelihood_pct": zone.likelihood_pct,
            "buffer_distance_nm": zone.distance_nm,
        },
    }


# ============================================================
# TOOL REGISTRATION
# ============================================================


@tool(
    name="buffer-zone-generator",
    description=(
        "Generate detection likelihood buffer zones around a track using a sensor model. "
        "Returns 3 concentric polygon features at increasing distances, each named with "
        "its detection likelihood percentage."
    ),
    input_kinds=["TRACK"],
    output_kind="addition/feature",
    context_type=ContextType.SINGLE,
    parameters=[
        ToolParameter(
            name="distance_1_nm",
            type="number",
            description="Innermost buffer distance in nautical miles",
            required=False,
            default=None,
        ),
        ToolParameter(
            name="distance_2_nm",
            type="number",
            description="Middle buffer distance in nautical miles",
            required=False,
            default=None,
        ),
        ToolParameter(
            name="distance_3_nm",
            type="number",
            description="Outermost buffer distance in nautical miles",
            required=False,
            default=None,
        ),
    ],
)
def buffer_zone_generator(
    context: SelectionContext,
    params: dict[str, Any],
    sensor_model: SensorModel | None = None,
) -> list[dict[str, Any]]:
    """Generate detection buffer zones around a track.

    Args:
        context: SelectionContext containing at least one TRACK feature.
        params: Tool parameters (optional distance overrides).
        sensor_model: Optional sensor model override (default: StubSensorModel).

    Returns:
        List of 3 GeoJSON Feature dicts (zone polygons), ordered innermost to outermost.
    """
    # Find the track
    track = _find_track_feature(context.features)
    track_id = track.get("id", "unknown")
    track_coords = track.get("geometry", {}).get("coordinates", [])

    if not track_coords:
        raise ValueError("Track has no coordinates")

    # Get sensor model zones
    if sensor_model is None:
        sensor_model = StubSensorModel()

    zones = sensor_model.get_detection_zones(track)

    # Check for custom distance overrides
    d1 = params.get("distance_1_nm")
    d2 = params.get("distance_2_nm")
    d3 = params.get("distance_3_nm")

    if d1 is not None or d2 is not None or d3 is not None:
        # Use custom distances, falling back to sensor model defaults
        custom_distances = [
            float(d1) if d1 is not None else zones[0].distance_nm,
            float(d2) if d2 is not None else zones[1].distance_nm,
            float(d3) if d3 is not None else zones[2].distance_nm,
        ]
        custom_distances = _validate_distances(custom_distances)

        # Rebuild zones with custom distances but preserve likelihood ordering
        likelihoods = sorted(
            [(z.likelihood_pct, z.name) for z in zones],
            key=lambda x: x[0],
            reverse=True,
        )
        zones = [
            SensorModelZone(
                distance_nm=dist,
                likelihood_pct=lik,
                name=name,
            )
            for dist, (lik, name) in zip(custom_distances, likelihoods)
        ]
    else:
        # Validate default distances
        _validate_distances([z.distance_nm for z in zones])

    # Generate zone polygons
    zone_features = []
    for zone in zones:
        ring = generate_buffer_polygon(track_coords, zone.distance_nm)
        feature = _build_zone_feature(ring, zone)
        zone_features.append(feature)

    # Build provenance label
    zone_names = ", ".join(z.name for z in zones)
    label = f"Generated 3 detection zones ({zone_names}) for track"

    # Attach provenance annotations to each feature
    for feature in zone_features:
        feature["properties"]["debrief:resultType"] = "addition/feature"
        feature["properties"]["debrief:sourceFeatures"] = [track_id]
        feature["properties"]["debrief:label"] = label

    return zone_features
