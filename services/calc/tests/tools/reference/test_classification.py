"""Unit tests for point-in-zone-classifier tool."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any

import pytest
from debrief_calc.models import ContextType, SelectionContext

# Golden example paths
GOLDEN_DIR = (
    Path(__file__).parent.parent.parent.parent.parent.parent
    / "shared"
    / "tools"
    / "reference"
    / "classification"
)


def _load_golden(name: str) -> dict[str, Any]:
    """Load a golden example JSON file."""
    path = GOLDEN_DIR / name
    with open(path) as f:
        return json.load(f)


def _make_ref_feature(
    coordinates: list[list[float]],
    metadata: list[dict[str, Any]] | None = None,
    feature_id: str = "ref-test",
) -> dict[str, Any]:
    """Create a MultiPoint reference feature."""
    if metadata is None:
        metadata = [{"index": i, "name": f"Ref {i + 1}"} for i in range(len(coordinates))]
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": {
            "type": "MultiPoint",
            "coordinates": coordinates,
        },
        "properties": {
            "kind": "POINT",
            "locationType": "REFERENCE",
            "name": "Test Points",
            "style": {"shape": "square", "color": "#666666", "radius": 5},
            "pointMetadata": metadata,
        },
    }


def _make_zone_feature(
    polygons: list[list[list[list[float]]]],
    zones: list[dict[str, Any]] | None = None,
    feature_id: str = "zone-test",
) -> dict[str, Any]:
    """Create a MultiPolygon zone feature."""
    if zones is None:
        zones = [
            {
                "name": "75%",
                "detection_likelihood_pct": 75,
                "buffer_distance_nm": 3.0,
                "style": {"fill_color": "#9C27B0", "color": "#9C27B0"},
            },
            {
                "name": "50%",
                "detection_likelihood_pct": 50,
                "buffer_distance_nm": 6.0,
                "style": {"fill_color": "#F44336", "color": "#F44336"},
            },
            {
                "name": "25%",
                "detection_likelihood_pct": 25,
                "buffer_distance_nm": 12.0,
                "style": {"fill_color": "#FF9800", "color": "#FF9800"},
            },
        ]
    return {
        "type": "Feature",
        "id": feature_id,
        "geometry": {
            "type": "MultiPolygon",
            "coordinates": polygons,
        },
        "properties": {
            "kind": "ZONE",
            "name": "Detection Zones",
            "zones": zones,
        },
    }


# Simple concentric square zones for testing
# Inner zone: -1,-1 to 1,1
# Middle zone: -2,-2 to 2,2
# Outer zone: -3,-3 to 3,3
_INNER_RING = [[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]
_MIDDLE_RING = [[-2, -2], [2, -2], [2, 2], [-2, 2], [-2, -2]]
_OUTER_RING = [[-3, -3], [3, -3], [3, 3], [-3, 3], [-3, -3]]

_SIMPLE_ZONES = [[_INNER_RING], [_MIDDLE_RING], [_OUTER_RING]]


def _make_context(
    ref_feature: dict[str, Any], zone_feature: dict[str, Any]
) -> SelectionContext:
    """Create a MULTI context with ref and zone features."""
    return SelectionContext(
        type=ContextType.MULTI,
        features=[ref_feature, zone_feature],
    )


# ============================================================================
# User Story 1: Classify reference points by buffer zone
# ============================================================================


class TestClassifyBasic:
    """Basic classification tests."""

    def test_point_inside_inner_zone(self):
        """Point at origin should be classified as innermost zone."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        assert len(result) == 1
        classified = result[0]
        md = classified["properties"]["pointMetadata"]
        assert md[0]["zone"] == "75%"
        assert md[0]["color"] == "#9C27B0"

    def test_point_in_middle_zone(self):
        """Point at (1.5, 0) should be in middle zone (outside inner, inside middle)."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[1.5, 0]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "50%"
        assert md[0]["color"] == "#F44336"

    def test_point_in_outer_zone(self):
        """Point at (2.5, 0) should be in outer zone."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[2.5, 0]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "25%"
        assert md[0]["color"] == "#FF9800"

    def test_point_outside_all_zones(self):
        """Point at (10, 10) should be outside all zones."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[10, 10]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "none"
        assert md[0]["color"] == "#666666"

    def test_multiple_points_classified_correctly(self):
        """Multiple points should each be classified independently."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        coords = [
            [0, 0],       # inner
            [1.5, 0],     # middle
            [2.5, 0],     # outer
            [10, 10],     # outside
        ]
        ref = _make_ref_feature(coords)
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "75%"
        assert md[1]["zone"] == "50%"
        assert md[2]["zone"] == "25%"
        assert md[3]["zone"] == "none"

    def test_point_colors_array_parallel(self):
        """pointColors must be parallel to coordinates."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        coords = [[0, 0], [1.5, 0], [10, 10]]
        ref = _make_ref_feature(coords)
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        pc = result[0]["properties"]["pointColors"]
        assert len(pc) == 3
        assert pc[0] == "#9C27B0"
        assert pc[1] == "#F44336"
        assert pc[2] == "#666666"

    def test_innermost_zone_wins(self):
        """Point inside innermost zone must not be assigned to outer zones."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0.5, 0.5]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        # Must be 75% (innermost), not 50% or 25%
        assert md[0]["zone"] == "75%"


