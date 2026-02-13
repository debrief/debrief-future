"""Unit tests for generate-reference-points tool."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from debrief_calc.models import ContextType, SelectionContext

# Golden example paths
GOLDEN_DIR = Path(__file__).parent.parent.parent.parent.parent.parent / "shared" / "tools" / "reference" / "generation"


def _load_golden(name: str) -> dict[str, Any]:
    """Load a golden example JSON file."""
    path = GOLDEN_DIR / name
    with open(path) as f:
        return json.load(f)


def _make_context() -> SelectionContext:
    """Create a NONE context for the tool."""
    return SelectionContext(type=ContextType.NONE, features=[])


# ============================================================================
# User Story 1: Grid Pattern
# ============================================================================


class TestGridBasic:
    """Basic grid generation tests (T015)."""

    def test_grid_3x4_returns_12_coordinates(self):
        """A 3x4 grid should produce exactly 12 coordinates."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 4}
        result = generate_reference_points(context, params)

        assert isinstance(result, list)
        assert len(result) == 1

        feature = result[0]
        assert feature["geometry"]["type"] == "MultiPoint"
        coords = feature["geometry"]["coordinates"]
        assert len(coords) == 12

    def test_grid_3x4_correct_positions(self):
        """Verify exact coordinate positions for 3x4 grid."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 4}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]

        # Row 0 (lat=49): [-5,49], [-3,49], [-1,49], [1,49]
        assert coords[0] == [-5.0, 49.0]
        assert coords[1] == [-3.0, 49.0]
        assert coords[2] == [-1.0, 49.0]
        assert coords[3] == [1.0, 49.0]

        # Row 1 (lat=50.5): [-5,50.5], [-3,50.5], [-1,50.5], [1,50.5]
        assert coords[4] == [-5.0, 50.5]
        assert coords[5] == [-3.0, 50.5]
        assert coords[6] == [-1.0, 50.5]
        assert coords[7] == [1.0, 50.5]

        # Row 2 (lat=52): [-5,52], [-3,52], [-1,52], [1,52]
        assert coords[8] == [-5.0, 52.0]
        assert coords[9] == [-3.0, 52.0]
        assert coords[10] == [-1.0, 52.0]
        assert coords[11] == [1.0, 52.0]

    def test_grid_1x1_centre_point(self):
        """A 1x1 grid should produce a single point at the bounding box centre."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 1, "cols": 1}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        assert len(coords) == 1
        assert coords[0] == pytest.approx([-2.0, 50.5])

    def test_grid_5x5_even_spacing(self):
        """A 5x5 grid should have 25 coordinates at even intervals."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [0, 0, 4, 4], "rows": 5, "cols": 5}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        assert len(coords) == 25

        # Check corners
        assert coords[0] == [0.0, 0.0]  # SW
        assert coords[4] == [4.0, 0.0]  # SE
        assert coords[20] == [0.0, 4.0]  # NW
        assert coords[24] == [4.0, 4.0]  # NE

        # Check spacing (step = 1.0 for both lat and lon)
        assert coords[1] == [1.0, 0.0]
        assert coords[5] == [0.0, 1.0]

    def test_grid_feature_properties(self):
        """Verify feature properties are correct."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 4}
        result = generate_reference_points(context, params)

        feature = result[0]
        assert feature["type"] == "Feature"
        assert feature["id"] == "ref-grid"
        props = feature["properties"]
        assert props["kind"] == "POINT"
        assert props["locationType"] == "REFERENCE"
        assert "grid 3x4" in props["name"]
        assert props["style"]["shape"] == "square"
        assert props["style"]["color"] == "#666666"
        assert props["style"]["radius"] == 5

    def test_grid_point_metadata_parallel(self):
        """pointMetadata must be parallel to coordinates array."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 4}
        result = generate_reference_points(context, params)

        feature = result[0]
        coords = feature["geometry"]["coordinates"]
        metadata = feature["properties"]["pointMetadata"]

        assert len(metadata) == len(coords)
        for i, entry in enumerate(metadata):
            assert entry["index"] == i
            assert entry["name"] == f"Ref {i + 1}"


class TestGridEdgeCases:
    """Grid edge case tests (T016)."""

    def test_zero_area_bounds_same_lon(self):
        """Zero-area bounds (west==east) should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [0, 0, 0, 1], "rows": 2, "cols": 2}
        with pytest.raises(ValueError, match="positive area"):
            generate_reference_points(context, params)

    def test_zero_area_bounds_same_lat(self):
        """Zero-area bounds (south==north) should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [0, 0, 1, 0], "rows": 2, "cols": 2}
        with pytest.raises(ValueError, match="must be less than north"):
            generate_reference_points(context, params)

    def test_south_greater_than_north(self):
        """south > north should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [0, 52, 1, 49], "rows": 2, "cols": 2}
        with pytest.raises(ValueError, match="must be less than north"):
            generate_reference_points(context, params)

    def test_negative_rows(self):
        """Negative rows should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": -1, "cols": 4}
        with pytest.raises(ValueError, match="positive integer"):
            generate_reference_points(context, params)

    def test_zero_cols(self):
        """Zero cols should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 0}
        with pytest.raises(ValueError, match="positive integer"):
            generate_reference_points(context, params)

    def test_invalid_pattern(self):
        """Invalid pattern should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "hexagonal", "bounds": [-5, 49, 1, 52]}
        with pytest.raises(ValueError, match="'grid' or 'scatter'"):
            generate_reference_points(context, params)

    def test_grid_matches_golden_example(self):
        """Grid output should match the golden example exactly."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        golden_input = _load_golden("generate-reference-points.grid.input.json")
        golden_output = _load_golden("generate-reference-points.grid.output.json")

        context = _make_context()
        result = generate_reference_points(context, golden_input)

        expected_feature = golden_output["features"][0]
        actual_feature = result[0]

        assert actual_feature["id"] == expected_feature["id"]
        assert actual_feature["geometry"] == expected_feature["geometry"]
        assert actual_feature["properties"]["pointMetadata"] == expected_feature["properties"]["pointMetadata"]


