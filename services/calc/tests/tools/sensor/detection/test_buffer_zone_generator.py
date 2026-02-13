"""Tests for the buffer-zone-generator tool."""

import copy

import pytest
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.sensor.detection.buffer_zone_generator import (
    buffer_zone_generator,
    convex_hull,
    translate_point,
)
from debrief_calc.tools.sensor.detection.sensor_model import (
    SensorModelZone,
)

# ============================================================
# FIXTURES
# ============================================================

SIMPLE_TRACK = {
    "type": "Feature",
    "id": "track-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-4.5, 50.2, 0, 1705305600000],
            [-4.4, 50.3, 0, 1705309200000],
            [-4.3, 50.25, 0, 1705312800000],
        ],
    },
    "properties": {"kind": "TRACK", "name": "HMS Example"},
}

SINGLE_POINT_TRACK = {
    "type": "Feature",
    "id": "track-point",
    "geometry": {
        "type": "LineString",
        "coordinates": [[-4.5, 50.2, 0, 1705305600000]],
    },
    "properties": {"kind": "TRACK", "name": "Stationary"},
}

TWO_POINT_TRACK = {
    "type": "Feature",
    "id": "track-segment",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-4.5, 50.2, 0, 1705305600000],
            [-4.3, 50.3, 0, 1705309200000],
        ],
    },
    "properties": {"kind": "TRACK", "name": "Short Segment"},
}

ANTIMERIDIAN_TRACK = {
    "type": "Feature",
    "id": "track-antimeridian",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [179.9, 0.0, 0, 1705305600000],
            [-179.9, 0.0, 0, 1705309200000],
        ],
    },
    "properties": {"kind": "TRACK", "name": "Antimeridian Crossing"},
}

CLOSE_POSITIONS_TRACK = {
    "type": "Feature",
    "id": "track-close",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-4.5, 50.2, 0, 1705305600000],
            [-4.5000001, 50.2000001, 0, 1705305601000],
            [-4.5000002, 50.2000002, 0, 1705305602000],
        ],
    },
    "properties": {"kind": "TRACK", "name": "Very Close"},
}

NON_TRACK_FEATURE = {
    "type": "Feature",
    "id": "circle-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [[[0.0, 50.0], [1.0, 50.0], [1.0, 51.0], [0.0, 50.0]]],
    },
    "properties": {"kind": "CIRCLE", "name": "Area Alpha"},
}


# ============================================================
# PHASE 2: Foundation — translate_point tests
# ============================================================


class TestTranslatePoint:
    """Tests for the Vincenty destination formula helper."""

    def test_east_translation(self):
        """Translate 5km East from (50, 0). Latitude unchanged, longitude increased."""
        lat, lon = translate_point(50.0, 0.0, 90, 5.0)
        assert lat == pytest.approx(50.0, abs=0.001)
        assert lon > 0.0

    def test_north_translation(self):
        """Translate 10km North from (50, 0). Latitude increased, longitude unchanged."""
        lat, lon = translate_point(50.0, 0.0, 0, 10.0)
        assert lat > 50.0
        assert lon == pytest.approx(0.0, abs=0.001)

    def test_south_translation(self):
        """Translate 10km South. Latitude decreased."""
        lat, lon = translate_point(50.0, 0.0, 180, 10.0)
        assert lat < 50.0

    def test_zero_distance(self):
        """Zero distance returns original coordinates."""
        lat, lon = translate_point(50.0, 0.0, 90, 0.0)
        assert lat == 50.0
        assert lon == 0.0

    def test_nautical_mile_conversion(self):
        """3nm = 5.556km. Verify approximate distance."""
        distance_km = 3.0 * 1.852
        lat, lon = translate_point(0.0, 0.0, 0, distance_km)
        # At equator, 1 degree latitude ≈ 111.32 km
        expected_lat_change = distance_km / 111.32
        assert lat == pytest.approx(expected_lat_change, abs=0.001)

    def test_antimeridian_wrapping(self):
        """Translating East across antimeridian wraps to negative longitude."""
        lat, lon = translate_point(0.0, 179.99, 90, 20.0)
        assert lon < 0  # Should wrap to negative


# ============================================================
# PHASE 2: Foundation — convex_hull tests
# ============================================================


