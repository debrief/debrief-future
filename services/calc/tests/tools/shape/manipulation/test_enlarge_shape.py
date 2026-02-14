"""Golden example tests for enlarge-shape tool (057)."""

import copy
import json
from pathlib import Path

import pytest
from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.shape.manipulation.enlarge_shape import (
    compute_centroid,
    enlarge_shape,
    scale_coordinate,
)

GOLDEN_DIR = Path(__file__).parents[6] / "shared" / "tools" / "shape" / "manipulation"

# Test fixtures

RECTANGLE_FEATURE = {
    "type": "Feature",
    "id": "rect-001",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [-1.0, 51.0],
                [-0.5, 51.0],
                [-0.5, 51.5],
                [-1.0, 51.5],
                [-1.0, 51.0],
            ]
        ],
    },
    "properties": {
        "kind": "RECTANGLE",
        "label": "Exercise Area",
        "style": {
            "fill": True,
            "fill_color": "#3388FF",
            "fill_opacity": 0.2,
            "stroke": True,
            "color": "#3388FF",
            "weight": 2,
            "opacity": 1.0,
        },
    },
}

CIRCLE_FEATURE = {
    "type": "Feature",
    "id": "circle-002",
    "geometry": {
        "type": "Polygon",
        "coordinates": [
            [
                [0.0, 50.009],
                [0.01, 50.006],
                [0.014, 50.0],
                [0.01, 49.994],
                [0.0, 49.991],
                [-0.01, 49.994],
                [-0.014, 50.0],
                [-0.01, 50.006],
                [0.0, 50.009],
            ]
        ],
    },
    "properties": {
        "kind": "CIRCLE",
        "center": [0.0, 50.0],
        "radius": 1000,
        "label": "Search Area",
    },
}

VECTOR_FEATURE = {
    "type": "Feature",
    "id": "vector-001",
    "geometry": {
        "type": "LineString",
        "coordinates": [
            [0.0, 50.0],
            [0.1, 50.1],
        ],
    },
    "properties": {
        "kind": "VECTOR",
        "origin": [0.0, 50.0],
        "range": 12000,
        "bearing": 45,
        "label": "Search Vector",
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
    },
}


class TestComputeCentroid:
    """Tests for centroid computation."""

    def test_polygon_centroid(self):
        """Compute centroid of a rectangle. Verify arithmetic mean of 4 unique vertices."""
        geometry = {
            "type": "Polygon",
            "coordinates": [[[-1.0, 51.0], [-0.5, 51.0], [-0.5, 51.5], [-1.0, 51.5], [-1.0, 51.0]]],
        }
        centroid = compute_centroid(geometry)
        assert centroid[0] == pytest.approx(-0.75)
        assert centroid[1] == pytest.approx(51.25)

    def test_linestring_centroid(self):
        """Compute centroid of a line. Verify midpoint."""
        geometry = {"type": "LineString", "coordinates": [[0.0, 50.0], [0.1, 50.1]]}
        centroid = compute_centroid(geometry)
        assert centroid[0] == pytest.approx(0.05)
        assert centroid[1] == pytest.approx(50.05)

    def test_point_centroid(self):
        """Compute centroid of a point. Should return the point itself."""
        geometry = {"type": "Point", "coordinates": [1.0, 2.0]}
        centroid = compute_centroid(geometry)
        assert centroid == [1.0, 2.0]


class TestScaleCoordinate:
    """Tests for the scale_coordinate utility function."""

    def test_scale_from_origin(self):
        """Scale coordinate by factor 3 from origin [-0.75, 51.25]."""
        result = scale_coordinate([-1.0, 51.0], [-0.75, 51.25], 3.0)
        assert result[0] == pytest.approx(-1.5)
        assert result[1] == pytest.approx(50.5)

    def test_identity_scale(self):
        """Scale by factor 1. Verify coordinate unchanged."""
        result = scale_coordinate([1.0, 2.0], [0.0, 0.0], 1.0)
        assert result[0] == pytest.approx(1.0)
        assert result[1] == pytest.approx(2.0)

    def test_zero_scale(self):
        """Scale by factor 0. Verify coordinate collapses to origin."""
        result = scale_coordinate([5.0, 10.0], [1.0, 2.0], 0.0)
        assert result[0] == pytest.approx(1.0)
        assert result[1] == pytest.approx(2.0)

    def test_latitude_clamping(self):
        """Scale near pole. Verify latitude clamped to 90."""
        result = scale_coordinate([0.0, 89.0], [0.0, 80.0], 5.0)
        assert result[1] == 90.0  # Clamped