# ============================================================================
# User Story 2: Scatter Pattern
# ============================================================================


class TestScatterBasic:
    """Basic scatter generation tests (T025)."""

    def test_scatter_20_points(self):
        """Scatter with count=20 should produce exactly 20 coordinates."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 20, "seed": 42}
        result = generate_reference_points(context, params)

        assert len(result) == 1
        feature = result[0]
        assert feature["geometry"]["type"] == "MultiPoint"
        coords = feature["geometry"]["coordinates"]
        assert len(coords) == 20

    def test_scatter_seed_reproducibility(self):
        """Same seed should produce identical coordinates."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 20, "seed": 42}
        result1 = generate_reference_points(context, params)
        result2 = generate_reference_points(context, params)

        coords1 = result1[0]["geometry"]["coordinates"]
        coords2 = result2[0]["geometry"]["coordinates"]
        assert coords1 == coords2

    def test_scatter_different_seeds_produce_different_output(self):
        """Different seeds should produce different coordinates."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params1 = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 20, "seed": 1}
        params2 = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 20, "seed": 2}
        result1 = generate_reference_points(context, params1)
        result2 = generate_reference_points(context, params2)

        coords1 = result1[0]["geometry"]["coordinates"]
        coords2 = result2[0]["geometry"]["coordinates"]
        assert coords1 != coords2

    def test_scatter_all_within_bounds(self):
        """All scatter points must be within the bounding box."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 100, "seed": 99}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        for lon, lat in coords:
            assert -5 <= lon <= 1, f"lon {lon} out of bounds"
            assert 49 <= lat <= 52, f"lat {lat} out of bounds"

    def test_scatter_feature_properties(self):
        """Verify scatter feature properties."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 20, "seed": 42}
        result = generate_reference_points(context, params)

        feature = result[0]
        assert feature["id"] == "ref-scatter"
        props = feature["properties"]
        assert props["kind"] == "POINT"
        assert props["locationType"] == "REFERENCE"
        assert "scatter 20" in props["name"]

    def test_scatter_point_metadata_parallel(self):
        """pointMetadata must be parallel to coordinates array."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 10, "seed": 42}
        result = generate_reference_points(context, params)

        feature = result[0]
        coords = feature["geometry"]["coordinates"]
        metadata = feature["properties"]["pointMetadata"]

        assert len(metadata) == len(coords)
        for i, entry in enumerate(metadata):
            assert entry["index"] == i
            assert entry["name"] == f"Ref {i + 1}"


