"""Unit tests for area-summary tool."""

import json
from pathlib import Path
from typing import Any

import pytest

from debrief_calc.models import ContextType, SelectionContext
from debrief_calc.tools.area_summary import _calculate_bbox_area_sq_nm, _point_in_bbox, area_summary


@pytest.fixture
def zone_fixture() -> dict[str, Any]:
    """Load the zone region fixture."""
    fixture_path = Path(__file__).parent.parent / "fixtures" / "zone-region.geojson"
    with open(fixture_path) as f:
        return json.load(f)


@pytest.fixture
def region_context() -> SelectionContext:
    """Create a region context with bounds."""
    return SelectionContext(type=ContextType.REGION, bounds=[-5.0, 49.5, -3.0, 51.0])


class TestPointInBbox:
    """Tests for point in bounding box check."""

    def test_point_inside(self) -> None:
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-4.0, 50.0, bbox) is True

    def test_point_outside_east(self) -> None:
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-2.0, 50.0, bbox) is False

    def test_point_outside_north(self) -> None:
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-4.0, 52.0, bbox) is False

    def test_point_on_boundary(self) -> None:
        bbox = [-5.0, 49.0, -3.0, 51.0]
        assert _point_in_bbox(-5.0, 50.0, bbox) is True  # On west edge
        assert _point_in_bbox(-3.0, 50.0, bbox) is True  # On east edge


class TestCalculateBboxArea:
    """Tests for bounding box area calculation."""

    def test_area_is_positive(self) -> None:
        bbox = [-5.0, 49.0, -3.0, 51.0]
        area = _calculate_bbox_area_sq_nm(bbox)
        assert area > 0

    def test_known_area(self) -> None:
        # 2 degrees longitude by 2 degrees latitude at ~50N
        # At 50N, 1 degree longitude ~ 38.5 nm, 1 degree latitude = 60 nm
        # Area ~ 2*38.5 * 2*60 = ~9240 sq nm
        bbox = [-1.0, 49.0, 1.0, 51.0]
        area = _calculate_bbox_area_sq_nm(bbox)
        assert 8000 < area < 10000


class TestAreaSummaryTool:
    """Tests for the area-summary tool handler."""

    def test_returns_single_feature(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})

        assert isinstance(results, list)
        assert len(results) == 1

    def test_result_is_polygon(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})
        geom = results[0]["geometry"]

        assert geom["type"] == "Polygon"
        # Should be 5 coordinates (closed ring)
        assert len(geom["coordinates"][0]) == 5

    def test_result_has_statistics(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})
        stats = results[0]["properties"]["statistics"]

        assert "area_sq_nm" in stats
        assert "width_nm" in stats
        assert "height_nm" in stats
        assert "centroid" in stats

    def test_result_has_bounds(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})
        props = results[0]["properties"]

        assert "bounds" in props
        assert props["bounds"] == [-5.0, 49.5, -3.0, 51.0]

    def test_centroid_is_center_of_bbox(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})
        centroid = results[0]["properties"]["statistics"]["centroid"]

        # Centroid of [-5.0, 49.5, -3.0, 51.0] is [-4.0, 50.25]
        assert centroid[0] == -4.0
        assert centroid[1] == 50.25

    def test_dimensions_are_positive(self, region_context: SelectionContext) -> None:
        results = area_summary(region_context, {})
        stats = results[0]["properties"]["statistics"]

        assert stats["width_nm"] > 0
        assert stats["height_nm"] > 0
        assert stats["area_sq_nm"] > 0


class TestAreaSummaryEdgeCases:
    """Edge case tests for area-summary tool."""

    def test_invalid_bounds_and_no_features_returns_empty(self) -> None:
        # Test that tool handles None bounds + no features gracefully
        from unittest.mock import MagicMock

        from debrief_calc.tools.area_summary import area_summary as fn

        mock_context = MagicMock()
        mock_context.bounds = None
        mock_context.features = []

        results = fn(mock_context, {})
        assert results == []

    def test_small_area(self) -> None:
        # Very small bounding box
        context = SelectionContext(type=ContextType.REGION, bounds=[-4.01, 50.0, -4.0, 50.01])
        results = area_summary(context, {})

        assert len(results) == 1
        stats = results[0]["properties"]["statistics"]
        assert stats["area_sq_nm"] > 0  # Still positive
        assert stats["area_sq_nm"] < 1  # But very small