# ============================================================================
# User Story 2: Preserve existing point metadata
# ============================================================================


class TestMetadataPreservation:
    """Metadata preservation tests."""

    def test_preserves_index_and_name(self):
        """Existing index and name fields must survive classification."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        metadata = [{"index": 0, "name": "Alpha"}, {"index": 1, "name": "Beta"}]
        ref = _make_ref_feature([[0, 0], [10, 10]], metadata=metadata)
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["index"] == 0
        assert md[0]["name"] == "Alpha"
        assert md[0]["zone"] == "75%"
        assert md[1]["index"] == 1
        assert md[1]["name"] == "Beta"
        assert md[1]["zone"] == "none"

    def test_preserves_custom_fields(self):
        """Custom fields in metadata must survive classification."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        metadata = [{"index": 0, "name": "Ref 1", "custom": "data", "value": 42}]
        ref = _make_ref_feature([[0, 0]], metadata=metadata)
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["custom"] == "data"
        assert md[0]["value"] == 42
        assert "zone" in md[0]
        assert "color" in md[0]

    def test_reclassification_updates_zone_color(self):
        """Re-classification with different zones should update zone/color fields."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        # First classification — point at origin is in inner zone
        ref = _make_ref_feature([[0, 0]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result1 = point_in_zone_classifier(ctx, {})
        assert result1[0]["properties"]["pointMetadata"][0]["zone"] == "75%"

        # Re-classify with a zone that doesn't contain the origin
        far_ring = [[5, 5], [6, 5], [6, 6], [5, 6], [5, 5]]
        far_zones = [[far_ring]]
        far_zone = _make_zone_feature(far_zones, zones=[{
            "name": "remote",
            "detection_likelihood_pct": 90,
            "buffer_distance_nm": 1.0,
            "style": {"fill_color": "#00FF00"},
        }])
        ctx2 = _make_context(result1[0], far_zone)
        result2 = point_in_zone_classifier(ctx2, {})

        md = result2[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "none"
        assert md[0]["color"] == "#666666"

    def test_does_not_mutate_input(self):
        """Input feature must not be mutated in place."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0]])
        original_metadata = copy.deepcopy(ref["properties"]["pointMetadata"])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        point_in_zone_classifier(ctx, {})

        # Original should be unchanged
        assert ref["properties"]["pointMetadata"] == original_metadata
        assert "pointColors" not in ref["properties"]


# ============================================================================
# User Story 3: Determinism and cascade compatibility
# ============================================================================


class TestDeterminism:
    """Determinism and statelessness tests."""

    def test_identical_inputs_produce_identical_output(self):
        """Same inputs must produce identical output."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0], [1.5, 0], [10, 10]])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx1 = _make_context(ref, zone)
        ctx2 = _make_context(ref, zone)
        result1 = point_in_zone_classifier(ctx1, {})
        result2 = point_in_zone_classifier(ctx2, {})

        assert result1 == result2

    def test_geometry_unchanged(self):
        """Output geometry must be identical to input geometry."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        coords = [[0, 0], [1.5, 0], [2.5, 0]]
        ref = _make_ref_feature(coords)
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        assert result[0]["geometry"]["coordinates"] == coords


# ============================================================================
# Edge Cases
# ============================================================================


