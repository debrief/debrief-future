"""Golden example tests for move-shape tool (056)."""

import copy

import pytest
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.shape.manipulation.move_shape import move_shape, translate_point

# Test fixtures - module-level feature dictionaries
CIRCLE_FEATURE = {
    "type": "Feature",
    "id": "circle-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [0.008993, 50.0],
                [0.006363, 50.006363],
                [0.0, 50.008993],
                [-0.006363, 50.006363],
                [-0.008993, 50.0],
                [-0.006363, 49.993637],
                [0.0, 49.991007],
                [0.006363, 49.993637],
                [0.008993, 50.0],
            ]
        ],
    },
    "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0],
        "radius": 1000,
        "label": "Exercise Area",
        "style": {
            "fill_color": "#FF5733",
            "color": "#FF0000",
        },
    },
}

RECTANGLE_FEATURE = {
    "type": "Feature",
    "id": "rect-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-0.045, 50.045],
                [0.045, 50.045],
                [0.045, 49.955],
                [-0.045, 49.955],
                [-0.045, 50.045],
            ]
        ],
    },
    "properties": {
        "kind": "RECTANGLE",
        "label": "Search Area",
        "style": {
            "fill_color": "#00FF00",
            "color": "#0000FF",
        },
    },
}

VECTOR_FEATURE = {
    "type": "Feature",
    "id": "vector-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [0.0, 50.0],
            [0.084957, 50.084957],
        ],
    },
    "properties": {
        "kind": "VECTOR",
        "origin": [0.0, 50.0],
        "range": 12000,
        "bearing": 45,
        "label": "Search Vector",
        "style": {
            "color": "#00FF00",
        },
    },
}

LINE_FEATURE = {
    "type": "Feature",
    "id": "line-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [-1.0, 50.0],
            [-1.1, 50.1],
        ],
    },
    "properties": {
        "kind": "LINE",
        "label": "Nav Line",
        "style": {
            "color": "#FFFF00",
        },
    },
}

TEXT_FEATURE = {
    "type": "Feature",
    "id": "text-001",
    "geometry": {
        "type": "Point",
        "coordinates": [0.0, 50.0],
    },
    "properties": {
        "kind": "TEXT",
        "text": "Waypoint Alpha",
        "style": {
            "color": "#FFFFFF",
        },
    },
}


class TestTranslatePoint:
    """Tests for the translate_point utility function."""

    def test_east_translation(self) -> None:
        """Translate point East 5km from (50, 0). Verify latitude unchanged and longitude increased."""
        lat, lon = translate_point(50, 0, 90, 5)

        assert lat == pytest.approx(50.0, abs=0.001)
        assert lon == pytest.approx(0.070, abs=0.001)

    def test_north_translation(self) -> None:
        """Translate point North 10km from (50, 0). Verify latitude increased and longitude unchanged."""
        lat, lon = translate_point(50, 0, 0, 10)

        assert lat == pytest.approx(50.09, abs=0.001)
        assert lon == pytest.approx(0.0, abs=0.001)

    def test_zero_distance(self) -> None:
        """Translate with zero distance. Verify coordinates unchanged."""
        lat, lon = translate_point(50, 0, 90, 0)

        assert lat == 50.0
        assert lon == 0.0