class TestAreaSummaryFromFeatures:
    """Tests for extracting bounds from feature coordinates (#107)."""

    def test_multi_context_with_tracks(self) -> None:
        """MULTI context extracts bounds from feature coordinates."""
        features = [
            {
                "type": "Feature",
                "id": "t1",
                "properties": {"kind": "TRACK"},
                "geometry": {"type": "LineString", "coordinates": [[-5.0, 49.5], [-3.0, 51.0]]},
            }
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        results = area_summary(context, {})

        assert len(results) == 1
        assert results[0]["properties"]["bounds"] == [-5.0, 49.5, -3.0, 51.0]

    def test_multi_context_with_points(self) -> None:
        features = [
            {
                "type": "Feature",
                "id": "p1",
                "properties": {"kind": "POINT"},
                "geometry": {"type": "Point", "coordinates": [-4.0, 50.0]},
            },
            {
                "type": "Feature",
                "id": "p2",
                "properties": {"kind": "POINT"},
                "geometry": {"type": "Point", "coordinates": [-3.0, 51.0]},
            },
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        results = area_summary(context, {})

        assert len(results) == 1
        stats = results[0]["properties"]["statistics"]
        assert stats["area_sq_nm"] > 0

    def test_multi_context_with_zone_polygon(self) -> None:
        """MULTI context accepts ZONE-kinded polygons (#107 alignment with TS)."""
        features = [
            {
                "type": "Feature",
                "id": "zone-1",
                "properties": {"kind": "ZONE"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [[-5.0, 49.5], [-3.0, 49.5], [-3.0, 51.0], [-5.0, 51.0], [-5.0, 49.5]]
                    ],
                },
            }
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        results = area_summary(context, {})

        assert len(results) == 1
        assert results[0]["properties"]["bounds"] == [-5.0, 49.5, -3.0, 51.0]


class TestAreaSummaryInputContract:
    """
    Regression tests for the input-contract alignment with the TypeScript
    implementation (apps/web-shell/src/tools/region/analysis/areaSummary.ts).
    See #107 (F-2.6).
    """

    def test_input_kinds_match_typescript(self) -> None:
        """
        Python ``input_kinds`` and the TS ``selectionRequirements`` must list
        the same set of canonical FeatureKindEnum values. Drift here is the
        root cause of #107.
        """
        from debrief_calc.tools.area_summary import area_summary as fn

        tool_meta = fn.tool  # type: ignore[attr-defined]
        assert set(tool_meta.input_kinds) == {
            "TRACK", "POINT", "RECTANGLE", "CIRCLE", "ZONE", "POLY",
        }

    def test_bounds_take_precedence_over_features(self) -> None:
        """
        When ``context.bounds`` is supplied, it is used regardless of any
        coordinates present in ``context.features`` — mirroring the TS
        ``params.bounds`` precedence rule.
        """
        # Bounds and features deliberately disagree.
        features = [
            {
                "type": "Feature",
                "id": "noise",
                "properties": {"kind": "POINT"},
                "geometry": {"type": "Point", "coordinates": [0.0, 0.0]},
            }
        ]
        context = SelectionContext(
            type=ContextType.REGION,
            bounds=[-5.0, 49.5, -3.0, 51.0],
            features=features,
        )
        results = area_summary(context, {})

        assert len(results) == 1
        assert results[0]["properties"]["bounds"] == [-5.0, 49.5, -3.0, 51.0]

    def test_no_bounds_and_unusable_features_returns_empty(self) -> None:
        """
        Aligns with the TS implementation: when neither bounds nor feature
        coordinates yield a valid bbox, return ``[]`` rather than raising.
        """
        features = [
            # Feature has no usable geometry.
            {
                "type": "Feature",
                "id": "narr-1",
                "properties": {"kind": "NARRATIVE"},
            }
        ]
        context = SelectionContext(type=ContextType.MULTI, features=features)
        results = area_summary(context, {})
        assert results == []

    def test_centroid_rounded_to_four_decimals(self) -> None:
        """
        Centroid coordinates are rounded to 4 decimals — matches the TS
        implementation post-#107 so callers comparing the two outputs see
        identical values.
        """
        # Bounds chosen so the midpoints have many decimal places.
        context = SelectionContext(
            type=ContextType.REGION, bounds=[-5.12345, 49.11111, -3.98765, 51.22222]
        )
        results = area_summary(context, {})
        centroid = results[0]["properties"]["statistics"]["centroid"]
        assert centroid == [-4.5556, 50.1667]