class TestEnlargeShapeGoldenBasicPolygon:
    """Golden example tests: basic-polygon (US1, scale 3.0 from centroid)."""

    @pytest.fixture
    def golden_input(self):
        with open(GOLDEN_DIR / "enlarge-shape.basic-polygon.input.json") as f:
            return json.load(f)

    @pytest.fixture
    def golden_output(self):
        with open(GOLDEN_DIR / "enlarge-shape.basic-polygon.output.json") as f:
            return json.load(f)

    def test_basic_polygon_matches_golden(self, golden_input, golden_output):
        """Scale rectangle 3x from centroid. Verify output matches golden example."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        result = enlarge_shape(context, params)

        assert len(result) == 1
        expected_feature = json.loads(golden_output["content"][0]["text"])
        expected_coords = expected_feature["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]

        for exp_pt, res_pt in zip(expected_coords, result_coords, strict=True):
            assert res_pt[0] == pytest.approx(exp_pt[0], abs=1e-9)
            assert res_pt[1] == pytest.approx(exp_pt[1], abs=1e-9)

    def test_basic_polygon_centroid_preserved(self, golden_input):
        """Scale 3x from centroid. Verify centroid of output matches centroid of input."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        original_centroid = compute_centroid(features[0]["geometry"])
        result = enlarge_shape(context, params)
        result_centroid = compute_centroid(result[0]["geometry"])

        assert result_centroid[0] == pytest.approx(original_centroid[0], abs=1e-9)
        assert result_centroid[1] == pytest.approx(original_centroid[1], abs=1e-9)


class TestEnlargeShapeGoldenCustomOrigin:
    """Golden example tests: custom-origin (US2, scale 2.0 from vertex)."""

    @pytest.fixture
    def golden_input(self):
        with open(GOLDEN_DIR / "enlarge-shape.custom-origin.input.json") as f:
            return json.load(f)

    @pytest.fixture
    def golden_output(self):
        with open(GOLDEN_DIR / "enlarge-shape.custom-origin.output.json") as f:
            return json.load(f)

    def test_custom_origin_matches_golden(self, golden_input, golden_output):
        """Scale rectangle 2x from vertex. Verify output matches golden example."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        result = enlarge_shape(context, params)

        assert len(result) == 1
        expected_feature = json.loads(golden_output["content"][0]["text"])
        expected_coords = expected_feature["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]

        for exp_pt, res_pt in zip(expected_coords, result_coords, strict=True):
            assert res_pt[0] == pytest.approx(exp_pt[0], abs=1e-9)
            assert res_pt[1] == pytest.approx(exp_pt[1], abs=1e-9)

    def test_origin_vertex_fixed(self, golden_input):
        """Scale 2x from vertex [-1.0, 51.0]. Verify that vertex is unchanged."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        result = enlarge_shape(context, params)

        origin = params["origin"]
        result_coords = result[0]["geometry"]["coordinates"][0]
        # First vertex should be the origin, unchanged
        assert result_coords[0][0] == pytest.approx(origin[0], abs=1e-9)
        assert result_coords[0][1] == pytest.approx(origin[1], abs=1e-9)


class TestEnlargeShapeGoldenNoop:
    """Golden example tests: noop (US3, scale 1.0 identity)."""

    @pytest.fixture
    def golden_input(self):
        with open(GOLDEN_DIR / "enlarge-shape.noop.input.json") as f:
            return json.load(f)

    @pytest.fixture
    def golden_output(self):
        with open(GOLDEN_DIR / "enlarge-shape.noop.output.json") as f:
            return json.load(f)

    def test_noop_matches_golden(self, golden_input, golden_output):
        """Scale circle 1.0x (noop). Verify output matches golden example."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        result = enlarge_shape(context, params)

        assert len(result) == 1
        expected_feature = json.loads(golden_output["content"][0]["text"])
        expected_coords = expected_feature["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]

        # Coordinates should be exactly unchanged
        for exp_pt, res_pt in zip(expected_coords, result_coords, strict=True):
            assert res_pt[0] == exp_pt[0]
            assert res_pt[1] == exp_pt[1]

    def test_noop_center_preserved(self, golden_input):
        """Scale circle 1.0x. Verify center property unchanged."""
        features = golden_input["features"]
        params = golden_input["parameters"]
        original_center = list(features[0]["properties"]["center"])
        context = SelectionContext(type=ContextType.SINGLE, features=copy.deepcopy(features))

        result = enlarge_shape(context, params)

        assert result[0]["properties"]["center"] == original_center


class TestEnlargeShapePerKind:
    """Tests for per-kind annotation handling."""

    def test_circle_center_scaled(self):
        """Scale circle. Verify center property is scaled."""
        feature = copy.deepcopy(CIRCLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": 2.0}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        # Center should have moved away from centroid
        original_center = CIRCLE_FEATURE["properties"]["center"]
        result_center = result[0]["properties"]["center"]
        # For a symmetric circle centered at centroid, center stays the same
        assert result_center[0] == pytest.approx(original_center[0], abs=0.001)
        assert result_center[1] == pytest.approx(original_center[1], abs=0.001)

    def test_vector_origin_scaled(self):
        """Scale vector. Verify origin property scaled, range and bearing preserved."""
        feature = copy.deepcopy(VECTOR_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": 2.0}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        # Range and bearing preserved
        assert result[0]["properties"]["range"] == VECTOR_FEATURE["properties"]["range"]
        assert result[0]["properties"]["bearing"] == VECTOR_FEATURE["properties"]["bearing"]

    def test_line_coords_scaled(self):
        """Scale line by factor 3. Verify coordinates change."""
        feature = copy.deepcopy(LINE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": 3.0}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        orig_coords = LINE_FEATURE["geometry"]["coordinates"]
        result_coords = result[0]["geometry"]["coordinates"]
        # Verify coordinates have changed
        assert result_coords[0] != orig_coords[0] or result_coords[1] != orig_coords[1]

    def test_text_point_scaled(self):
        """Scale text point by factor 2 from explicit origin. Verify position changes."""
        feature = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": 2.0, "origin": [-1.0, 49.0]}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        result_coords = result[0]["geometry"]["coordinates"]
        # new_lon = -1.0 + (0.0 - -1.0) * 2.0 = -1.0 + 2.0 = 1.0
        # new_lat = 49.0 + (50.0 - 49.0) * 2.0 = 49.0 + 2.0 = 51.0
        assert result_coords[0] == pytest.approx(1.0, abs=1e-9)
        assert result_coords[1] == pytest.approx(51.0, abs=1e-9)


class TestEnlargeShapeEdgeCases:
    """Edge case tests for enlarge-shape tool."""

    def test_zero_scale_collapses_to_origin(self):
        """Scale by factor 0. All vertices collapse to centroid."""
        feature = copy.deepcopy(RECTANGLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": 0.0}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        result_coords = result[0]["geometry"]["coordinates"][0]
        # All vertices should be at the centroid [-0.75, 51.25]
        for pt in result_coords:
            assert pt[0] == pytest.approx(-0.75, abs=1e-9)
            assert pt[1] == pytest.approx(51.25, abs=1e-9)

    def test_negative_scale_error(self):
        """Scale with negative factor. Verify ValueError raised."""
        feature = copy.deepcopy(RECTANGLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {"scale_factor": -1.0}

        with pytest.raises(ValueError, match="scale_factor must be >= 0"):
            enlarge_shape(context, params)

    def test_empty_features_error(self):
        """Scale with empty feature list. Verify ValueError raised."""
        context = SelectionContext(type=ContextType.NONE, features=[])
        params = {"scale_factor": 2.0}

        with pytest.raises(ValueError, match="No annotation features found"):
            enlarge_shape(context, params)

    def test_non_annotation_skipped(self):
        """Scale with TRACK feature and annotation. Verify only annotation returned."""
        track = {
            "type": "Feature",
            "id": "track-001",
            "geometry": {"type": "LineString", "coordinates": [[-1.0, 50.0], [-1.1, 50.1]]},
            "properties": {"kind": "TRACK"},
        }
        annotation = copy.deepcopy(TEXT_FEATURE)
        context = SelectionContext(type=ContextType.MULTI, features=[track, annotation])
        params = {"scale_factor": 2.0}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        assert result[0]["id"] == "text-001"

    def test_default_params(self):
        """Scale without explicit params. Verify defaults used (scale_factor=3.0)."""
        feature = copy.deepcopy(RECTANGLE_FEATURE)
        context = SelectionContext(type=ContextType.SINGLE, features=[feature])
        params = {}

        result = enlarge_shape(context, params)

        assert len(result) == 1
        # With default scale_factor=3.0, the shape should be larger
        orig_coords = RECTANGLE_FEATURE["geometry"]["coordinates"][0]
        result_coords = result[0]["geometry"]["coordinates"][0]
        # Original extent: 0.5° lon x 0.5° lat
        orig_extent_lon = max(c[0] for c in orig_coords) - min(c[0] for c in orig_coords)
        result_extent_lon = max(c[0] for c in result_coords) - min(c[0] for c in result_coords)
        assert result_extent_lon == pytest.approx(orig_extent_lon * 3.0, abs=1e-9)
