"""Unit tests for area-summary tool."""

import pytest
import json
from pathlib import Path

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.area_summary import area_summary, _point_in_bbox, _calculate_bbox_area_sq_nm


@pytest.fixture
def zone_fixture():
    """Load the zone region fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "zone-region.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def region_context():
    """Create a region context with bounds."""
    return SelectionContext(
        type=ContextType.REGION,
        bounds=[-5.0, 49.5, -3.0, 51.0]
    )


class TestPointInBbox:
    """Tests for point in bounding box check."""

    def test_point_inside(self):
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-4.0, 50.0, bbox) is True

    def test_point_outside_east(self):
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-2.0, 50.0, bbox) is False

    def test_point_outside_north(self):
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-4.0, 52.0, bbox) is False

    def test_point_on_boundary(self):
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-5.0, 50.0, bbox) is True  # On west edge
        assert _point_in_bbox(-3.0, 50.0, bbox) is True  # On east edge


class TestCalculateBboxArea:
    """Tests for bounding box area calculation."""

    def test_area_is_positive(self):
        bbox = [-5.0, 49.0, -3.0, 51.0]
        area = _calculate_bbox_area_sq_nm(bbox)
        assert area > 0

    def test_known_area(self):
        # 2 degrees longitude by 2 degrees latitude at ~50N
        # At 50N, 1 degree longitude ~ 38.5 nm, 1 degree latitude = 60 nm
        # Area ~ 2*38.5 * 2*60 = ~9240 sq nm
        bbox = [-1.0, 49.0, 1.0, 51.0]
        area = _calculate_bbox_area_sq_nm(bbox)
        assert 8000 < area < 10000


class TestAreaSummaryTool:
    """Tests for the area-summary tool handler."""

    def test_returns_single_feature(self, region_context):
        results = area_summary(region_context, {})

        assert isinstance(results, list)
        assert len(results) == 1

    def test_result_is_polygon(self, region_context):
        results = area_summary(region_context, {})
        geom = results[0]["geometry"]

        assert geom["type"] == "Polygon"
        # Should be 5 coordinates (closed ring)
        assert len(geom["coordinates"][0]) == 5

    def test_result_has_statistics(self, region_context):
        results = area_summary(region_context, {})
        stats = results[0]["properties"]["statistics"]

        assert "area_sq_nm" in stats
        assert "width_nm" in stats
        assert "height_nm" in stats
        assert "centroid" in stats

    def test_result_has_bounds(self, region_context):
        results = area_summary(region_context, {})
        props = results[0]["properties"]

        assert "bounds" in props
        assert props["bounds"] == [-5.0, 49.5, -3.0, 51.0]

    def test_centroid_is_center_of_bbox(self, region_context):
        results = area_summary(region_context, {})
        centroid = results[0]["properties"]["statistics"]["centroid"]

        # Centroid of [-5.0, 49.5, -3.0, 51.0] is [-4.0, 50.25]
        assert centroid[0] == -4.0
        assert centroid[1] == 50.25

    def test_dimensions_are_positive(self, region_context):
        results = area_summary(region_context, {})
        stats = results[0]["properties"]["statistics"]

        assert stats["width_nm"] > 0
        assert stats["height_nm"] > 0
        assert stats["area_sq_nm"] > 0


class TestAreaSummaryEdgeCases:
    """Edge case tests for area-summary tool."""

    def test_invalid_bounds_returns_empty(self):
        context = SelectionContext(type=ContextType.REGION, bounds=[1, 2])  # Invalid
        # Note: This will fail validation before reaching the tool
        # We test the tool directly
        from debrief_calc.tools.area_summary import area_summary as fn
        from unittest.mock import MagicMock

        mock_context = MagicMock()
        mock_context.bounds = None

        results = fn(mock_context, {})
        assert results == []

    def test_small_area(self):
        # Very small bounding box
        context = SelectionContext(
            type=ContextType.REGION,
            bounds=[-4.01, 50.0, -4.0, 50.01]
        )
        results = area_summary(context, {})

        assert len(results) == 1
        stats = results[0]["properties"]["statistics"]
        assert stats["area_sq_nm"] > 0  # Still positive
        assert stats["area_sq_nm"] < 1  # But very small