class TestConvexHull:
    """Tests for the convex hull algorithm."""

    def test_triangle(self):
        """Three points forming a triangle."""
        points = [(0, 0), (4, 0), (2, 3)]
        hull = convex_hull(points)
        assert len(hull) == 3
        assert set(hull) == {(0, 0), (4, 0), (2, 3)}

    def test_square(self):
        """Four corner points of a square."""
        points = [(0, 0), (4, 0), (4, 4), (0, 4)]
        hull = convex_hull(points)
        assert len(hull) == 4

    def test_collinear(self):
        """Collinear points: hull should be just the endpoints."""
        points = [(0, 0), (1, 1), (2, 2), (3, 3)]
        hull = convex_hull(points)
        assert len(hull) == 2
        assert (0, 0) in hull
        assert (3, 3) in hull

    def test_single_point(self):
        """Single point returns that point."""
        points = [(5, 5)]
        hull = convex_hull(points)
        assert hull == [(5, 5)]

    def test_two_points(self):
        """Two points returns both."""
        points = [(0, 0), (5, 5)]
        hull = convex_hull(points)
        assert len(hull) == 2

    def test_interior_points_excluded(self):
        """Interior points not in hull."""
        points = [(0, 0), (4, 0), (4, 4), (0, 4), (2, 2), (1, 1), (3, 3)]
        hull = convex_hull(points)
        assert len(hull) == 4
        assert (2, 2) not in hull
        assert (1, 1) not in hull
        assert (3, 3) not in hull

    def test_duplicate_points(self):
        """Duplicate points handled correctly."""
        points = [(0, 0), (0, 0), (4, 0), (4, 0), (2, 3)]
        hull = convex_hull(points)
        assert len(hull) == 3


# ============================================================
# PHASE 3: US1 — Core zone generation tests
# ============================================================