class TestScatterEdgeCases:
    """Scatter edge case tests (T026)."""

    def test_scatter_count_zero(self):
        """count=0 should raise ValueError."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "count": 0, "seed": 42}
        with pytest.raises(ValueError, match="positive integer"):
            generate_reference_points(context, params)

    def test_scatter_missing_count(self):
        """Missing count should use default (25)."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [-5, 49, 1, 52], "seed": 42}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        assert len(coords) == 25

    def test_scatter_antimeridian_crossing(self):
        """Antimeridian crossing (west > east) should wrap longitudes."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "scatter", "bounds": [170, -10, -170, 10], "count": 50, "seed": 42}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        assert len(coords) == 50
        for lon, lat in coords:
            assert -180 <= lon <= 180, f"lon {lon} not normalised"
            assert -10 <= lat <= 10, f"lat {lat} out of bounds"

    def test_scatter_matches_golden_example(self):
        """Scatter output should match the golden example exactly."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        golden_input = _load_golden("generate-reference-points.scatter.input.json")
        golden_output = _load_golden("generate-reference-points.scatter.output.json")

        context = _make_context()
        result = generate_reference_points(context, golden_input)

        expected_feature = golden_output["features"][0]
        actual_feature = result[0]

        assert actual_feature["id"] == expected_feature["id"]

        # Compare coordinates with tolerance
        expected_coords = expected_feature["geometry"]["coordinates"]
        actual_coords = actual_feature["geometry"]["coordinates"]
        assert len(actual_coords) == len(expected_coords)
        for i, (actual, expected) in enumerate(zip(actual_coords, expected_coords)):
            assert actual[0] == pytest.approx(expected[0], abs=1e-6), f"coord {i} lon mismatch"
            assert actual[1] == pytest.approx(expected[1], abs=1e-6), f"coord {i} lat mismatch"


# ============================================================================
# User Story 3: Downstream Compatibility
# ============================================================================


class TestDownstreamCompatibility:
    """Downstream compatibility tests (T035, T036)."""

    def test_output_is_valid_geojson_feature(self):
        """Generated feature must be a valid GeoJSON Feature."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 3, "cols": 4}
        result = generate_reference_points(context, params)

        feature = result[0]
        assert feature["type"] == "Feature"
        assert "id" in feature
        assert "geometry" in feature
        assert "properties" in feature
        assert feature["geometry"]["type"] == "MultiPoint"
        assert isinstance(feature["geometry"]["coordinates"], list)

    def test_point_metadata_extensible(self):
        """pointMetadata entries should be extensible with zone/color fields."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [-5, 49, 1, 52], "rows": 2, "cols": 2}
        result = generate_reference_points(context, params)

        feature = result[0]
        metadata = feature["properties"]["pointMetadata"]

        # Simulate downstream classifier extending metadata
        for entry in metadata:
            entry["zone"] = "inner"
            entry["color"] = "#ff0000"

        # Verify original fields still present
        for i, entry in enumerate(metadata):
            assert entry["index"] == i
            assert "name" in entry
            assert entry["zone"] == "inner"
            assert entry["color"] == "#ff0000"

    def test_grid_antimeridian_crossing(self):
        """Grid with antimeridian crossing should normalise longitudes."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        context = _make_context()
        params = {"pattern": "grid", "bounds": [170, -10, -170, 10], "rows": 3, "cols": 3}
        result = generate_reference_points(context, params)

        coords = result[0]["geometry"]["coordinates"]
        assert len(coords) == 9
        for lon, lat in coords:
            assert -180 <= lon <= 180, f"lon {lon} not normalised"
            assert -10 <= lat <= 10, f"lat {lat} out of bounds"


# ============================================================================
# Cross-Language Parity (T024, T034)
# ============================================================================


class TestCrossLanguageParity:
    """Cross-language parity tests — Python output must match golden examples."""

    def test_grid_parity_with_golden(self):
        """Python grid output must match golden example."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        golden_input = _load_golden("generate-reference-points.grid.input.json")
        golden_output = _load_golden("generate-reference-points.grid.output.json")

        context = _make_context()
        result = generate_reference_points(context, golden_input)

        expected = golden_output["features"][0]
        actual = result[0]

        assert actual["geometry"]["coordinates"] == expected["geometry"]["coordinates"]
        assert actual["properties"]["pointMetadata"] == expected["properties"]["pointMetadata"]

    def test_scatter_parity_with_golden(self):
        """Python scatter output must match golden example (seed=42)."""
        from debrief_calc.tools.reference.generation import generate_reference_points

        golden_input = _load_golden("generate-reference-points.scatter.input.json")
        golden_output = _load_golden("generate-reference-points.scatter.output.json")

        context = _make_context()
        result = generate_reference_points(context, golden_input)

        expected_coords = golden_output["features"][0]["geometry"]["coordinates"]
        actual_coords = result[0]["geometry"]["coordinates"]

        assert len(actual_coords) == len(expected_coords)
        for i, (actual, expected) in enumerate(zip(actual_coords, expected_coords)):
            assert actual[0] == pytest.approx(expected[0], abs=1e-6), f"coord {i} lon"
            assert actual[1] == pytest.approx(expected[1], abs=1e-6), f"coord {i} lat"