class TestEdgeCases:
    """Edge case tests."""

    def test_no_ref_feature_raises(self):
        """Missing reference feature should raise ValueError."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = SelectionContext(type=ContextType.MULTI, features=[zone])
        with pytest.raises(ValueError, match="No reference point feature"):
            point_in_zone_classifier(ctx, {})

    def test_no_zone_feature_raises(self):
        """Missing zone feature should raise ValueError."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0]])
        ctx = SelectionContext(type=ContextType.MULTI, features=[ref])
        with pytest.raises(ValueError, match="No zone feature"):
            point_in_zone_classifier(ctx, {})

    def test_non_multipoint_raises(self):
        """Non-MultiPoint reference feature should raise ValueError."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = {
            "type": "Feature",
            "id": "bad",
            "geometry": {"type": "Point", "coordinates": [0, 0]},
            "properties": {"kind": "POINT", "locationType": "REFERENCE", "pointMetadata": []},
        }
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        with pytest.raises(ValueError, match="MultiPoint"):
            point_in_zone_classifier(ctx, {})

    def test_non_multipolygon_raises(self):
        """Non-MultiPolygon zone feature should raise ValueError."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0]])
        zone = {
            "type": "Feature",
            "id": "bad-zone",
            "geometry": {"type": "Polygon", "coordinates": [_INNER_RING]},
            "properties": {"kind": "ZONE", "zones": []},
        }
        ctx = _make_context(ref, zone)
        with pytest.raises(ValueError, match="MultiPolygon"):
            point_in_zone_classifier(ctx, {})

    def test_metadata_length_mismatch_raises(self):
        """Mismatched pointMetadata/coordinates lengths should raise ValueError."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0], [1, 1]], metadata=[{"index": 0, "name": "Ref 1"}])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        with pytest.raises(ValueError, match="pointMetadata length"):
            point_in_zone_classifier(ctx, {})

    def test_empty_coordinates(self):
        """Empty coordinates should return feature with empty metadata and colors."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([], metadata=[])
        zone = _make_zone_feature(_SIMPLE_ZONES)
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        classified = result[0]
        assert classified["properties"]["pointMetadata"] == []
        assert classified["properties"]["pointColors"] == []

    def test_empty_zones_array(self):
        """Empty zones metadata should classify all points as 'none'."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        ref = _make_ref_feature([[0, 0]])
        zone = _make_zone_feature(_SIMPLE_ZONES, zones=[])
        ctx = _make_context(ref, zone)
        result = point_in_zone_classifier(ctx, {})

        md = result[0]["properties"]["pointMetadata"]
        assert md[0]["zone"] == "none"


# ============================================================================
# Golden Example Validation
# ============================================================================


class TestGoldenExamples:
    """Golden example validation tests."""

    def test_basic_golden_example(self):
        """Python output must match the basic golden example."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        golden_input = _load_golden("point-in-zone-classifier.basic.input.json")
        golden_output = _load_golden("point-in-zone-classifier.basic.output.json")

        ctx = SelectionContext(
            type=ContextType.MULTI,
            features=golden_input["features"],
        )
        result = point_in_zone_classifier(ctx, {})

        # Parse expected feature from the golden output text
        expected_text = golden_output["content"][0]["text"]
        expected_feature = json.loads(expected_text)

        actual = result[0]
        assert actual["id"] == expected_feature["id"]
        assert actual["geometry"] == expected_feature["geometry"]

        # Verify per-point classification matches
        actual_md = actual["properties"]["pointMetadata"]
        expected_md = expected_feature["properties"]["pointMetadata"]
        assert len(actual_md) == len(expected_md)
        for i, (a, e) in enumerate(zip(actual_md, expected_md, strict=True)):
            assert a["zone"] == e["zone"], f"Point {i} zone mismatch: {a['zone']} != {e['zone']}"
            assert a["color"] == e["color"], f"Point {i} color mismatch"

        # Verify pointColors array
        assert actual["properties"]["pointColors"] == expected_feature["properties"]["pointColors"]

    def test_all_outside_golden_example(self):
        """Python output must match the all-outside golden example."""
        from debrief_calc.tools.reference.classification import point_in_zone_classifier

        golden_input = _load_golden("point-in-zone-classifier.all-outside.input.json")
        golden_output = _load_golden("point-in-zone-classifier.all-outside.output.json")

        ctx = SelectionContext(
            type=ContextType.MULTI,
            features=golden_input["features"],
        )
        result = point_in_zone_classifier(ctx, {})

        expected_text = golden_output["content"][0]["text"]
        expected_feature = json.loads(expected_text)

        actual = result[0]
        actual_md = actual["properties"]["pointMetadata"]
        expected_md = expected_feature["properties"]["pointMetadata"]
        for i, (a, _e) in enumerate(zip(actual_md, expected_md, strict=True)):
            assert a["zone"] == "none", f"Point {i} should be 'none'"
            assert a["color"] == "#666666", f"Point {i} should be grey"

        assert actual["properties"]["pointColors"] == ["#666666"] * len(actual_md)