class TestBufferZoneGeneratorUS1:
    """User Story 1: Generate 3 detection zones with default distances."""

    def test_three_zones_generated(self):
        """Tool returns exactly 3 zone features."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})
        assert len(result) == 3

    def test_zone_properties(self):
        """Each zone has kind=ZONE, name, likelihood, distance."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        for feature in result:
            props = feature["properties"]
            assert props["kind"] == "ZONE"
            assert "name" in props
            assert "detection_likelihood_pct" in props
            assert "buffer_distance_nm" in props

    def test_zone_names_and_distances(self):
        """Zones have correct names matching default stub model."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        assert result[0]["properties"]["name"] == "75%"
        assert result[0]["properties"]["buffer_distance_nm"] == 3.0
        assert result[1]["properties"]["name"] == "50%"
        assert result[1]["properties"]["buffer_distance_nm"] == 6.0
        assert result[2]["properties"]["name"] == "25%"
        assert result[2]["properties"]["buffer_distance_nm"] == 12.0

    def test_zones_ordered_innermost_to_outermost(self):
        """Zones ordered by ascending distance (innermost first)."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        distances = [f["properties"]["buffer_distance_nm"] for f in result]
        assert distances == sorted(distances)
        assert distances == [3.0, 6.0, 12.0]

    def test_zone_encloses_track(self):
        """Each zone polygon fully contains all track positions."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        track_coords = track["geometry"]["coordinates"]
        for zone_feature in result:
            ring = zone_feature["geometry"]["coordinates"][0]
            for coord in track_coords:
                lon, lat = coord[0], coord[1]
                assert _point_in_polygon(lon, lat, ring), (
                    f"Track point ({lon}, {lat}) not inside zone "
                    f"{zone_feature['properties']['name']}"
                )

    def test_concentric_containment(self):
        """Inner zone vertices are inside the outer zone polygon."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        # 75% zone (3nm) should be inside 50% zone (6nm)
        inner_ring = result[0]["geometry"]["coordinates"][0]
        outer_ring = result[1]["geometry"]["coordinates"][0]
        for point in inner_ring[:-1]:  # Skip closing point
            assert _point_in_polygon(point[0], point[1], outer_ring), (
                f"Inner zone point ({point[0]}, {point[1]}) not inside middle zone"
            )

        # 50% zone (6nm) should be inside 25% zone (12nm)
        mid_ring = result[1]["geometry"]["coordinates"][0]
        outer_ring = result[2]["geometry"]["coordinates"][0]
        for point in mid_ring[:-1]:
            assert _point_in_polygon(point[0], point[1], outer_ring), (
                f"Middle zone point ({point[0]}, {point[1]}) not inside outer zone"
            )

    def test_error_empty_input(self):
        """Empty feature list raises ValueError."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        with pytest.raises(ValueError, match="No track features found"):
            buffer_zone_generator(context, {})

    def test_error_no_track_features(self):
        """Input with only non-track features raises ValueError."""
        context = SelectionContext(
            type=ContextType.SINGLE, features=[copy.deepcopy(NON_TRACK_FEATURE)]
        )
        with pytest.raises(ValueError, match="No track features found"):
            buffer_zone_generator(context, {})

    def test_non_track_features_skipped(self):
        """Non-track features are silently skipped; first track is used."""
        track = copy.deepcopy(SIMPLE_TRACK)
        non_track = copy.deepcopy(NON_TRACK_FEATURE)
        context = SelectionContext(type=ContextType.MULTI, features=[non_track, track])
        result = buffer_zone_generator(context, {})
        assert len(result) == 3
        # Source should reference the track, not the circle
        assert result[0]["properties"]["debrief:sourceFeatures"] == ["track-001"]

    def test_single_point_track_circular_zones(self):
        """Single-point track produces approximately circular zones."""
        track = copy.deepcopy(SINGLE_POINT_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        assert len(result) == 3
        # Each zone should be a valid polygon
        for feature in result:
            ring = feature["geometry"]["coordinates"][0]
            assert len(ring) >= 4  # At least triangle + closing point
            assert ring[0] == ring[-1]  # Ring is closed

    def test_zone_geometry_valid_polygon(self):
        """Each zone has valid Polygon geometry with closed ring."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        for feature in result:
            assert feature["type"] == "Feature"
            assert feature["geometry"]["type"] == "Polygon"
            ring = feature["geometry"]["coordinates"][0]
            assert len(ring) >= 4
            assert ring[0] == ring[-1]  # Closed ring

    def test_zone_has_uuid_id(self):
        """Each zone has a unique ID starting with 'zone-'."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        ids = set()
        for feature in result:
            assert feature["id"].startswith("zone-")
            ids.add(feature["id"])
        assert len(ids) == 3  # All unique

    def test_empty_track_coordinates_error(self):
        """Track with no coordinates raises ValueError."""
        track = {
            "type": "Feature",
            "id": "track-empty",
            "geometry": {"type": "LineString", "coordinates": []},
            "properties": {"kind": "TRACK"},
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        with pytest.raises(ValueError, match="Track has no coordinates"):
            buffer_zone_generator(context, {})


# ============================================================
# PHASE 4: US2 — Custom distance tests
# ============================================================


class TestBufferZoneGeneratorUS2:
    """User Story 2: Custom buffer distances."""

    def test_custom_distances(self):
        """Custom distances produce zones at specified ranges."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": 2.0, "distance_2_nm": 8.0, "distance_3_nm": 15.0}
        result = buffer_zone_generator(context, params)

        distances = [f["properties"]["buffer_distance_nm"] for f in result]
        assert distances == [2.0, 8.0, 15.0]

    def test_non_ascending_reordered(self):
        """Non-ascending distances are sorted ascending."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": 15.0, "distance_2_nm": 2.0, "distance_3_nm": 8.0}
        result = buffer_zone_generator(context, params)

        distances = [f["properties"]["buffer_distance_nm"] for f in result]
        assert distances == [2.0, 8.0, 15.0]

    def test_error_zero_distance(self):
        """Zero distance raises ValueError."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": 0.0, "distance_2_nm": 6.0, "distance_3_nm": 12.0}
        with pytest.raises(ValueError, match="All buffer distances must be positive"):
            buffer_zone_generator(context, params)

    def test_error_negative_distance(self):
        """Negative distance raises ValueError."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": -1.0, "distance_2_nm": 6.0, "distance_3_nm": 12.0}
        with pytest.raises(ValueError, match="All buffer distances must be positive"):
            buffer_zone_generator(context, params)

    def test_partial_custom_distances(self):
        """Partial custom distances use defaults for unspecified."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": 1.0}  # Only override innermost
        result = buffer_zone_generator(context, params)

        distances = [f["properties"]["buffer_distance_nm"] for f in result]
        assert distances == [1.0, 6.0, 12.0]

    def test_custom_distances_preserve_likelihood_ordering(self):
        """Highest likelihood paired with smallest distance."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        params = {"distance_1_nm": 2.0, "distance_2_nm": 8.0, "distance_3_nm": 15.0}
        result = buffer_zone_generator(context, params)

        # Smallest distance should have highest likelihood
        assert result[0]["properties"]["detection_likelihood_pct"] == 75
        assert result[1]["properties"]["detection_likelihood_pct"] == 50
        assert result[2]["properties"]["detection_likelihood_pct"] == 25


# ============================================================
# PHASE 5: US3 — Cascade integration tests
# ============================================================


class TestBufferZoneGeneratorUS3:
    """User Story 3: Stateless re-invocation and provenance."""

    def test_stateless_reinvocation(self):
        """Different tracks produce different zones."""
        track_a = copy.deepcopy(SIMPLE_TRACK)
        track_b = copy.deepcopy(SIMPLE_TRACK)
        track_b["id"] = "track-002"
        track_b["geometry"]["coordinates"] = [
            [-2.0, 51.0, 0, 1705305600000],
            [-1.9, 51.1, 0, 1705309200000],
        ]

        context_a = SelectionContext(type=ContextType.SINGLE, features=[track_a])
        context_b = SelectionContext(type=ContextType.SINGLE, features=[track_b])

        result_a = buffer_zone_generator(context_a, {})
        result_b = buffer_zone_generator(context_b, {})

        # Results should have different geometries
        ring_a = result_a[0]["geometry"]["coordinates"][0]
        ring_b = result_b[0]["geometry"]["coordinates"][0]
        assert ring_a != ring_b

    def test_provenance_annotations(self):
        """Each zone has correct provenance annotations."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        for feature in result:
            props = feature["properties"]
            assert props["debrief:resultType"] == "addition/feature"
            assert props["debrief:sourceFeatures"] == ["track-001"]
            assert "debrief:label" in props
            assert "detection zones" in props["debrief:label"]

    def test_provenance_label_format(self):
        """Provenance label follows expected format."""
        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        expected = "Generated 3 detection zones (75%, 50%, 25%) for track"
        assert result[0]["properties"]["debrief:label"] == expected

    def test_sensor_model_swappability(self):
        """Injecting a different sensor model changes the output."""

        class TestSensorModel:
            def get_detection_zones(self, track):
                return [
                    SensorModelZone(distance_nm=1.0, likelihood_pct=90, name="90%"),
                    SensorModelZone(distance_nm=2.0, likelihood_pct=60, name="60%"),
                    SensorModelZone(distance_nm=4.0, likelihood_pct=30, name="30%"),
                ]

        track = copy.deepcopy(SIMPLE_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])

        result_custom = buffer_zone_generator(context, {}, sensor_model=TestSensorModel())

        # Custom model should produce different distances
        assert result_custom[0]["properties"]["buffer_distance_nm"] == 1.0
        assert result_custom[1]["properties"]["buffer_distance_nm"] == 2.0
        assert result_custom[2]["properties"]["buffer_distance_nm"] == 4.0

        # And different names
        assert result_custom[0]["properties"]["name"] == "90%"