class TestMoveShapeCircle:
    """Golden example tests for move-shape with CIRCLE features (US1)."""

    def test_circle_vertices_translated(self) -> None:
        """Move circle East 5km. Verify all vertex longitudes increased."""
        feature = copy.deepcopy(CIRCLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 5}

        result = move_shape(context, params)

        assert len(result) == 1
        original_coords = CIRCLE_FEATURE["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]

        # Verify all longitudes increased (moved East)
        for i, (orig_pt, result_pt) in enumerate(zip(original_coords, result_coords, strict=True)):
            assert result_pt[0] > orig_pt[0], (
                f"Vertex {i} longitude should increase when moving East"
            )
            # Latitudes should be approximately equal
            assert result_pt[1] == pytest.approx(orig_pt[1], abs=0.001)

    def test_circle_center_updated(self) -> None:
        """Move circle East 5km. Verify center property updated."""
        feature = copy.deepcopy(CIRCLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 5}

        result = move_shape(context, params)

        assert len(result) == 1
        original_center = CIRCLE_FEATURE["properties"]["center"]
        result_center = result[0]["properties"]["center"]

        # Center longitude should increase
        assert result_center[0] > original_center[0]
        # Center latitude should be approximately equal
        assert result_center[1] == pytest.approx(original_center[1], abs=0.001)

    def test_circle_radius_preserved(self) -> None:
        """Move circle East 5km. Verify radius property unchanged."""
        feature = copy.deepcopy(CIRCLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 5}

        result = move_shape(context, params)

        assert len(result) == 1
        assert result[0]["properties"]["radius"] == CIRCLE_FEATURE["properties"]["radius"]


class TestMoveShapeRectangle:
    """Golden example tests for move-shape with RECTANGLE features (US1)."""

    def test_rectangle_vertices_translated(self) -> None:
        """Move rectangle North 10km. Verify all vertex latitudes increased."""
        feature = copy.deepcopy(RECTANGLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 0, "distance_km": 10}

        result = move_shape(context, params)

        assert len(result) == 1
        original_coords = RECTANGLE_FEATURE["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]

        # Verify all latitudes increased (moved North)
        for i, (orig_pt, result_pt) in enumerate(zip(original_coords, result_coords, strict=True)):
            assert result_pt[1] > orig_pt[1], (
                f"Vertex {i} latitude should increase when moving North"
            )
            # Longitudes should be approximately equal
            assert result_pt[0] == pytest.approx(orig_pt[0], abs=0.001)


class TestMoveShapeVector:
    """Golden example tests for move-shape with VECTOR features (US2)."""

    def test_vector_coords_translated(self) -> None:
        """Move vector North 10km. Verify both line coordinates shifted North."""
        feature = copy.deepcopy(VECTOR_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 0, "distance_km": 10}

        result = move_shape(context, params)

        assert len(result) == 1
        original_coords = VECTOR_FEATURE["geometry"]["coordinates"]
        result_coords = result[0]["geometry"]["coordinates"]

        # Verify both points moved North
        for orig_pt, result_pt in zip(original_coords, result_coords, strict=True):
            assert result_pt[1] > orig_pt[1]
            assert result_pt[0] == pytest.approx(orig_pt[0], abs=0.001)

    def test_vector_origin_updated(self) -> None:
        """Move vector North 10km. Verify origin property updated."""
        feature = copy.deepcopy(VECTOR_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 0, "distance_km": 10}

        result = move_shape(context, params)

        assert len(result) == 1
        original_origin = VECTOR_FEATURE["properties"]["origin"]
        result_origin = result[0]["properties"]["origin"]

        # Origin latitude should increase
        assert result_origin[1] > original_origin[1]
        # Origin longitude should be approximately equal
        assert result_origin[0] == pytest.approx(original_origin[0], abs=0.001)

    def test_vector_range_bearing_preserved(self) -> None:
        """Move vector North 10km. Verify range and bearing properties unchanged."""
        feature = copy.deepcopy(VECTOR_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 0, "distance_km": 10}

        result = move_shape(context, params)

        assert len(result) == 1
        assert result[0]["properties"]["range"] == VECTOR_FEATURE["properties"]["range"]
        assert result[0]["properties"]["bearing"] == VECTOR_FEATURE["properties"]["bearing"]


class TestMoveShapeLine:
    """Golden example tests for move-shape with LINE features (US2)."""

    def test_line_coords_translated(self) -> None:
        """Move line South 2km. Verify both endpoints shifted South (latitude decreased)."""
        feature = copy.deepcopy(LINE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 180, "distance_km": 2}

        result = move_shape(context, params)

        assert len(result) == 1
        original_coords = LINE_FEATURE["geometry"]["coordinates"]
        result_coords = result[0]["geometry"]["coordinates"]

        # Verify both points moved South (latitude decreased)
        for orig_pt, result_pt in zip(original_coords, result_coords, strict=True):
            assert result_pt[1] < orig_pt[1], "Latitude should decrease when moving South"
            # Longitudes should be approximately equal
            assert result_pt[0] == pytest.approx(orig_pt[0], abs=0.001)


class TestMoveShapeText:
    """Golden example tests for move-shape with TEXT features (US3)."""

    def test_text_point_translated(self) -> None:
        """Move text point East 5km. Verify point coordinates shifted East."""
        feature = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 5}

        result = move_shape(context, params)

        assert len(result) == 1
        original_coords = TEXT_FEATURE["geometry"]["coordinates"]
        result_coords = result[0]["geometry"]["coordinates"]

        # Verify point moved East
        assert result_coords[0] > original_coords[0]
        assert result_coords[1] == pytest.approx(original_coords[1], abs=0.001)


class TestMoveShapeEdgeCases:
    """Edge case tests for move-shape tool (Phase 6)."""

    def test_zero_distance_noop(self) -> None:
        """Move with zero distance. Verify features returned unchanged."""
        feature = copy.deepcopy(CIRCLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 0}

        result = move_shape(context, params)

        assert len(result) == 1
        assert result[0] == feature

    def test_empty_features_error(self) -> None:
        """Move with empty feature list. Verify ValueError raised."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        params = {"direction": 90, "distance_km": 5}

        with pytest.raises(ValueError, match="No annotation features found"):
            move_shape(context, params)

    def test_non_annotation_skipped(self) -> None:
        """Move with TRACK feature and annotation feature. Verify only annotation returned."""
        track = {
            "type": "Feature",
            "id": "track-001",
            "geometry": {"type": "LineString", "coordinates": [[-1.0, 50.0], [-1.1, 50.1]]},
            "properties": {"kind": "TRACK"},
        }
        annotation = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.MULTI, features=[track, annotation])
        params = {"direction": 90, "distance_km": 5}

        result = move_shape(context, params)

        # Only the annotation should be returned
        assert len(result) == 1
        assert result[0]["id"] == "text-001"

    def test_antimeridian_wrap(self) -> None:
        """Move point East across antimeridian. Verify longitude wraps correctly."""
        feature = {
            "type": "Feature",
            "id": "point-001",
            "geometry": {
                "type": "Point",
                "coordinates": [179.99, 0.0],
            },
            "properties": {
                "kind": "TEXT",
                "text": "Antimeridian Test",
            },
        }
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": 20}

        result = move_shape(context, params)

        assert len(result) == 1
        result_lon = result[0]["geometry"]["coordinates"][0]
        # Longitude should wrap to negative when crossing antimeridian
        assert result_lon < 0

    def test_negative_distance_error(self) -> None:
        """Move with negative distance. Verify ValueError raised."""
        feature = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"direction": 90, "distance_km": -1}

        with pytest.raises(ValueError, match="distance_km must be >= 0"):
            move_shape(context, params)

    def test_default_params(self) -> None:
        """Move without explicit params. Verify defaults used (direction=90, distance_km=5)."""
        feature = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        result = move_shape(context, params)

        assert len(result) == 1
        original_lon = TEXT_FEATURE["geometry"]["coordinates"][0]
        result_lon = result[0]["geometry"]["coordinates"][0]
        # With default direction=90 (East) and distance=5km, longitude should increase
        assert result_lon > original_lon