# ============================================================
# PHASE 6: Edge case tests
# ============================================================


class TestBufferZoneGeneratorEdgeCases:
    """Edge case tests for buffer-zone-generator."""

    def test_antimeridian_crossing_track(self):
        """Track crossing antimeridian produces valid polygons."""
        track = copy.deepcopy(ANTIMERIDIAN_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        assert len(result) == 3
        for feature in result:
            ring = feature["geometry"]["coordinates"][0]
            assert len(ring) >= 4
            assert ring[0] == ring[-1]
            # All longitudes should be in valid range
            for point in ring:
                assert -180 <= point[0] <= 180
                assert -90 <= point[1] <= 90

    def test_close_positions_track(self):
        """Track with sub-metre spacing produces valid zones."""
        track = copy.deepcopy(CLOSE_POSITIONS_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        assert len(result) == 3
        for feature in result:
            ring = feature["geometry"]["coordinates"][0]
            assert len(ring) >= 4
            assert ring[0] == ring[-1]

    def test_two_point_track(self):
        """Two-point track (line segment) produces valid zones."""
        track = copy.deepcopy(TWO_POINT_TRACK)
        context = SelectionContext(type=ContextType.SINGLE, features=[track])
        result = buffer_zone_generator(context, {})

        assert len(result) == 3
        for feature in result:
            ring = feature["geometry"]["coordinates"][0]
            assert len(ring) >= 4
            assert ring[0] == ring[-1]

        # Track points should be inside zones
        track_coords = track["geometry"]["coordinates"]
        for zone in result:
            ring = zone["geometry"]["coordinates"][0]
            for coord in track_coords:
                assert _point_in_polygon(coord[0], coord[1], ring)


# ============================================================
# HELPER: Point-in-polygon (ray casting)
# ============================================================


def _point_in_polygon(x: float, y: float, polygon: list[list[float]]) -> bool:
    """Ray-casting point-in-polygon test.

    Args:
        x: Point x coordinate (longitude).
        y: Point y coordinate (latitude).
        polygon: List of [x, y] vertices (closed ring).

    Returns:
        True if point is inside or on the polygon boundary.
    """
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i][0], polygon[i][1]
        xj, yj = polygon[j][0], polygon[j][1]

        # Check if point is on edge (close enough)
        if abs(yi - yj) > 1e-10:
            t = (y - yj) / (yi - yj)
            if 0 <= t <= 1:
                x_intersect = xj + t * (xi - xj)
                if abs(x - x_intersect) < 1e-6:
                    return True

        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside
